// src/types/irembopay.d.ts

export interface IremboPayLocale { EN: string; FR: string }
export interface IremboPayStatic {
  locale: IremboPayLocale;
  initiate: (options: {
    publicKey: string;
    invoiceNumber: string;
    locale: string;
    callback: (err: IremboPayError | null) => void;
  }) => void;
  closeModal?: () => void;
}
export interface IremboPayError {
  message?: string;
  errors?: Array<{ code: string; detail: string }>;
}

declare global {
  interface Window {
    IremboPay: IremboPayStatic;
  }
}
