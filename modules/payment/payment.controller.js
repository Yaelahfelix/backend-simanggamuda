import { format } from "date-fns";
import PaymentService from "./payment.service.js";

const PaymentController = {
  createPaymentQRIS: async (req, res) => {
    try {
      const user = req.user;
      const body = req.body;
      console.log(body);
      const {
        amount,
        no_pelanggan,
        admin_cost_value,
        admin_cost_type,
        costlimit_qris_value,
      } = body;
      const tglSkrg = format(new Date(), "yyyy-MM-dd");
      const tagihan = await PaymentService.getTagihan(no_pelanggan, tglSkrg);
      const admin_cost = PaymentService.getAdminCost(
        admin_cost_type,
        costlimit_qris_value,
        admin_cost_value,
        tagihan.totalTagihan
      );

      if (tagihan.totalTagihan + admin_cost !== amount) {
        console.log("total tagihan:", tagihan.totalTagihan);
        console.log("admin:", admin_cost);
        console.log("tagihan dari client:", amount);
        return res.status(409).json({ message: "Total tagihan tidak valid" });
      }

      const qris = await PaymentService.generateQRISPayment(amount);

      await PaymentService.createTransaction(
        qris.data,
        user.id,
        no_pelanggan,
        amount,
        qris.timestamp,
        tagihan,
        qris.expired_at
      );

      res.status(200).json({ data: qris.data });
    } catch (error) {
      console.log(error);
      const statusCode = error.statusCode || 500;
      const message = error.statusCode ? error.message : "Server error";
      res.status(statusCode).json({ message });
    }
  },
};

export default PaymentController;
