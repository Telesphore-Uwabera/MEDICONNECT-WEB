// components/PaymentPanel.tsx
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  ShieldCheck,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

// ─── IremboPay window type (same as ConnectDialog) ───────────────────────────

interface IremboPayLocale {
  EN: string;
  FR: string;
}

interface IremboPayStatic {
  locale: IremboPayLocale;
  initiate: (options: {
    publicKey: string;
    invoiceNumber: string;
    locale: string;
    callback: (err: Error | null) => void;
  }) => void;
  closeModal?: () => void;
}

declare global {
  interface Window {
    IremboPay: IremboPayStatic;
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentInfo {
  invoice_number: string;
  public_key: string;
  amount: number;
  currency: string;
  payment_uuid: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    code: string;
    detail: string;
  }>;
}

interface PaymentPanelProps {
  title?: string;
  description?: string;
  paymentInfo: PaymentInfo;
  onPaymentConfirmed: () => void;
  onCancel?: () => void;
  cancelLabel?: string;

  /**
   * Called to refresh/get a new invoice when current one is expired.
   * Parent should re-fetch (e.g. re-call submit/download) and update the
   * `paymentInfo` prop it passes down. Return value is ignored.
   */
  onRefreshInvoice?: () => void | Promise<unknown>;
  isRefreshingInvoice?: boolean;

  /**
   * Called right before opening the IremboPay modal to get fresh payment
   * credentials from your backend. This lets the parent re-validate/refresh
   * an invoice that may have expired since it was first fetched, so the
   * widget never opens with a stale invoice.
   * Should return { public_key, invoice_number } from your backend.
   */
  onPayInitiate?: () => Promise<{ public_key: string; invoice_number: string }>;

  /**
   * Called after IremboPay modal closes successfully to verify payment.
   * Should return true when payment is confirmed, false otherwise.
   */
  onVerifyPayment?: (invoiceNumber: string) => Promise<boolean>;
}

// ─── Helper: Parse API error to check if invoice expired ───────────────────────

function isInvoiceExpiredError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const apiErr = err as ApiError;
    if (apiErr.errors) {
      return apiErr.errors.some(
        (e) => e.code === "BAD_INVOICES_PAYMENT_EXPIRED"
      );
    }
    // Also check message string as fallback
    if (apiErr.message?.includes("expired")) return true;
  }
  if (err instanceof Error && err.message.includes("expired")) return true;
  return false;
}

function getErrorMessage(err: unknown, t: TFunction): string {
  if (err && typeof err === "object") {
    const apiErr = err as ApiError;
    // Use first error detail if available
    if (apiErr.errors?.[0]?.detail) return apiErr.errors[0].detail;
    if (apiErr.message) return apiErr.message;
  }
  if (err instanceof Error) return err.message;
  return t("fitness.pp_generic_error");
}

// ─── PaymentPanel ─────────────────────────────────────────────────────────────

