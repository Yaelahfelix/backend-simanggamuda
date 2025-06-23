export function verifyApiSecret(headers) {
  const secret = headers.get("x-api-secret");
  return secret === "ProboMobile2025";
}
