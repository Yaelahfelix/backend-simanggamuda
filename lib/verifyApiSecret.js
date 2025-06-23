export function verifyApiSecret(headers) {
  const secret = headers["x-api-secret"];
  return secret === "ProboMobile2025";
}