export default function PaymentPanel({
  title,
  description,
  paymentInfo,
  onPaymentConfirmed,
  onCancel,
  cancelLabel,
  onRefreshInvoice,
  isRefreshingInvoice = false,
  onPayInitiate,
  onVerifyPayment,
}: PaymentPanelProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("fitness.payment_title");
  const resolvedDescription = description ?? t("fitness.payment_description");
  const resolvedCancelLabel = cancelLabel ?? t("fitness.pp_back");
  const [phase, setPhase] = useState<
    "idle" | "loading" | "initiating" | "verifying" | "done" | "error"
  >("idle");
  const [error, setError] = useState<{
    message: string;
    isExpired: boolean;
  } | null>(null);

  // Reset when invoice changes
  useEffect(() => {
    setError(null);
    setPhase("idle");
  }, [paymentInfo.invoice_number]);

  // ─── Handle refresh invoice ──────────────────────────────────────────────────

  const handleRefreshInvoice = useCallback(async () => {
    if (!onRefreshInvoice) return;
    setError(null);
    setPhase("idle");
    try {
      await onRefreshInvoice();
      // Parent should update the paymentInfo prop with the new invoice
    } catch (err) {
      setError({
        message: getErrorMessage(err, t),
        isExpired: isInvoiceExpiredError(err),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefreshInvoice]);

  // ─── REAL payment flow — mirrors ConnectDialog exactly ───────────────────────

  const handlePay = useCallback(async () => {
    setError(null);
    setPhase("loading");

    try {
      // Step 1: Get fresh credentials. If onPayInitiate is provided, this
      // re-validates / refreshes the invoice with the backend before we
      // ever hand it to IremboPay — so an already-expired invoice never
      // reaches window.IremboPay.initiate.
      let publicKey: string;
      let invoiceNumber: string;

      if (onPayInitiate) {
        const fresh = await onPayInitiate();
        publicKey = fresh.public_key;
        invoiceNumber = fresh.invoice_number;
      } else {
        publicKey = paymentInfo.public_key;
        invoiceNumber = paymentInfo.invoice_number;
      }

      if (!publicKey || !invoiceNumber) {
        throw new Error(t("fitness.pp_payment_could_not_initialize"));
      }

      setPhase("initiating");

      // Step 2: Open IremboPay modal
      window.IremboPay.initiate({
        publicKey,
        invoiceNumber,
        locale: window.IremboPay.locale.EN,
        callback: (err: Error | null) => {
          window.IremboPay.closeModal?.();

          if (err) {
            // IremboPay's callback only gives us a generic Error, but in
            // case it (or a wrapped backend error) carries expiry info,
            // surface the proper "expired" UI instead of a generic message.
            const expired = isInvoiceExpiredError(err);
            setError({
              message: expired
                ? getErrorMessage(err, t)
                : t("fitness.pp_payment_not_completed"),
              isExpired: expired,
            });
            setPhase("idle");
            return;
          }

          // Step 3: Verify payment
          setPhase("verifying");

          if (onVerifyPayment) {
            onVerifyPayment(invoiceNumber)
              .then((isPaid) => {
                if (isPaid) {
                  setPhase("done");
                  onPaymentConfirmed();
                } else {
                  setError({
                    message: t("fitness.pp_verification_failed"),
                    isExpired: false,
                  });
                  setPhase("idle");
                }
              })
              .catch((verifyErr) => {
                const expired = isInvoiceExpiredError(verifyErr);
                setError({
                  message: getErrorMessage(verifyErr, t),
                  isExpired: expired,
                });
                setPhase("idle");
              });
          } else {
            setPhase("done");
            onPaymentConfirmed();
          }
        },
      });
    } catch (err: unknown) {
      const expired = isInvoiceExpiredError(err);
      setError({
        message: getErrorMessage(err, t),
        isExpired: expired,
      });
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentInfo, onPayInitiate, onVerifyPayment, onPaymentConfirmed]);

  // ─── Verifying state ─────────────────────────────────────────────────────────

  if (phase === "verifying") {
    return (
      <div className="flex flex-col gap-4 rounded-[5px] border border-border bg-card p-5 pt-6 text-card-foreground max-w-[400px] w-full">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs font-bold text-foreground">
            {t("fitness.pp_confirming_payment")}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("fitness.pp_confirming_hint")}
          </p>
        </div>
      </div>
    );
  }

  // ─── Done state ──────────────────────────────────────────────────────────────

  if (phase === "done") {
    return (
      <div className="flex flex-col gap-4 rounded-[5px] border border-border bg-card p-5 pt-6 text-card-foreground max-w-[400px] w-full">
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-[5px] border border-success/35 bg-success/15">
            <Check className="h-5 w-5 text-success" strokeWidth={2.5} />
          </div>
          <p className="text-sm font-bold tracking-tight text-foreground">{t("fitness.pp_payment_confirmed")}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("fitness.pp_payment_confirmed_desc")}
          </p>
        </div>
      </div>
    );
  }

  const isLoading =
    phase === "loading" || phase === "initiating" || isRefreshingInvoice;
  const isExpiredError = error?.isExpired ?? false;

  return (
    <div className="flex flex-col gap-4 rounded-[5px] border border-border bg-card p-5 pt-6 text-card-foreground max-w-[400px] w-full">
      {/* Header */}
      {resolvedTitle && (
        <div>
          <p className="text-sm font-bold tracking-tight text-foreground">{resolvedTitle}</p>
          {resolvedDescription && (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {resolvedDescription}
            </p>
          )}
        </div>
      )}

      {/* Invoice summary */}
      <div className="overflow-hidden rounded-[5px] border border-border bg-muted/50">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] text-muted-foreground">{t("fitness.pp_invoice_label")}</span>
          <span className="font-mono text-[11px] tracking-wide text-foreground/75">
            {paymentInfo.invoice_number}
          </span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-foreground">{t("fitness.pp_amount_due_label")}</span>
          <span className="text-sm font-bold text-success">
            {paymentInfo.currency}{" "}
            {Number(paymentInfo.amount).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Error block */}
      {error && (
        <div
          className={`flex items-start gap-2.5 rounded-[5px] border p-3 ${
            isExpiredError
              ? "border-warning/30 bg-warning/10"
              : "border-destructive/30 bg-destructive/10"
          }`}
        >
          <div
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] ${
              isExpiredError ? "bg-warning/15" : "bg-destructive/15"
            }`}
          >
            <AlertCircle
              size={14}
              className={isExpiredError ? "text-warning" : "text-destructive"}
              strokeWidth={2}
            />
          </div>
          <div className="flex-1">
            <p
              className={`text-[11px] font-semibold leading-tight ${
                isExpiredError ? "text-warning" : "text-destructive"
              }`}
            >
              {isExpiredError ? t("fitness.pp_invoice_expired_title") : t("fitness.pp_payment_failed_title")}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {error.message}
            </p>

            {/* Expired → show refresh button */}
            {isExpiredError && onRefreshInvoice && (
              <button
                onClick={handleRefreshInvoice}
                disabled={isRefreshingInvoice}
                className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-[5px] bg-success text-[11px] font-semibold text-success-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRefreshingInvoice ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    {t("fitness.pp_getting_new_invoice")}
                  </>
                ) : (
                  <>
                    <RefreshCw size={13} strokeWidth={2.5} />
                    {t("fitness.pp_get_new_invoice")}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!(isExpiredError && onRefreshInvoice) && (
        <div className="flex flex-col gap-2">
          <button
            onClick={handlePay}
            disabled={isLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[5px] bg-primary text-[13px] font-semibold tracking-tight text-primary-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShieldCheck size={16} strokeWidth={2} />
            )}
            {phase === "loading"
              ? t("fitness.pp_loading_payment")
              : phase === "initiating"
              ? t("fitness.pp_opening_payment")
              : t("fitness.pp_pay_now")}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[5px] border border-border bg-muted/50 text-[12px] font-medium text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >

              {resolvedCancelLabel}
            </button>
          )}
        </div>
      )}

      {/* When expired + refresh handler — still show Back button */}
      {isExpiredError && onRefreshInvoice && onCancel && (
        <button
          onClick={onCancel}
          disabled={isRefreshingInvoice}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[5px] border border-border bg-muted/50 text-[12px] font-medium text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >

          {resolvedCancelLabel}
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
        <ShieldCheck size={11} strokeWidth={1.5} />
        {t("fitness.pp_secured_footer")}
      </div>
    </div>
  );
}
