import db from "../lib/db";
import { verifyApiSecret } from "../lib/verifyApiSecret";

export async function getUserBySession() {
  const sessionId = new TextEncoder().encode(token);
  const sessionHash = Buffer.from(sha256(sessionId)).toString("hex");
  console.log(sessionHash);
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
}

export const middleware = async (req, res, next) => {
  if (!verifyApiSecret(req.headers)) {
    return res.status(403).json({ message: "Forbidden: Invalid API Secret" });
  }

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Token is missing" });
  }

  const user = await getUserBySession(token);

  if (!user) {
    return res.status(401).json({ message: "Invalid or expire token" });
  }

  req.user = user;
  next();
};
