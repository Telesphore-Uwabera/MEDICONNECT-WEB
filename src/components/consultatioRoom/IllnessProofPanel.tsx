import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, FileText, Loader2, Paperclip, Send, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import echo from "@/lib/echo";
import { useMe } from "@/hooks/useAuth";
import {
  proofBelongsToTarget,
  resolveProofFileUrl,
  useDeleteIllnessProof,
  useDoctorIllnessProof,
  usePatientIllnessProofDetail,
  usePatientIllnessProofs,
  useSubmitIllnessProof,
  type IllnessProof,
  type IllnessProofFile,
} from "@/hooks/use-illness-proofs";

interface Props {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  appointmentId?: number | null;
  instantConsultationId?: number | null;
  doctorId?: number | null;
  proofSignal?: { id: number; nonce: number } | null;
  onUnreadChange?: (count: number) => void;
  onSubmitted?: (proof: IllnessProof) => void;
}

const fmtDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const proofIdFromEvent = (payload: unknown) => {
  const data = (payload as any)?.data ?? payload;
  const candidates = [data?.id, data?.illness_proof_id, data?.proof_id, data?.illnessProof?.id];
  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
};

const proofFromEvent = (payload: unknown): IllnessProof | null => {
  const data = (payload as any)?.data ?? payload;
  if (data?.id && data?.text) return data as IllnessProof;
  if (data?.illnessProof?.id) return data.illnessProof as IllnessProof;
  return null;
};

const isImageFile = (file: IllnessProofFile) => {
  const value = `${file.url ?? ""} ${file.file_path ?? ""}`.toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(value) || value.startsWith("data:image/");
};

