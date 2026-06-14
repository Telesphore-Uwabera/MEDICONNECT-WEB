import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  CreditCard,
  Receipt,
  RefreshCcw,
  User,
  Mail,
  Landmark,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Send,
  Eye,
  Filter,
  ArrowRightLeft,
} from "lucide-react";
import {
  useGetDoctorWallets,
  useGetMainWallet,
  useTopUpDoctorWallet,
  useDeductDoctorWallet,
  useDeleteDoctorWallet,
  useTopUpMainWallet,
  useDeductMainWallet,
  useGetPayouts,
  useGetTransactions,
  useCreatePayout,
  useRefundPayout,
  type DoctorWallet,
  type MainWallet,
  type Payout,
  type Transaction,
} from "@/hooks/admin/use-doctor-wallets";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

function formatCurrency(value: string | number, currency = "RWF"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return `${num.toLocaleString()} ${currency}`;
}

const statusStyle: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  failed:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  refunded:
    "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-900",
};

const typeStyle: Record<string, string> = {
  credit:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  debit:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows({ cols = 7 }: { cols?: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-t border-border/40">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted/60 rounded animate-pulse"
                style={{ width: j === 0 ? "180px" : j === cols - 1 ? "100px" : "90px" }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all";

const selectCls =
  "w-full px-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = "doctors" | "payouts" | "transactions" | "main";

// ─── Doctor Wallet Row ─────────────────────────────────────────────────────────

function DoctorWalletRow({
  wallet,
  onTopUp,
  onDeduct,
  onDelete,
  isMutating,
}: {
  wallet: DoctorWallet;
  onTopUp: (w: DoctorWallet) => void;
  onDeduct: (w: DoctorWallet) => void;
  onDelete: (w: DoctorWallet) => void;
  isMutating: boolean;
}) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-sm bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[11px] text-foreground truncate">{wallet.doctor_name}</p>
            <p className="text-[10px] text-muted-foreground/50 truncate">{wallet.doctor_email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] font-medium text-foreground whitespace-nowrap">
        {formatCurrency(wallet.balance, wallet.currency)}
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/60 whitespace-nowrap uppercase">
        {wallet.currency}
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/60 whitespace-nowrap">
        {new Date(wallet.updated_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px] rounded-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all"
            onClick={() => onTopUp(wallet)}
            disabled={isMutating}
          >
            <ArrowUpCircle className="w-3 h-3 mr-1" />
            Top up
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px] rounded-sm border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/30 transition-all"
            onClick={() => onDeduct(wallet)}
            disabled={isMutating}
          >
            <ArrowDownCircle className="w-3 h-3 mr-1" />
            Deduct
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all"
            onClick={() => onDelete(wallet)}
            disabled={isMutating}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Doctor Wallet Card (mobile) ─────────────────────────────────────────────

function DoctorWalletCard({
  wallet,
  onTopUp,
  onDeduct,
  onDelete,
  isMutating,
}: {
  wallet: DoctorWallet;
  onTopUp: (w: DoctorWallet) => void;
  onDeduct: (w: DoctorWallet) => void;
  onDelete: (w: DoctorWallet) => void;
  isMutating: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
        <User className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[12px] text-foreground truncate">{wallet.doctor_name}</p>
            <p className="text-[10px] text-muted-foreground/50 truncate">{wallet.doctor_email}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[13px] font-bold text-foreground">{formatCurrency(wallet.balance, wallet.currency)}</span>
          <span className="text-[10px] text-muted-foreground/50 uppercase">{wallet.currency}</span>
        </div>
        <div className="flex gap-2 mt-2.5">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 px-2 text-[10px] rounded-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400"
            onClick={() => onTopUp(wallet)}
            disabled={isMutating}
          >
            <ArrowUpCircle className="w-3 h-3 mr-1" />
            Top up
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 px-2 text-[10px] rounded-sm border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400"
            onClick={() => onDeduct(wallet)}
            disabled={isMutating}
          >
            <ArrowDownCircle className="w-3 h-3 mr-1" />
            Deduct
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px] rounded-sm border-border/60 hover:border-red-400/60 hover:bg-red-50/50 hover:text-red-600"
            onClick={() => onDelete(wallet)}
            disabled={isMutating}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Payout Row ───────────────────────────────────────────────────────────────

function PayoutRow({
  payout,
  onRefund,
  isMutating,
}: {
  payout: Payout;
  onRefund: (p: Payout) => void;
  isMutating: boolean;
}) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-[11px] text-foreground truncate">{payout.doctor_name}</p>
          <p className="text-[10px] text-muted-foreground/50">#{payout.id}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] font-medium text-foreground whitespace-nowrap">
        {formatCurrency(payout.amount)}
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium capitalize",
            statusStyle[payout.status] ?? "bg-muted text-muted-foreground border-border",
          )}
        >
          {payout.status === "pending" && <Clock className="w-2.5 h-2.5 mr-0.5" />}
          {payout.status === "completed" && <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />}
          {payout.status === "failed" && <XCircle className="w-2.5 h-2.5 mr-0.5" />}
          {payout.status === "refunded" && <RotateCcw className="w-2.5 h-2.5 mr-0.5" />}
          {payout.status}
        </Badge>
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/70 capitalize">
        {payout.payment_method}
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/60 whitespace-nowrap">
        {payout.payment_reference ?? "—"}
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/60 whitespace-nowrap">
        {new Date(payout.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        {payout.status === "completed" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px] rounded-sm border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/30 transition-all"
            onClick={() => onRefund(payout)}
            disabled={isMutating}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Refund
          </Button>
        )}
      </td>
    </tr>
  );
}

// ─── Payout Card (mobile) ─────────────────────────────────────────────────────

function PayoutCard({
  payout,
  onRefund,
  isMutating,
}: {
  payout: Payout;
  onRefund: (p: Payout) => void;
  isMutating: boolean;
}) {
  return (
    <div className="p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-[12px] text-foreground truncate">{payout.doctor_name}</p>
          <p className="text-[10px] text-muted-foreground/50">#{payout.id}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium capitalize shrink-0",
            statusStyle[payout.status] ?? "bg-muted text-muted-foreground border-border",
          )}
        >
          {payout.status}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[13px] font-bold text-foreground">{formatCurrency(payout.amount)}</span>
        <span className="text-[10px] text-muted-foreground/50 capitalize">{payout.payment_method}</span>
      </div>
      {payout.payment_reference && (
        <p className="text-[10px] text-muted-foreground/50 mt-1">Ref: {payout.payment_reference}</p>
      )}
      {payout.status === "completed" && (
        <Button
          size="sm"
          variant="outline"
          className="w-full mt-2 h-7 text-[10px] rounded-sm border-amber-200 text-amber-700 hover:bg-amber-50"
          onClick={() => onRefund(payout)}
          disabled={isMutating}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Refund
        </Button>
      )}
    </div>
  );
}

