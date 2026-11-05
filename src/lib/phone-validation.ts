export type PhoneValidationResult = {
  isValid: boolean;
  normalizedPhone: string;
  normalizedCountryCode: string;
  message?: string;
};

export const normalizeCountryCode = (countryCode?: string | null): string => {
  const digits = String(countryCode ?? "")
    .trim()
    .replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "+250";
};

export const normalizePhoneDigits = (phone?: string | null): string =>
  String(phone ?? "").trim().replace(/[^\d]/g, "");

export const isRwandaCountryCode = (countryCode?: string | null): boolean =>
  normalizeCountryCode(countryCode) === "+250";

/** Local number with the trunk 0 removed, plus E.164 (+2507XXXXXXXX). */
export function normalizeStoredPhone(
  phone?: string | null,
  countryCode?: string | null,
): { phone: string; countryCode: string; e164: string } {
  const code = normalizeCountryCode(countryCode);
  let digits = normalizePhoneDigits(phone);
  const codeDigits = code.replace(/\D/g, "");
  if (codeDigits && digits.startsWith(codeDigits) && digits.length > codeDigits.length + 5) {
    digits = digits.slice(codeDigits.length);
  }
  if (code === "+250" && digits.startsWith("0")) digits = digits.slice(1);
  return { phone: digits, countryCode: code, e164: digits ? `${code}${digits}` : "" };
}

export function formatPhoneDisplay(
  countryCode?: string | null,
  phone?: string | null,
): string {
  return normalizeStoredPhone(phone, countryCode).e164;
}

export function validatePhoneForCountry(
  phone: string | null | undefined,
  countryCode: string | null | undefined,
): PhoneValidationResult {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const normalizedPhone = normalizePhoneDigits(phone);

  if (!normalizedPhone) {
    return {
      isValid: false,
      normalizedPhone,
      normalizedCountryCode,
      message: "Phone number is required.",
    };
  }

  if (normalizedCountryCode === "+250") {
    const localPhone = normalizedPhone.startsWith("250")
      ? normalizedPhone.slice(3)
      : normalizedPhone;
    const withoutLeadingZero = localPhone.startsWith("0")
      ? localPhone.slice(1)
      : localPhone;

    if (!/^7[2389]\d{7}$/.test(withoutLeadingZero)) {
      return {
        isValid: false,
        normalizedPhone: withoutLeadingZero,
        normalizedCountryCode,
        message: "Enter a valid Rwandan phone number, for example 0781234567.",
      };
    }

    return {
      isValid: true,
      normalizedPhone: withoutLeadingZero,
      normalizedCountryCode,
    };
  }

  if (!/^\d{6,15}$/.test(normalizedPhone)) {
    return {
      isValid: false,
      normalizedPhone,
      normalizedCountryCode,
      message: "Enter a valid phone number for the selected country code.",
    };
  }

  return { isValid: true, normalizedPhone, normalizedCountryCode };
}