export function IllnessProofPanel({
  open,
  onClose,
  isOwner,
  appointmentId,
  instantConsultationId,
  doctorId,
  proofSignal,
  onUnreadChange,
  onSubmitted,
}: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [doctorProofs, setDoctorProofs] = useState<IllnessProof[]>([]);
  const [patientProofDetails, setPatientProofDetails] = useState<Record<number, IllnessProof>>({});
  const patientDetailFetchIds = useRef<Set<number>>(new Set());
  const [unread, setUnread] = useState(0);

  const target = useMemo(() => ({ appointmentId, instantConsultationId }), [appointmentId, instantConsultationId]);
  const patientProofs = usePatientIllnessProofs(!isOwner);
  const submitProof = useSubmitIllnessProof();
  const deleteProof = useDeleteIllnessProof();
  const fetchDoctorProof = useDoctorIllnessProof();
  const fetchPatientProof = usePatientIllnessProofDetail();
  const { data: me } = useMe();

  const doctorChannelIds = useMemo(() => {
    if (!isOwner) return [];
    const source = me as any;
    const candidates = [
      doctorId,
      source?.doctor_id,
      source?.doctorId,
      source?.doctor?.id,
      source?.doctor?.doctor_id,
      source?.profile?.id,
      source?.id,
    ];
    return Array.from(
      new Set(
        candidates
          .map((candidate) => Number(candidate))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    );
  }, [doctorId, isOwner, me]);

  const rawVisiblePatientProofs = useMemo(
    () => (patientProofs.data ?? []).filter((proof) => proofBelongsToTarget(proof, target)),
    [patientProofs.data, target],
  );
  const visiblePatientProofs = useMemo(
    () => rawVisiblePatientProofs.map((proof) => patientProofDetails[proof.id] ?? proof),
    [patientProofDetails, rawVisiblePatientProofs],
  );
  const visibleProofs = isOwner ? doctorProofs : visiblePatientProofs;

  const upsertPatientProofDetail = useCallback((proof: IllnessProof) => {
    const id = Number(proof.id);
    if (!Number.isFinite(id) || id <= 0) return;
    setPatientProofDetails((prev) => ({ ...prev, [id]: proof }));
  }, []);

  const upsertDoctorProof = useCallback((proof: IllnessProof, notify = true) => {
    if (!proofBelongsToTarget(proof, target)) return;
    let isNew = false;
    setDoctorProofs((prev) => {
      isNew = !prev.some((item) => item.id === proof.id);
      const without = prev.filter((item) => item.id !== proof.id);
      return [proof, ...without];
    });
    if (isNew && !open) {
      setUnread((count) => {
        const next = count + 1;
        onUnreadChange?.(next);
        return next;
      });
    }
    if (isNew && notify) toast.info(t("consult.proofs.doctor_new", "Patient submitted illness proof."));
  }, [onUnreadChange, open, t, target]);

  useEffect(() => {
    if (!open) return;
    setUnread(0);
    onUnreadChange?.(0);
  }, [onUnreadChange, open]);

  useEffect(() => {
    if (isOwner) return;
    rawVisiblePatientProofs.forEach((proof) => {
      const id = Number(proof.id);
      if (!Number.isFinite(id) || id <= 0) return;
      if (patientProofDetails[id] || patientDetailFetchIds.current.has(id)) return;
      patientDetailFetchIds.current.add(id);
      fetchPatientProof.mutate(id, {
        onSuccess: upsertPatientProofDetail,
        onError: () => patientDetailFetchIds.current.delete(id),
      });
    });
  }, [fetchPatientProof, isOwner, patientProofDetails, rawVisiblePatientProofs, upsertPatientProofDetail]);

  useEffect(() => {
    if (!isOwner || doctorChannelIds.length === 0) return;

    if (echo.connector?.options?.auth?.headers) {
      echo.connector.options.auth.headers.Authorization = `Bearer ${localStorage.getItem("auth_token")}`;
    }

    const fetchProof = (id: number, direct?: IllnessProof | null) => {
      fetchDoctorProof.mutate(id, {
        onSuccess: upsertDoctorProof,
        onError: () => {
          if (direct) upsertDoctorProof(direct);
        },
      });
    };

    const handleSubmitted = (payload: unknown) => {
      const direct = proofFromEvent(payload);
      const id = proofIdFromEvent(payload) ?? direct?.id;
      if (id) {
        fetchProof(id, direct);
        return;
      }
      if (direct) upsertDoctorProof(direct);
    };

    const handleDeleted = (payload: unknown) => {
      const id = proofIdFromEvent(payload);
      if (!id) return;
      setDoctorProofs((prev) => prev.filter((proof) => proof.id !== id));
    };

    const channels = doctorChannelIds.map((id) => {
      const channelName = `doctor.${id}.illness-proofs`;
      const channel = echo.private(channelName);
      channel.listen(".illness-proof.submitted", handleSubmitted);
      channel.listen("illness-proof.submitted", handleSubmitted);
      channel.listen(".illness-proof.deleted", handleDeleted);
      channel.listen("illness-proof.deleted", handleDeleted);
      return { channel, channelName };
    });

    return () => {
      channels.forEach(({ channel, channelName }) => {
        channel.stopListening(".illness-proof.submitted");
        channel.stopListening("illness-proof.submitted");
        channel.stopListening(".illness-proof.deleted");
        channel.stopListening("illness-proof.deleted");
        echo.leave(channelName);
        echo.leaveChannel(`private-${channelName}`);
      });
    };
  }, [doctorChannelIds, fetchDoctorProof, isOwner, upsertDoctorProof]);

  useEffect(() => {
    if (!isOwner || !proofSignal?.id) return;
    fetchDoctorProof.mutate(proofSignal.id, { onSuccess: upsertDoctorProof });
  }, [isOwner, proofSignal?.nonce]);

  const submit = () => {
    if (!text.trim()) {
      toast.error(t("consult.proofs.text_required", "Describe the proof before sending."));
      return;
    }
    if (files.length === 0) {
      toast.error(t("consult.proofs.files_required", "Attach at least one file."));
      return;
    }
    if (appointmentId == null && instantConsultationId == null) {
      toast.error(t("consult.proofs.target_missing", "Could not identify this consultation."));
      return;
    }

    submitProof.mutate(
      {
        appointment_id: appointmentId ?? null,
        instant_consultation_id: appointmentId == null ? instantConsultationId ?? null : null,
        text: text.trim(),
        files,
      },
      {
        onSuccess: (proof) => {
          toast.success(t("consult.proofs.sent", "Illness proof sent."));
          const id = Number(proof.id);
          if (Number.isFinite(id) && id > 0) {
            patientDetailFetchIds.current.add(id);
            fetchPatientProof.mutate(id, { onSuccess: upsertPatientProofDetail });
          }
          onSubmitted?.(proof);
          setText("");
          setFiles([]);
        },
        onError: (err) => toast.error(err.message || t("consult.proofs.send_failed", "Could not send illness proof.")),
      },
    );
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <div
      className={cn(
        "absolute top-0 right-0 h-full w-full flex flex-col z-20",
        "bg-[#1a1a1a]/95 backdrop-blur-sm border-l border-white/10",
        "transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5 text-white/50" />
          <span className="text-[12px] font-semibold text-white/80">
            {t("consult.proofs.title", "Illness proofs")}
          </span>
          {unread > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">{unread}</span>}
        </div>
        <button onClick={onClose} className="h-6 w-6 rounded-full flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white/80 transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {!isOwner && (
          <div className="rounded-[6px] border border-white/10 bg-white/[0.04] p-3 space-y-3">
            <p className="text-[11px] leading-relaxed text-white/45">
              {t("consult.proofs.patient_hint", "Send lab results, images, PDFs, or documents the doctor should see during this call.")}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={t("consult.proofs.text_placeholder", "Describe what you are attaching...")}
              className="w-full resize-none rounded-[6px] border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-white/80 outline-none placeholder:text-white/25 focus:border-primary/50"
            />
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-dashed border-white/15 bg-black/20 px-3 py-3 text-[11px] font-medium text-white/55 transition-colors hover:border-primary/40 hover:text-white/80">
              <Upload className="h-3.5 w-3.5" />
              {t("consult.proofs.choose_files", "Choose proof files")}
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
            </label>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-[5px] bg-white/[0.05] px-2 py-1.5 text-[10px] text-white/65">
                    <FileText className="h-3 w-3 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <button type="button" onClick={() => removeFile(index)} className="text-white/35 hover:text-red-300">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={submit}
              disabled={submitProof.isPending}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {submitProof.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {t("consult.proofs.send", "Send proof")}
            </button>
          </div>
        )}

        {isOwner && (
          <div className="rounded-[6px] border border-primary/20 bg-primary/8 p-3 text-[11px] leading-relaxed text-white/55">
            {t("consult.proofs.doctor_hint", "Proofs sent by the patient during this session will appear here immediately.")}
          </div>
        )}

        {isOwner && fetchDoctorProof.isPending && (
          <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-white/35">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("consult.proofs.loading_new", "Loading proof...")}
          </div>
        )}
        {!isOwner && patientProofs.isLoading && (
          <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-white/35">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("consult.proofs.loading", "Loading proofs...")}
          </div>
        )}
        {!patientProofs.isLoading && visibleProofs.length === 0 && !fetchDoctorProof.isPending && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[6px] border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
            <Paperclip className="h-6 w-6 text-white/20" />
            <p className="text-[11px] text-white/35">
              {isOwner
                ? t("consult.proofs.empty_doctor", "No proof has been submitted for this session yet.")
                : t("consult.proofs.empty_patient", "No proof sent for this session yet.")}
            </p>
          </div>
        )}

        {visibleProofs.map((proof) => (
          <ProofCard
            key={proof.id}
            proof={proof}
            isOwner={isOwner}
            deleting={deleteProof.isPending && deleteProof.variables === proof.id}
            onDelete={() => deleteProof.mutate(proof.id, {
              onSuccess: () => toast.success(t("consult.proofs.deleted", "Illness proof deleted.")),
              onError: (err) => toast.error(err.message || t("consult.proofs.delete_failed", "Could not delete proof.")),
            })}
          />
        ))}
      </div>
    </div>
  );
}

function ProofCard({
  proof,
  isOwner,
  deleting,
  onDelete,
}: {
  proof: IllnessProof;
  isOwner: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const files = proof.files ?? [];

  return (
    <div className="rounded-[6px] border border-white/10 bg-white/[0.04] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-white/80">{proof.text}</p>
          {proof.created_at && <p className="mt-1 text-[9px] text-white/30">{fmtDate(proof.created_at)}</p>}
        </div>
        {!isOwner && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-[5px] p-1 text-white/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60"
            title={t("common.delete", "Delete")}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const url = resolveProofFileUrl(file);
            const label = file.file_path || file.url || `File #${file.id}`;
            const image = isImageFile(file);
            return (
              <div key={file.id} className="space-y-1.5">
                {url && image && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[6px] border border-white/10 bg-black/25">
                    <img src={url} alt="" className="max-h-44 w-full object-contain" />
                  </a>
                )}
                <a
                  href={url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 rounded-[5px] border border-white/10 bg-black/20 px-2 py-2 text-[10px] text-white/60 transition-colors",
                    url ? "hover:border-primary/40 hover:text-white/85" : "pointer-events-none opacity-50",
                  )}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