// ─── Transaction Row ────────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: Transaction }) {
  return (
    <tr className="border-t border-border/40 hover:bg-secondary/20 transition-colors duration-150">
      <td className="px-4 py-3 text-[11px] text-muted-foreground/60">#{tx.id}</td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={cn(
            "border text-[9px] px-1.5 py-0 font-medium capitalize",
            typeStyle[tx.type] ?? "bg-muted text-muted-foreground border-border",
          )}
        >
          {tx.type === "credit" ? (
            <ArrowUpCircle className="w-2.5 h-2.5 mr-0.5" />
          ) : (
            <ArrowDownCircle className="w-2.5 h-2.5 mr-0.5" />
          )}
          {tx.type}
        </Badge>
      </td>
      <td className="px-4 py-3 text-[11px] font-medium text-foreground whitespace-nowrap">
        {formatCurrency(tx.amount)}
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/70 whitespace-nowrap">
        {formatCurrency(tx.balance_after)}
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/60 truncate max-w-[200px]">
        {tx.description ?? "—"}
      </td>
      <td className="px-4 py-3 text-[11px] text-muted-foreground/60 whitespace-nowrap">
        {new Date(tx.created_at).toLocaleString()}
      </td>
    </tr>
  );
}

// ─── Transaction Card (mobile) ────────────────────────────────────────────────

