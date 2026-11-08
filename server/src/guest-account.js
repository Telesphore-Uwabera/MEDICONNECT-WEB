const RESERVED_DOMAIN = "@mediconnect.local";

/**
 * The API is the only writer of this domain. POST /auth/guest mints
 * guest-<digits>@mediconnect.local. Register, OTP signup, guest convert,
 * settings, admin profile save, and instant-request email fields reject it.
 * A matching string is therefore server-minted only while those writes stay closed.
 */
export function isReservedAccountEmail(email) {
  return String(email || "").trim().toLowerCase().endsWith(RESERVED_DOMAIN);
}

/** False for every reserved address, including a forged guest-<digits> pattern. */
export function clientMayClaimEmail(email) {
  if (email == null || String(email).trim() === "") return true;
  return !isReservedAccountEmail(email);
}

export function isServerGuestAccount(email) {
  return /^guest-\d+@mediconnect\.local$/i.test(String(email || "").trim());
}
