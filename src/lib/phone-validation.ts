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
        normalizedPhone,
        normalizedCountryCode,
        message: "Enter a valid Rwandan phone number, for example 0781234567.",
      };
    }

    return { isValid: true, normalizedPhone, normalizedCountryCode };
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