function TransactionCard({ tx }: { tx: Transaction }) {
  return (
    <div className="p-3.5 rounded-sm border border-border/60 bg-card hover:bg-secondary/20 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "border text-[9px] px-1.5 py-0 font-medium capitalize",
              typeStyle[tx.type] ?? "bg-muted text-muted-foreground border-border",
            )}
          >
            {tx.type}
          </Badge>
          <span className="text-[10px] text-muted-foreground/50">#{tx.id}</span>
        </div>
        <span className="text-[12px] font-bold text-foreground">{formatCurrency(tx.amount)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/60">
        <span>Balance after: {formatCurrency(tx.balance_after)}</span>
        <span>{new Date(tx.created_at).toLocaleDateString()}</span>
      </div>
      {tx.description && (
        <p className="text-[10px] text-muted-foreground/50 mt-1 truncate">{tx.description}</p>
      )}
    </div>
  );
}

// ─── Panel form state ─────────────────────────────────────────────────────────

interface TopUpForm {
  amount: string;
  note: string;
}

interface DeductForm {
  amount: string;
  note: string;
}

interface PayoutForm {
  doctor_id: string;
  amount: string;
  payment_method: string;
  payment_reference: string;
  note: string;
}

interface RefundForm {
  reason: string;
}

// ─── Action Panel (TopUp / Deduct / CreatePayout / Refund) ────────────────────

type PanelAction = "topup" | "deduct" | "payout" | "refund" | null;

