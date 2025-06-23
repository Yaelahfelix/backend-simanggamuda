import db from "../../lib/db";
import "dotenv/config";
import crypto from "crypto";

const PaymentService = {
  generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();

    return `INV-${year}${month}${day}-${randomPart}`;
  },
  toISOWithOffset(hoursOffset = 7) {
    const date = new Date(Date.now() + 1 * 60 * 60 * 1000);
    const offsetDate = new Date(date.getTime() + hoursOffset * 60 * 60 * 1000);
    const isoString = offsetDate.toISOString().split(".")[0];
    return isoString.replace("T", "T") + `+0${hoursOffset}:00`;
  },

  async getTagihan(no_pelanggan, tglSkrg) {
    try {
      const [tagihanRes] = await db.query("CALL infotag_desk(?,?)", [
        no_pelanggan,
        tglSkrg,
      ]);
      const tagihanBlmLunas = tagihanRes[0].map((tagihan) => {
        return {
          id: tagihan.id,
          no_pelanggan: tagihan.no_pelanggan,
          periode: tagihan.periode_rek,
          total: tagihan.totalrek,
          denda1: tagihan.denda1,
          denda2: tagihan.denda2,
          materai: tagihan.materai,
          // dendatunggakan: tagihan.dendatunggakan,
        };
      });
      const totalTagihan = tagihanBlmLunas.reduce(
        (sum, tagihan) => sum + Number(tagihan.total),
        0
      );
      return { tagihanBlmLunas, totalTagihan };
    } catch (err) {
      console.error("Error get tagihan:", err);
      const error = new Error("Error get tagihan:", err);
      error.statusCode = 500;
      throw error;
    }
  },

  async createTransaction(
    data,
    user_id,
    no_pelanggan,
    amount,
    timestamp,
    tagihanBlmLunas,
    expired_at
  ) {
    try {
      const insertQuery = `
  INSERT INTO payment_transaction (
    contract_id,
    no_invoice,
    no_pelanggan,
    detail_tagihan_array,
    total_biaya,
    payment_type,
    bank_name,
    transaction_status,
    transaction_time,
    settlement_time,
    is_double,
    expired_at,
    user_id,
    qris_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

      const insertValues = [
        data.additionalInfo.contractId,
        data.partnerReferenceNo,
        no_pelanggan,
        JSON.stringify(tagihanBlmLunas),
        amount,
        "qris",
        null, // bank_name
        "pending",
        timestamp,
        null, // settlement_time
        0, // is_double
        expired_at,
        user_id,
        data.qrUrl,
      ];

      await db.query(insertQuery, insertValues);
    } catch (dbError) {
      console.error("Error inserting transaction data:", dbError);
      const error = new Error("ERROR_CREATE_PAYMENT:", dbError);
      error.statusCode = 500;
      throw error;
    }
  },

  getAdminCost(
    admin_cost_type,
    costlimit_qris_value,
    admin_cost_value,
    totalTagihan
  ) {
    try {
      if (admin_cost_type === "percentage") {
        const cost = Math.round(totalTagihan * costlimit_qris_value);
        console.log(costlimit_qris_value);
        if (cost < 2500) {
          return 2500;
        } else {
          return cost + Number(costlimit_qris_value);
        }
      } else if (admin_cost_type === "fixed") {
        return Number(admin_cost_value);
      } else {
        const error = new Error(
          "ERROR Getadmincost: admin cost type is invalid",
          dbError
        );
        error.statusCode = 409;
        throw error;
      }
    } catch (err) {
      console.error("Error get admin cost:", error);
      const error = new Error("ERROR Getadmincost:", err.message, dbError);
      error.statusCode = 500;
      throw error;
    }
  },

  async generateQRISPayment(amount) {
    const invoice = this.generateInvoiceNumber();
    const partnerId = process.env.WINPAY_PARTNER_ID;
    const externalId = invoice;
    const channelId = "QRIS";

    const base64Key = process.env.BASE64_PRIVATE_KEY;

    const privateKey = Buffer.from(base64Key, "base64");

    if (!partnerId || !externalId || !channelId) {
      const error = new Error("Missing Env variables");
      error.statusCode = 500;
      throw error;
    }

    const url = process.env.WINPAY_QRIS_URL;

    const expired_at = this.toISOWithOffset(7);
    const body = {
      partnerReferenceNo: invoice,
      amount: { value: amount, currency: "IDR" },
      validityPeriod: expired_at,
      additionalInfo: { isStatic: false },
    };

    const minifiedPayload = JSON.stringify(body, null, 0);
    const bodyHash = crypto
      .createHash("sha256")
      .update(minifiedPayload)
      .digest("hex")
      .toLowerCase();

    const timestamp = new Date().toISOString();
    const endpointPath = "/v1.0/qr/qr-mpm-generate";
    const stringToSign = ["POST", endpointPath, bodyHash, timestamp].join(":");

    console.log("Request body:", JSON.stringify(body, null, 2));
    console.log("Minified payload:", minifiedPayload);
    console.log("Body hash:", bodyHash);
    console.log("Timestamp:", timestamp);
    console.log("String to sign:", stringToSign);
    let signature;
    try {
      const signer = crypto.createSign("RSA-SHA256");
      signer.update(stringToSign);
      signature = signer.sign(privateKey, "base64");

      console.log("Generated signature:", signature);
    } catch (signError) {
      console.error("Error creating signature:", signError);
      const error = new Error(
        "ERROR GENERATE QRIS - Signature Error:",
        signError
      );
      error.statusCode = 500;
      throw error;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-TIMESTAMP": timestamp,
        "X-PARTNER-ID": partnerId,
        "X-EXTERNAL-ID": externalId,
        "CHANNEL-ID": channelId,
        "X-SIGNATURE": signature,
      },
      body: minifiedPayload,
    });

    const data = await response.json();

    return {
      data,
      timestamp,
      expired_at,
    };
  },
};

export default PaymentService;
