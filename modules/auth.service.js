import bcrypt from "bcryptjs";
import validator from "validator";
import crypto from "crypto";
import db from "../lib/db.js";

const AuthService = {
  async getUserBySession(token) {
    const sessionId = new TextEncoder().encode(token);
    const sessionHash = Buffer.from(sha256(sessionId)).toString("hex");
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.nama, u.image, u.alamat, u.password, u.nomor_telepon
     FROM session_user s
     JOIN web_public_user u ON u.id = s.userid
     WHERE s.id = ? AND s.expires_at > NOW()`,
      [sessionHash]
    );

    if (!rows || rows.length === 0) return null;

    const data = rows[0];
    return {
      id: data.id,
      email: data.email,
      nama: data.nama,
      image: data.image,
      alamat: data.alamat,
      password: data.password,
      nomor_telepon: data.nomor_telepon,
    };
  },
};

export default AuthService;