function ActionPanel({
  action,
  wallet,
  payout,
  onClose,
}: {
  action: PanelAction;
  wallet: DoctorWallet | null;
  payout: Payout | null;
  onClose: () => void;
}) {
  const open = !!action;
  const { toast } = useToast();

  const [topUpForm, setTopUpForm] = useState<TopUpForm>({ amount: "", note: "" });
  const [deductForm, setDeductForm] = useState<DeductForm>({ amount: "", note: "" });
  const [payoutForm, setPayoutForm] = useState<PayoutForm>({
    doctor_id: "",
    amount: "",
    payment_method: "momo",
    payment_reference: "",
    note: "",
  });
  const [refundForm, setRefundForm] = useState<RefundForm>({ reason: "" });

  const topUpMutation = useTopUpDoctorWallet();
  const deductMutation = useDeductDoctorWallet();
  const createPayoutMutation = useCreatePayout();
  const refundMutation = useRefundPayout();

  const isSaving =
    topUpMutation.isPending ||
    deductMutation.isPending ||
    createPayoutMutation.isPending ||
    refundMutation.isPending;

  useEffect(() => {
    if (action === "topup" && wallet) {
      setTopUpForm({ amount: "", note: "" });
    } else if (action === "deduct" && wallet) {
      setDeductForm({ amount: "", note: "" });
    } else if (action === "payout") {
      setPayoutForm({
        doctor_id: wallet ? String(wallet.doctor_id) : "",
        amount: "",
        payment_method: "momo",
        payment_reference: "",
        note: "",
      });
    } else if (action === "refund" && payout) {
      setRefundForm({ reason: "" });
    }
  }, [action, wallet, payout]);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleTopUp = async () => {
    if (!wallet || !topUpForm.amount || parseFloat(topUpForm.amount) <= 0) {
      toast({ title: "Valid amount is required", variant: "destructive" });
      return;
    }
    try {
      await topUpMutation.mutateAsync({
        id: wallet.id,
        payload: { amount: parseFloat(topUpForm.amount), note: topUpForm.note || undefined },
      });
      toast({ title: "Wallet topped up successfully." });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleDeduct = async () => {
    if (!wallet || !deductForm.amount || parseFloat(deductForm.amount) <= 0) {
      toast({ title: "Valid amount is required", variant: "destructive" });
      return;
    }
    try {
      await deductMutation.mutateAsync({
        id: wallet.id,
        payload: { amount: parseFloat(deductForm.amount), note: deductForm.note || undefined },
      });
      toast({ title: "Amount deducted successfully." });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleCreatePayout = async () => {
    if (!payoutForm.doctor_id || !payoutForm.amount || parseFloat(payoutForm.amount) <= 0) {
      toast({ title: "Doctor and valid amount are required", variant: "destructive" });
      return;
    }
    try {
      await createPayoutMutation.mutateAsync({
        doctor_id: parseInt(payoutForm.doctor_id),
        amount: parseFloat(payoutForm.amount),
        payment_method: payoutForm.payment_method,
        payment_reference: payoutForm.payment_reference || undefined,
        note: payoutForm.note || undefined,
      });
      toast({ title: "Payout created successfully." });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleRefund = async () => {
    if (!payout || !refundForm.reason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    try {
      await refundMutation.mutateAsync({
        id: payout.id,
        payload: { reason: refundForm.reason },
      });
      toast({ title: "Payout refunded successfully." });
      onClose();
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  const getTitle = () => {
    switch (action) {
      case "topup":  return "Top up wallet";
      case "deduct": return "Deduct from wallet";
      case "payout": return "Create payout";
      case "refund": return "Refund payout";
      default:       return "";
    }
  };

  const getSubtitle = () => {
    switch (action) {
      case "topup":  return wallet ? `Adding funds to ${wallet.doctor_name}` : "";
      case "deduct": return wallet ? `Deducting from ${wallet.doctor_name}` : "";
      case "payout": return "Send payout to a doctor";
      case "refund": return payout ? `Refunding payout #${payout.id}` : "";
      default:       return "";
    }
  };

  const getSubmitLabel = () => {
    switch (action) {
      case "topup":  return "Top up";
      case "deduct": return "Deduct";
      case "payout": return "Create payout";
      case "refund": return "Refund";
      default:       return "Save";
    }
  };

  const handleSubmit = () => {
    switch (action) {
      case "topup":  return handleTopUp();
      case "deduct": return handleDeduct();
      case "payout": return handleCreatePayout();
      case "refund": return handleRefund();
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] lg:w-[480px]",
          "bg-card border-l border-border/60 flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {open && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold text-foreground leading-tight">{getTitle()}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{getSubtitle()}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full border border-border/60 bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Close panel"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* TopUp / Deduct Form */}
              {(action === "topup" || action === "deduct") && (
                <>
                  {wallet && (
                    <div className="p-3 rounded-lg border border-border/60 bg-secondary/30">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                        <Wallet className="w-3.5 h-3.5" />
                        Current balance
                      </div>
                      <p className="text-[14px] font-bold text-foreground">
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </p>
                    </div>
                  )}
                  <Field label="Amount" required>
                    <div className="relative">
                      <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                      <input
                        type="number"
                        min={1}
                        value={action === "topup" ? topUpForm.amount : deductForm.amount}
                        onChange={(e) =>
                          action === "topup"
                            ? setTopUpForm((p) => ({ ...p, amount: e.target.value }))
                            : setDeductForm((p) => ({ ...p, amount: e.target.value }))
                        }
                        placeholder="5000"
                        className={cn(inputCls, "pl-8")}
                      />
                    </div>
                  </Field>
                  <Field label="Note">
                    <input
                      type="text"
                      value={action === "topup" ? topUpForm.note : deductForm.note}
                      onChange={(e) =>
                        action === "topup"
                          ? setTopUpForm((p) => ({ ...p, note: e.target.value }))
                          : setDeductForm((p) => ({ ...p, note: e.target.value }))
                      }
                      placeholder="Optional note..."
                      className={inputCls}
                    />
                  </Field>
                </>
              )}

              {/* Payout Form */}
              {action === "payout" && (
                <>
                  <Field label="Doctor" required>
                    <input
                      type="number"
                      value={payoutForm.doctor_id}
                      onChange={(e) => setPayoutForm((p) => ({ ...p, doctor_id: e.target.value }))}
                      placeholder="Doctor ID"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Amount" required>
                    <div className="relative">
                      <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                      <input
                        type="number"
                        min={1}
                        value={payoutForm.amount}
                        onChange={(e) => setPayoutForm((p) => ({ ...p, amount: e.target.value }))}
                        placeholder="5000"
                        className={cn(inputCls, "pl-8")}
                      />
                    </div>
                  </Field>
                  <Field label="Payment method" required>
                    <select
                      value={payoutForm.payment_method}
                      onChange={(e) => setPayoutForm((p) => ({ ...p, payment_method: e.target.value }))}
                      className={selectCls}
                    >
                      <option value="momo">Mobile Money</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="cash">Cash</option>
                    </select>
                  </Field>
                  <Field label="Payment reference">
                    <input
                      type="text"
                      value={payoutForm.payment_reference}
                      onChange={(e) => setPayoutForm((p) => ({ ...p, payment_reference: e.target.value }))}
                      placeholder="TXN123456"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Note">
                    <input
                      type="text"
                      value={payoutForm.note}
                      onChange={(e) => setPayoutForm((p) => ({ ...p, note: e.target.value }))}
                      placeholder="Monthly payout..."
                      className={inputCls}
                    />
                  </Field>
                </>
              )}

              {/* Refund Form */}
              {action === "refund" && (
                <>
                  {payout && (
                    <div className="p-3 rounded-lg border border-border/60 bg-secondary/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Payout amount</span>
                        <span className="text-[12px] font-bold text-foreground">{formatCurrency(payout.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Doctor</span>
                        <span className="text-[11px] text-foreground">{payout.doctor_name}</span>
                      </div>
                    </div>
                  )}
                  <Field label="Reason" required>
                    <textarea
                      value={refundForm.reason}
                      onChange={(e) => setRefundForm({ reason: e.target.value })}
                      placeholder="Reason for refund..."
                      rows={3}
                      className={cn(inputCls, "resize-none")}
                    />
                  </Field>
                </>
              )}
            </div>

            <div className="flex-shrink-0 px-5 py-4 border-t border-border/60 space-y-2 bg-card">
              <Button
                className="w-full h-10 text-[12px] rounded-lg gap-2"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isSaving ? "Processing…" : getSubmitLabel()}
              </Button>
              <Button
                variant="ghost"
                className="w-full h-9 text-[12px] rounded-lg text-muted-foreground"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteDialog({
  wallet,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  wallet: DoctorWallet | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  if (!wallet) return null;
  return (
    <>
      <div onClick={onCancel} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm bg-card border border-border rounded-xl shadow-xl p-5 flex flex-col gap-4">
        <div>
          <p className="text-[14px] font-semibold text-foreground">Delete wallet?</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{wallet.doctor_name}</span>{" "}
            wallet will be permanently removed. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-9 text-[12px] rounded-lg border-border/60"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1 h-9 text-[12px] rounded-lg gap-1.5"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Main Wallet Card ─────────────────────────────────────────────────────────

function MainWalletCard({
  mainWallet,
  onTopUp,
  onDeduct,
}: {
  mainWallet: MainWallet | undefined;
  onTopUp: () => void;
  onDeduct: () => void;
}) {
  const topUpMutation = useTopUpMainWallet();
  const deductMutation = useDeductMainWallet();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [action, setAction] = useState<"topup" | "deduct" | null>(null);

  const handleMainAction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Valid amount is required", variant: "destructive" });
      return;
    }
    try {
      if (action === "topup") {
        await topUpMutation.mutateAsync({ amount: parseFloat(amount), note: note || undefined });
        toast({ title: "Main wallet topped up successfully." });
      } else {
        await deductMutation.mutateAsync({ amount: parseFloat(amount), note: note || undefined });
        toast({ title: "Amount deducted from main wallet." });
      }
      setAmount("");
      setNote("");
      setAction(null);
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    }
  };

  return (
    <div className="rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20">
            <Landmark className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Main Wallet</p>
            <p className="text-[10px] text-muted-foreground/50">Platform reserve fund</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[16px] font-bold text-foreground">
            {mainWallet ? formatCurrency(mainWallet.balance, mainWallet.currency) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground/50 uppercase">{mainWallet?.currency ?? "RWF"}</p>
        </div>
      </div>

      {action && (
        <div className="px-5 py-4 border-b border-border/60 space-y-3 bg-secondary/20">
          <p className="text-[11px] font-semibold text-foreground">
            {action === "topup" ? "Top up main wallet" : "Deduct from main wallet"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                Amount
              </label>
              <div className="relative">
                <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100000"
                  className={cn(inputCls, "pl-8")}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
                Note
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional..."
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-[11px] rounded-sm"
              onClick={handleMainAction}
              disabled={topUpMutation.isPending || deductMutation.isPending}
            >
              {(topUpMutation.isPending || deductMutation.isPending) && (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              )}
              {action === "topup" ? "Top up" : "Deduct"}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => setAction(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="px-5 py-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-[11px] rounded-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400"
          onClick={() => {
            setAction("topup");
            setAmount("");
            setNote("");
          }}
        >
          <ArrowUpCircle className="w-3.5 h-3.5 mr-1" />
          Top up
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-[11px] rounded-sm border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400"
          onClick={() => {
            setAction("deduct");
            setAmount("");
            setNote("");
          }}
        >
          <ArrowDownCircle className="w-3.5 h-3.5 mr-1" />
          Deduct
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ManageAdminWallet() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>("doctors");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [panelAction, setPanelAction] = useState<PanelAction>(null);
  const [selectedWallet, setSelectedWallet] = useState<DoctorWallet | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [deletingWallet, setDeletingWallet] = useState<DoctorWallet | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Mutations needed at page level for isMutating prop ──────────────────────
  const topUpMutation = useTopUpDoctorWallet();
  const deductMutation = useDeductDoctorWallet();
  const refundMutation = useRefundPayout();
  const deleteMutation = useDeleteDoctorWallet();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: walletsData, isLoading: walletsLoading, isError: walletsError } =
    useGetDoctorWallets(search || undefined, page);
  const { data: mainWallet, isLoading: mainLoading } = useGetMainWallet();
  const { data: payoutsData, isLoading: payoutsLoading, isError: payoutsError } =
    useGetPayouts(undefined, undefined, activeTab === "payouts" ? page : 1);
  const { data: transactionsData, isLoading: txLoading, isError: txError } =
    useGetTransactions(undefined, undefined, activeTab === "transactions" ? page : 1);

  const wallets      = walletsData?.data      ?? [];
  const payouts      = payoutsData?.data      ?? [];
  const transactions = transactionsData?.data ?? [];

  const total =
    activeTab === "doctors"      ? (walletsData?.total      ?? 0)
    : activeTab === "payouts"    ? (payoutsData?.total      ?? 0)
    : activeTab === "transactions" ? (transactionsData?.total ?? 0)
    : 0;

  const perPage =
    activeTab === "doctors"        ? (walletsData?.per_page      ?? 20)
    : activeTab === "payouts"      ? (payoutsData?.per_page      ?? 20)
    : activeTab === "transactions" ? (transactionsData?.per_page ?? 20)
    : 20;

  const totalPages = Math.ceil(total / perPage);

  const totalBalance    = wallets.reduce((sum, w) => sum + parseFloat(w.balance || "0"), 0);
  const pendingPayouts  = payouts.filter((p) => p.status === "pending").length;
  const completedPayouts = payouts.filter((p) => p.status === "completed").length;

  const openTopUp = useCallback((wallet: DoctorWallet) => {
    setSelectedWallet(wallet);
    setPanelAction("topup");
  }, []);

  const openDeduct = useCallback((wallet: DoctorWallet) => {
    setSelectedWallet(wallet);
    setPanelAction("deduct");
  }, []);

  const openPayout = useCallback(() => {
    setSelectedWallet(null);
    setPanelAction("payout");
  }, []);

  const openRefund = useCallback((payout: Payout) => {
    setSelectedPayout(payout);
    setPanelAction("refund");
  }, []);

  const closePanel = useCallback(() => {
    setPanelAction(null);
    setSelectedWallet(null);
    setSelectedPayout(null);
  }, []);

  const requestDelete = useCallback((wallet: DoctorWallet) => {
    setDeletingWallet(wallet);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingWallet) return;
    setDeletingId(deletingWallet.id);
    try {
      await deleteMutation.mutateAsync(deletingWallet.id);
      toast({ title: "Wallet deleted." });
    } catch (error) {
      toast({ title: getErrorMessage(error), variant: "destructive" });
    } finally {
      setDeletingId(null);
      setDeletingWallet(null);
    }
  }, [deletingWallet, deleteMutation, toast]);

  const isLoading =
    (activeTab === "doctors"       && walletsLoading) ||
    (activeTab === "payouts"       && payoutsLoading) ||
    (activeTab === "transactions"  && txLoading)      ||
    (activeTab === "main"          && mainLoading);

  const isError =
    (activeTab === "doctors"       && walletsError)  ||
    (activeTab === "payouts"       && payoutsError)  ||
    (activeTab === "transactions"  && txError);

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "doctors",      label: "Doctor Wallets", icon: Wallet       },
    { key: "payouts",      label: "Payouts",        icon: Send         },
    { key: "transactions", label: "Transactions",   icon: ArrowRightLeft },
    { key: "main",         label: "Main Wallet",    icon: Landmark     },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.admin.wallet_title")}
          subtitle={t("pages.admin.wallet_sub")}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <StatCard label="Total doctors"    value={walletsData?.total ?? 0}       icon={User}        accent="primary" />
            <StatCard label="Total balance"    value={formatCurrency(totalBalance)}  icon={CreditCard}  accent="success" />
            <StatCard label="Pending payouts"  value={pendingPayouts}                icon={Clock}       accent="warning" />
            <StatCard label="Completed payouts" value={completedPayouts}             icon={CheckCircle2} accent="info"  />
          </div>

          {/* Tabs */}
          <div className="px-3 sm:px-4 mt-3 sm:mt-4">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/40 border border-border/40">
              {tabs.map((tab) => {
                const Icon   = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setPage(1); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 h-8 text-[11px] font-medium rounded-md transition-all duration-200",
                      active
                        ? "bg-card text-foreground shadow-sm border border-border/40"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meta bar */}
          <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <p className="text-[11px] text-muted-foreground shrink-0">
              {isLoading ? (
                <span className="text-muted-foreground/50">Loading…</span>
              ) : (
                <>
                  <span className="font-bold text-foreground">{total}</span>{" "}
                  {total === 1
                    ? activeTab === "doctors" ? "wallet" : activeTab === "payouts" ? "payout" : "transaction"
                    : activeTab === "doctors" ? "wallets" : activeTab === "payouts" ? "payouts" : "transactions"}
                </>
              )}
            </p>

            <div className="flex items-center gap-2 shrink-0">
              {activeTab === "doctors" && (
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search doctor..."
                    className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {activeTab === "payouts" && (
                <Button
                  size="sm"
                  className="h-8 px-3 text-[11px] rounded-sm gap-1.5"
                  onClick={openPayout}
                >
                  <Plus className="w-3.5 h-3.5" />
                  New payout
                </Button>
              )}
            </div>
          </div>

          {/* Mobile search */}
          {activeTab === "doctors" && (
            <div className="sm:hidden px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search doctor..."
                  className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-3 sm:p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <p className="text-[12px] font-semibold text-destructive">Failed to load data</p>
                <p className="text-[11px] text-muted-foreground/70">Check your connection and try again</p>
              </div>
            ) : !isLoading && total === 0 && activeTab !== "main" ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-sm bg-muted/60 flex items-center justify-center border border-border/40">
                  <Wallet className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {activeTab === "doctors"
                      ? "No doctor wallets yet"
                      : activeTab === "payouts"
                      ? "No payouts yet"
                      : "No transactions yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {activeTab === "doctors"
                      ? "Doctor wallets will appear here"
                      : activeTab === "payouts"
                      ? "Create your first payout"
                      : "Transactions will appear here"}
                  </p>
                </div>
                {activeTab === "payouts" && (
                  <Button
                    size="sm"
                    className="mt-1 h-8 px-4 text-[11px] rounded-sm gap-1.5"
                    onClick={openPayout}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New payout
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Main Wallet Tab */}
                {activeTab === "main" && (
                  <MainWalletCard
                    mainWallet={mainWallet}
                    onTopUp={() => {}}
                    onDeduct={() => {}}
                  />
                )}

                {/* Doctor Wallets Table */}
                {activeTab === "doctors" && (
                  <>
                    <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                      <table className="w-full text-[11px]">
                        <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold">Doctor</th>
                            <th className="text-left px-4 py-3 font-semibold">Balance</th>
                            <th className="text-left px-4 py-3 font-semibold">Currency</th>
                            <th className="text-left px-4 py-3 font-semibold">Updated</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {walletsLoading ? (
                            <SkeletonRows cols={5} />
                          ) : (
                            wallets.map((wallet) => (
                              <DoctorWalletRow
                                key={wallet.id}
                                wallet={wallet}
                                onTopUp={openTopUp}
                                onDeduct={openDeduct}
                                onDelete={requestDelete}
                                isMutating={
                                  topUpMutation.isPending ||
                                  deductMutation.isPending ||
                                  deleteMutation.isPending
                                }
                              />
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden flex flex-col gap-2">
                      {walletsLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-20 rounded-sm border border-border/60 bg-card animate-pulse" />
                          ))
                        : wallets.map((wallet) => (
                            <DoctorWalletCard
                              key={wallet.id}
                              wallet={wallet}
                              onTopUp={openTopUp}
                              onDeduct={openDeduct}
                              onDelete={requestDelete}
                              isMutating={
                                topUpMutation.isPending ||
                                deductMutation.isPending ||
                                deleteMutation.isPending
                              }
                            />
                          ))}
                    </div>
                  </>
                )}

                {/* Payouts Table */}
                {activeTab === "payouts" && (
                  <>
                    <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                      <table className="w-full text-[11px]">
                        <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold">Doctor</th>
                            <th className="text-left px-4 py-3 font-semibold">Amount</th>
                            <th className="text-left px-4 py-3 font-semibold">Status</th>
                            <th className="text-left px-4 py-3 font-semibold">Method</th>
                            <th className="text-left px-4 py-3 font-semibold">Reference</th>
                            <th className="text-left px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {payoutsLoading ? (
                            <SkeletonRows cols={7} />
                          ) : (
                            payouts.map((payout) => (
                              <PayoutRow
                                key={payout.id}
                                payout={payout}
                                onRefund={openRefund}
                                isMutating={refundMutation.isPending}
                              />
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden flex flex-col gap-2">
                      {payoutsLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-20 rounded-sm border border-border/60 bg-card animate-pulse" />
                          ))
                        : payouts.map((payout) => (
                            <PayoutCard
                              key={payout.id}
                              payout={payout}
                              onRefund={openRefund}
                              isMutating={refundMutation.isPending}
                            />
                          ))}
                    </div>
                  </>
                )}

                {/* Transactions Table */}
                {activeTab === "transactions" && (
                  <>
                    <div className="hidden md:block rounded-sm border border-border/70 bg-card overflow-hidden shadow-sm">
                      <table className="w-full text-[11px]">
                        <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold">ID</th>
                            <th className="text-left px-4 py-3 font-semibold">Type</th>
                            <th className="text-left px-4 py-3 font-semibold">Amount</th>
                            <th className="text-left px-4 py-3 font-semibold">Balance After</th>
                            <th className="text-left px-4 py-3 font-semibold">Description</th>
                            <th className="text-left px-4 py-3 font-semibold">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txLoading ? (
                            <SkeletonRows cols={6} />
                          ) : (
                            transactions.map((tx) => (
                              <TransactionRow key={tx.id} tx={tx} />
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden flex flex-col gap-2">
                      {txLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-20 rounded-sm border border-border/60 bg-card animate-pulse" />
                          ))
                        : transactions.map((tx) => (
                            <TransactionCard key={tx.id} tx={tx} />
                          ))}
                    </div>
                  </>
                )}

                {/* Pagination */}
                {totalPages > 1 && activeTab !== "main" && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                    <p className="text-[11px] text-muted-foreground">
                      Page <span className="font-semibold text-foreground">{page}</span>{" "}of{" "}
                      <span className="font-semibold text-foreground">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="p-1.5 rounded-sm border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <ActionPanel
        action={panelAction}
        wallet={selectedWallet}
        payout={selectedPayout}
        onClose={closePanel}
      />

      <DeleteDialog
        wallet={deletingWallet}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingWallet(null)}
        isDeleting={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}

export default ManageAdminWallet;
