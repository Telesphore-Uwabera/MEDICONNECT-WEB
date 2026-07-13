import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateOnly } from "@/lib/date";
  import{Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  ClipboardList,
  PackagePlus,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  X,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  Package,
  User,
  Calendar,
  Clock,
  Hash,
  StickyNote,
  ShieldCheck,
  Tag,
  Barcode,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  useGetStockRequests,
  useApproveStockRequest,
  useReceiveStock,
  useRejectStockRequest,
  useDeleteStockRequest,
  useCreateStockRequest,
  type StockRequest,
  type StockRequestStatus,
  type CreateStockRequestPayload,
  type ReceiveStockPayload,
} from "@/hooks/pharmacy/use-inventory-stock";
import { useGetInventoryMedicines } from "@/hooks/pharmacy/use-inventory-medicines";
import { MedicineCombobox } from "./components/MedicineCombobox";

 
type FullStockRequest = StockRequest & {
  rejection_reason?: string | null;
  approved_at?: string | null;
  received_at?: string | null;
};

 
const STATUS_STYLES: Record<StockRequestStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  approved:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  received:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const STATUS_DOT: Record<StockRequestStatus, string> = {
  pending: "bg-amber-500",
  approved: "bg-sky-500",
  received: "bg-emerald-500",
  rejected: "bg-red-500",
};
 
interface FilterState {
  search: string;
  status: StockRequestStatus | "all";
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  status: "all",
};

function formatDate(iso: string) {
  return formatDateOnly(iso, undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

 
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; dot?: string }[];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-[6px] text-[11px] border transition-all duration-200 text-left flex items-center gap-2",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.dot && (
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                value === o.value ? "bg-primary-foreground/70" : o.dot,
              )}
            />
          )}
          {t(o.label)}
        </button>
      ))}
    </div>
  );
}

const inputCls =
  "w-full bg-background border border-border/60 rounded-[6px] px-3 py-1.5 text-[11px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all";

const labelCls = "block text-[11px] font-medium text-muted-foreground mb-1";

//  Create Request Drawer 

const CREATE_FORM_ID = "create-stock-request-form";

function CreateRequestDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { mutate, isPending, error } = useCreateStockRequest();
  const { data: medicinesData, isLoading: loadingMeds } =
    useGetInventoryMedicines();
  const [form, setForm] = useState<CreateStockRequestPayload>({
    medicine_id: 0,
    requested_quantity: 1,
    notes: "",
  });

  const medicines = medicinesData?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicine_id) return;
    mutate(form, { onSuccess: onClose });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/60 text-left space-y-0 flex-shrink-0">
          <SheetTitle className="text-[13px] font-semibold text-foreground">
            {t("pages.pharmacy.new_stock_request")}
          </SheetTitle>
          <SheetDescription className="text-[10px] text-muted-foreground/70">
            {t("pages.pharmacy.restock_drawer_desc")}
          </SheetDescription>
        </SheetHeader>

        <form
          id={CREATE_FORM_ID}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
        >
          {/* Medicine combobox */}
          <div>
            <label className={labelCls}>
              {t("pages.pharmacy.medicine")} <span className="text-red-500">*</span>
            </label>
            {loadingMeds ? (
              <div
                className={cn(
                  inputCls,
                  "flex items-center gap-2 text-muted-foreground/60",
                )}
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("pages.pharmacy.loading_medicines")}
              </div>
            ) : (
              <MedicineCombobox
                medicines={medicines}
                value={form.medicine_id}
                onChange={(id) =>
                  setForm((f) => ({ ...f, medicine_id: id }))
                }
              />
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className={labelCls}>{t("pages.pharmacy.requested_quantity")}</label>
            <input
              type="number"
              required
              min={1}
              value={form.requested_quantity}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  requested_quantity: Number(e.target.value),
                }))
              }
              className={inputCls}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>
              {t("pages.pharmacy.notes")}{" "}
              <span className="text-muted-foreground/50 font-normal">
                ({t("pages.pharmacy.optional")})
              </span>
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              className={cn(inputCls, "resize-none")}
              placeholder={t("pages.pharmacy.restock_notes_placeholder")}
            />
          </div>

          {error && (
            <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[6px] px-3 py-2">
              {error.message}
            </p>
          )}
        </form>

        <SheetFooter className="px-5 py-3.5 border-t border-border/60 flex-row gap-2 flex-shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-7 text-[11px] rounded-[6px]"
          >
            {t("pages.pharmacy.cancel")}
          </Button>
          <Button
            type="submit"
            form={CREATE_FORM_ID}
            size="sm"
            disabled={isPending || !form.medicine_id}
            className="flex-1 h-7 text-[11px] font-semibold rounded-[6px] shadow-sm"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
            {t("pages.pharmacy.submit_request")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Receive Drawer 

const RECEIVE_FORM_ID = "receive-stock-form";

function ReceiveDrawer({
  request,
  onClose,
}: {
  request: StockRequest | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { mutate, isPending, error } = useReceiveStock();
  const [form, setForm] = useState<ReceiveStockPayload>({
    received_quantity: undefined,
    batch_number: "",
    expiry_date: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    mutate(
      {
        id: request.id,
        payload: {
          received_quantity: form.received_quantity || undefined,
          batch_number: form.batch_number || undefined,
          expiry_date: form.expiry_date || undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet open={!!request} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/60 text-left space-y-0 flex-shrink-0">
          <SheetTitle className="text-[13px] font-semibold text-foreground">
            {t("pages.pharmacy.receive_stock")}
          </SheetTitle>
        </SheetHeader>

        {request && (
          <form
            id={RECEIVE_FORM_ID}
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          >
            <p className="text-[11px] text-muted-foreground">
              Confirming receipt for{" "}
              <strong className="text-foreground">
                {request.medicine?.name ?? `Medicine #${request.medicine_id}`}
              </strong>
              . Requested:{" "}
              <strong className="text-foreground">
                {request.requested_quantity}
              </strong>{" "}
              units.
            </p>

            <div>
              <label className={labelCls}>
                {t("pages.pharmacy.received_quantity")}{" "}
                <span className="text-muted-foreground/50 font-normal">
                  ({t("pages.pharmacy.leave_blank_full_amount")})
                </span>
              </label>
              <input
                type="number"
                min={1}
                value={form.received_quantity ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    received_quantity: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                className={inputCls}
                placeholder={String(request.requested_quantity)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>{t("pages.pharmacy.batch_number")}</label>
                <input
                  type="text"
                  value={form.batch_number}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, batch_number: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="BATCH-003"
                />
              </div>
              <div>
                <label className={labelCls}>{t("pages.pharmacy.expiry_date")}</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiry_date: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[6px] px-3 py-2">
                {error.message}
              </p>
            )}
          </form>
        )}

        <SheetFooter className="px-5 py-3.5 border-t border-border/60 flex-row gap-2 flex-shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-7 text-[11px] rounded-[6px]"
          >
            {t("pages.pharmacy.cancel")}
          </Button>
          <Button
            type="submit"
            form={RECEIVE_FORM_ID}
            size="sm"
            disabled={isPending || !request}
            className="flex-1 h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] shadow-sm"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
            {t("pages.pharmacy.confirm_receipt")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

//  Reject Drawer  

const REJECT_FORM_ID = "reject-stock-request-form";

function RejectDrawer({
  request,
  onClose,
}: {
  request: StockRequest | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { mutate, isPending, error } = useRejectStockRequest();
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    mutate({ id: request.id, reason }, { onSuccess: onClose });
  };

  return (
    <Sheet open={!!request} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/60 text-left space-y-0 flex-shrink-0">
          <SheetTitle className="text-[13px] font-semibold text-foreground">
            {t("pages.pharmacy.reject_request")}
          </SheetTitle>
        </SheetHeader>

        {request && (
          <form
            id={REJECT_FORM_ID}
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          >
            <p className="text-[11px] text-muted-foreground">
              {t("pages.pharmacy.rejecting_request_for")}{" "}
              <strong className="text-foreground">
                {request.medicine?.name ?? `Medicine #${request.medicine_id}`}
              </strong>
              .
            </p>
            <div>
              <label className={labelCls}>
                {t("pages.pharmacy.reason")} <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={cn(inputCls, "resize-none")}
                placeholder={t("pages.pharmacy.reject_reason_placeholder")}
              />
            </div>
            {error && (
              <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[6px] px-3 py-2">
                {error.message}
              </p>
            )}
          </form>
        )}

        <SheetFooter className="px-5 py-3.5 border-t border-border/60 flex-row gap-2 flex-shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-7 text-[11px] rounded-[6px]"
          >
            {t("pages.pharmacy.cancel")}
          </Button>
          <Button
            type="submit"
            form={REJECT_FORM_ID}
            size="sm"
            disabled={isPending || !reason.trim() || !request}
            className="flex-1 h-7 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-[6px] shadow-sm"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin mr-1.5" />}
            {t("pages.pharmacy.reject")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

//  View Details Drawer 

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3 h-3 text-muted-foreground/60 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/70">{label}</p>
        <p className="text-[11px] text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

function RequestDetailsDrawer({
  request,
  onClose,
  onReceive,
  onReject,
}: {
  request: FullStockRequest | null;
  onClose: () => void;
  onReceive: (r: StockRequest) => void;
  onReject: (r: StockRequest) => void;
}) {
  const { t } = useTranslation();
  const { mutate: approve, isPending: approving } = useApproveStockRequest();
  const { mutate: deleteReq, isPending: deleting } = useDeleteStockRequest();

  if (!request) return null;

  const med = request.medicine as
    | (StockRequest["medicine"] & {
      price?: string;
      currency?: string;
      unit?: string;
      barcode?: string;
      requires_prescription?: boolean;
    })
    | undefined;

  return (
    <Sheet open={!!request} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-sm p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/60 text-left space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-[13px] font-semibold text-foreground truncate">
                {med?.name ?? `Medicine #${request.medicine_id}`}
              </SheetTitle>
              <SheetDescription className="text-[10px] text-muted-foreground/70">
                {t("pages.pharmacy.stock_request", { id: request.id })}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Status */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "border text-[9px] px-1.5 py-0 font-medium capitalize",
                STATUS_STYLES[request.status],
              )}
            >
              <span
                className={cn(
                  "w-1 h-1 rounded-full mr-1",
                  STATUS_DOT[request.status],
                  request.status === "pending" && "animate-pulse",
                )}
              />
              {t(`pages.pharmacy.${request.status}`)}
            </Badge>
            {med?.requires_prescription && (
              <Badge
                variant="outline"
                className="border text-[9px] px-1.5 py-0 font-medium bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900"
              >
                <ShieldCheck className="w-2.5 h-2.5 mr-1" /> {t("pages.pharmacy.prescription")}
              </Badge>
            )}
          </div>

          {/* Quantities */}
          <div className="rounded-[6px] border border-border/60 bg-secondary/10 p-3 grid grid-cols-2 gap-2.5">
            <div>
              <p className="text-[10px] text-muted-foreground/70">{t("pages.pharmacy.requested")}</p>
              <p className="text-[14px] font-bold tabular-nums text-foreground">
                {request.requested_quantity.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/70">{t("pages.pharmacy.received")}</p>
              <p className="text-[14px] font-bold tabular-nums text-foreground">
                {request.received_quantity != null
                  ? request.received_quantity.toLocaleString()
                  : "-"}
              </p>
            </div>
            {request.batch_number && (
              <div>
                <p className="text-[10px] text-muted-foreground/70">
                  {t("pages.pharmacy.batch_number")}
                </p>
                <p className="text-[11px] text-foreground">
                  {request.batch_number}
                </p>
              </div>
            )}
            {request.expiry_date && (
              <div>
                <p className="text-[10px] text-muted-foreground/70">
                  {t("pages.pharmacy.expiry_date")}
                </p>
                <p className="text-[11px] text-foreground">
                  {formatDate(request.expiry_date)}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {request.notes && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                {t("pages.pharmacy.notes")}
              </p>
              <div className="flex items-start gap-2 rounded-[6px] border border-border/50 bg-secondary/10 px-3 py-2">
                <StickyNote className="w-3 h-3 text-muted-foreground/60 mt-0.5 shrink-0" />
                <p className="text-[11px] text-foreground/90 leading-relaxed">
                  {request.notes}
                </p>
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {request.status === "rejected" &&
            (request.reason || request.rejection_reason) && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                  {t("pages.pharmacy.rejection_reason")}
                </p>
                <p className="text-[11px] text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[6px] px-3 py-2 leading-relaxed">
                  {request.reason ?? request.rejection_reason}
                </p>
              </div>
            )}

          {/* Medicine details */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              {t("pages.pharmacy.medicine")}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <DetailRow
                icon={Tag}
                label={t("pages.pharmacy.category")}
                value={med?.category?.name ?? t("pages.pharmacy.uncategorized")}
              />
              <DetailRow
                icon={Package}
                label={t("pages.pharmacy.unit")}
                value={
                  <span className="capitalize">{med?.unit ?? "-"}</span>
                }
              />
              <DetailRow
                icon={Barcode}
                label={t("pages.pharmacy.barcode")}
                value={med?.barcode ?? "-"}
              />
              <DetailRow
                icon={Hash}
                label={t("pages.pharmacy.price")}
                value={
                  med?.price
                    ? `${parseFloat(med.price).toLocaleString()} ${med.currency ?? ""}`
                    : "-"
                }
              />
            </div>
          </div>

          {/* Requester */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
              {t("pages.pharmacy.requested_by")}
            </p>
            <DetailRow
              icon={User}
              label={t("pages.pharmacy.name")}
              value={request.requester?.name ?? "-"}
            />
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-1 gap-2.5">
            <DetailRow
              icon={Calendar}
              label={t("pages.pharmacy.created")}
              value={formatDateTime(request.created_at)}
            />
            <DetailRow
              icon={Clock}
              label={t("pages.pharmacy.last_updated")}
              value={formatDateTime(request.updated_at)}
            />
            {request.approved_at && (
              <DetailRow
                icon={CheckCircle2}
                label={t("pages.pharmacy.approved")}
                value={formatDateTime(request.approved_at)}
              />
            )}
            {request.received_at && (
              <DetailRow
                icon={PackagePlus}
                label={t("pages.pharmacy.received")}
                value={formatDateTime(request.received_at)}
              />
            )}
          </div>
        </div>

        <SheetFooter className="px-5 py-3.5 border-t border-border/60 flex-row gap-2 flex-wrap">
          {request.status === "pending" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={deleting || approving}
                onClick={() => deleteReq(request.id, { onSuccess: onClose })}
                className="flex-1 h-7 text-[11px] rounded-[6px]"
              >
                {deleting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 mr-1.5" /> {t("pages.pharmacy.delete")}
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={deleting || approving}
                onClick={() => onReject(request)}
                className="flex-1 h-7 text-[11px] rounded-[6px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
              >
                {t("pages.pharmacy.reject")}
              </Button>
              <Button
                size="sm"
                disabled={deleting || approving}
                onClick={() => approve(request.id)}
                className="flex-1 h-7 text-[11px] font-semibold rounded-[6px] shadow-sm"
              >
                {approving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  t("pages.pharmacy.approve")
                )}
              </Button>
            </>
          )}
          {request.status === "approved" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(request)}
                className="flex-1 h-7 text-[11px] rounded-[6px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
              >
                {t("pages.pharmacy.reject")}
              </Button>
              <Button
                size="sm"
                onClick={() => onReceive(request)}
                className="flex-1 h-7 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] shadow-sm"
              >
                {t("pages.pharmacy.receive")}
              </Button>
            </>
          )}
          {(request.status === "received" || request.status === "rejected") && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-7 text-[11px] rounded-[6px]"
            >
              {t("pages.pharmacy.close")}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

//  Per-row action buttons 

function RequestActions({
  request,
  onView,
  onReceive,
  onReject,
}: {
  request: StockRequest;
  onView: (r: StockRequest) => void;
  onReceive: (r: StockRequest) => void;
  onReject: (r: StockRequest) => void;
}) {
  const { t } = useTranslation();
  const { mutate: approve, isPending: approving } = useApproveStockRequest();
  const { mutate: deleteReq, isPending: deleting } = useDeleteStockRequest();
  const busy = approving || deleting;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onView(request)}
        className="h-7 w-7 p-0 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
      >
        <Eye className="w-3 h-3" />
      </Button>

      {request.status === "pending" && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => deleteReq(request.id)}
            className="h-7 px-3 text-[10px] rounded-[6px] border-border/60 text-muted-foreground hover:bg-secondary/50 transition-all duration-200"
          >
            {deleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              t("pages.pharmacy.delete")
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onReject(request)}
            className="h-7 px-3 text-[10px] rounded-[6px] border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-all duration-200"
          >
            {t("pages.pharmacy.reject")}
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={() => approve(request.id)}
            className="h-7 px-3 text-[10px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-[6px] shadow-sm transition-all duration-200"
          >
            {approving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              "Approve"
            )}
          </Button>
        </>
      )}

      {request.status === "approved" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReject(request)}
            className="h-7 px-3 text-[10px] rounded-[6px] border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-all duration-200"
          >
            {t("pages.pharmacy.reject")}
          </Button>
          <Button
            size="sm"
            onClick={() => onReceive(request)}
            className="h-7 px-3 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] shadow-sm transition-all duration-200"
          >
            {t("pages.pharmacy.receive")}
          </Button>
        </>
      )}

      {request.status === "rejected" && request.reason && (
        <span
          className="text-[10px] text-muted-foreground/60 italic truncate max-w-[140px] block text-right"
          title={request.reason}
        >
          {request.reason}
        </span>
      )}
    </div>
  );
}

// Main Page 

const RestockRequests = () => {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<StockRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<StockRequest | null>(null);
  const [viewTarget, setViewTarget] = useState<FullStockRequest | null>(null);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  const { data, isLoading, isError, refetch } = useGetStockRequests(
    filters.status === "all" ? undefined : filters.status,
  );

  const requests: StockRequest[] = data?.data ?? [];

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        (r.medicine?.name ?? "").toLowerCase().includes(q) ||
        (r.medicine?.category?.name ?? "").toLowerCase().includes(q) ||
        (r.requester?.name ?? "").toLowerCase().includes(q),
    );
  }, [requests, filters.search]);

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      received: requests.filter((r) => r.status === "received").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests],
  );

  const openView = (r: StockRequest) =>
    setViewTarget(r as FullStockRequest);
  const openReceive = (r: StockRequest) => {
    setViewTarget(null);
    setReceiveTarget(r);
  };
  const openReject = (r: StockRequest) => {
    setViewTarget(null);
    setRejectTarget(r);
  };

  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "status",
      label: t("pages.pharmacy.status"),
      value: filters.status,
      options: [
        { value: "all", label: "pages.pharmacy.all_statuses" },
        { value: "pending", label: "pages.pharmacy.pending" },
        { value: "approved", label: "pages.pharmacy.approved" },
        { value: "received", label: "pages.pharmacy.received" },
        { value: "rejected", label: "pages.pharmacy.rejected" },
      ],
      onChange: (v: string) => set("status", v as any)
    }
  ], [filters.status, set]);

  // Render

  return (
    <DashboardLayout role="pharmacy">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.pharmacy.restock_title", "Restock Requests")}
          subtitle={t(
            "pages.pharmacy.restock_sub",
            "Manage and track stock replenishment requests",
          )}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Stat cards */}
          <div className="px-4 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard
              label="Pending"
              value={isLoading ? "-" : counts.pending}
              icon={ClipboardList}
              accent="warning"
            />
            <StatCard
              label={t("pages.pharmacy.approved")}
              value={isLoading ? "-" : counts.approved}
              icon={PackagePlus}
              accent="info"
            />
            <StatCard
              label={t("pages.pharmacy.received")}
              value={isLoading ? "-" : counts.received}
              icon={CheckCircle2}
              accent="success"
            />
            <StatCard
              label={t("pages.pharmacy.rejected")}
              value={isLoading ? "-" : counts.rejected}
              icon={XCircle}
              accent="warning"
            />
          </div>

          {/* Meta bar */}
          <div className="sticky top-0 z-10 mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading requests...
                </span>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {filtered.length}
                  </span>{" "}
                  {filtered.length === 1 ? "request" : "requests"}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </p>
              )}

              {!isLoading && (
                <div className="hidden lg:flex items-center gap-2">
                  {counts.pending > 0 && (
                    <button
                      onClick={() => set("status", "pending")}
                      className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {counts.pending} pending
                    </button>
                  )}
                  {counts.approved > 0 && (
                    <button
                      onClick={() => set("status", "approved")}
                      className="flex items-center gap-1 text-[10px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 border border-sky-200 dark:border-sky-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      {counts.approved} approved
                    </button>
                  )}
                  {counts.received > 0 && (
                    <button
                      onClick={() => set("status", "received")}
                      className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {counts.received} received
                    </button>
                  )}
                  {counts.rejected > 0 && (
                    <button
                      onClick={() => set("status", "rejected")}
                      className="flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded-[6px] hover:opacity-80 transition-opacity"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {counts.rejected} rejected
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                title={t("pages.pharmacy.refresh")}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 hover:border-primary/40 hover:bg-secondary/30 transition-all text-muted-foreground hover:text-foreground"
              >
                <RefreshCw
                  className={cn("w-3 h-3", isLoading && "animate-spin")}
                />
              </button>

              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => set("search", e.target.value)}
                  placeholder={t("pages.pharmacy.search_medicine_requester")}
                  className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              <Button
                size="sm"
                onClick={() => setShowCreate(true)}
                className="hidden sm:flex h-7 px-3 text-[11px] font-semibold rounded-[6px] shadow-sm items-center gap-1.5"
              >
                <Plus className="w-3 h-3" />
                New Request
              </Button>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </div>

          <FilterBar
            open={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            fields={filterFields}
            cols={{ default: 1, sm: 2, lg: 3 }}
          />

          {/* Table area */}
          <div className="p-4">
            {/* Error state */}
            {isError && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-red-50 dark:bg-red-950/20 flex items-center justify-center border border-red-200 dark:border-red-900">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    Failed to load requests
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    Check your connection and try again
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  className="text-[11px] h-7 px-3 rounded-[6px] mt-1"
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  Retry
                </Button>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                <table className="w-full text-[11px]">
                  <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                    <tr>
                      {[
                        t("pages.pharmacy.medicine"),
                        t("pages.pharmacy.requested"),
                        t("pages.pharmacy.received"),
                        t("pages.pharmacy.status"),
                        "Requester",
                        "Date",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-border/40">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div
                              className="h-2.5 rounded bg-muted/60 animate-pulse"
                              style={{
                                width: `${50 + ((i * 3 + j * 7) % 40)}%`,
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <ClipboardList className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {hasActiveFilters
                      ? t("pages.pharmacy.no_requests_match")
                      : t("pages.pharmacy.no_stock_requests")}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {hasActiveFilters
                      ? t("pages.pharmacy.try_widening_search")
                      : t("pages.pharmacy.create_one_button")}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1"
                  >
                    {t("pages.pharmacy.clear_all_filters")}
                  </button>
                )}
              </div>
            )}

            {/* Data table */}
            {!isLoading && !isError && filtered.length > 0 && (
              <div className="rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
                <table className="w-full text-[11px]">
                  <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">
                        {t("pages.pharmacy.medicine")}
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Requested
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Received
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Requester
                      </th>
                      <th className="text-left px-4 py-3 font-semibold">
                        Date
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => openView(req)}
                        className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-semibold text-[11px] text-foreground">
                          {req.medicine?.name ??
                            `Medicine #${req.medicine_id}`}
                          {req.medicine?.category?.name && (
                            <span className="block text-[10px] font-normal text-muted-foreground/60 mt-0.5">
                              {req.medicine.category.name}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 tabular-nums font-bold text-[12px] text-foreground">
                          {req.requested_quantity.toLocaleString()}
                        </td>

                        <td className="px-4 py-3 tabular-nums text-foreground">
                          {req.received_quantity != null ? (
                            req.received_quantity.toLocaleString()
                          ) : (
                            <span className="text-muted-foreground/40">
                              -
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "border text-[9px] px-1.5 py-0 font-medium capitalize",
                              STATUS_STYLES[req.status],
                            )}
                          >
                            <span
                              className={cn(
                                "w-1 h-1 rounded-full mr-1",
                                STATUS_DOT[req.status],
                                req.status === "pending" && "animate-pulse",
                              )}
                            />
                            {req.status}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {req.requester?.name ?? (
                            <span className="text-muted-foreground/40">
                            -
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground/70 text-[10px] whitespace-nowrap">
                          {formatDate(req.created_at)}
                        </td>

                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <RequestActions
                            request={req}
                            onView={openView}
                            onReceive={openReceive}
                            onReject={openReject}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {data && data.last_page > 1 && (
                  <div className="px-4 py-2.5 border-t border-border/60 text-[10px] text-muted-foreground/70 flex items-center justify-between bg-secondary/10">
                    <span>
                      Page {data.current_page} of {data.last_page} ·{" "}
                      {data.total} total
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Drawers */}
      <CreateRequestDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <ReceiveDrawer
        request={receiveTarget}
        onClose={() => setReceiveTarget(null)}
      />
      <RejectDrawer
        request={rejectTarget}
        onClose={() => setRejectTarget(null)}
      />
      <RequestDetailsDrawer
        request={viewTarget}
        onClose={() => setViewTarget(null)}
        onReceive={openReceive}
        onReject={openReject}
      />
    </DashboardLayout>
  );
};

export default RestockRequests;

