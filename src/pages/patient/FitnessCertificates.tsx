// import React, { useState, useEffect, useCallback } from "react";
// import { useTranslation } from "react-i18next";
// import { useForm } from "react-hook-form";
// import { DashboardLayout } from "@/components/DashboardLayout";
// import { PageHeader } from "@/components/PageHeader";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { cn } from "@/lib/utils";
// import { toast } from "sonner";
// import {
//   FilePlus2,
//   ClipboardList,
//   User,
//   Briefcase,
//   Activity,
//   Check,
//   AlertTriangle,
//   Clock,
//   Download,
//   Eye,
//   QrCode,
//   ShieldCheck,
//   ChevronRight,
//   FileText,
//   XCircle,
//   Loader2,
//   RefreshCw,
// } from "lucide-react";

// import {
//   useGetPatientCertificates,
//   useGetCurrentRequest,
//   useGetStepData,
//   useSaveStep,
//   useSubmitCertificate,
//   useDownloadCertificate,
//   type Certificate,
//   type CertStatus,
//   type Step1Payload,
//   type StepAnswersPayload,
// } from "@/hooks/patient/use-patient-certificates";

// // ─────────────────────────────────────────────────────────────────────────────
// // Constants
// // ─────────────────────────────────────────────────────────────────────────────

// const PURPOSES = [
//   { value: "general_fitness", label: "General fitness" },
//   { value: "school_work", label: "School/work fitness" },
//   { value: "return_to_work", label: "Return to work after illness" },
//   { value: "fitness_for_travel", label: "Fitness for travel" },
//   { value: "other", label: "Other" },
// ];

// const JOB_TYPES = [
//   "None of the above",
//   "Heavy physical labor",
//   "Driving/operating machinery",
//   "Armed forces/security",
//   "Mining/construction",
//   "Work requiring chest X-ray",
// ];

// const YES_NO = ["Yes", "No"];

// const FORM_STEPS = [
//   {
//     id: "purpose",
//     label: "Purpose",
//     icon: FileText,
//     description: "Certificate type & job",
//     apiStep: 1,
//   },
//   {
//     id: "symptoms",
//     label: "Symptoms",
//     icon: Activity,
//     description: "Current health symptoms",
//     apiStep: 2,
//   },
//   {
//     id: "history",
//     label: "Medical History",
//     icon: ClipboardList,
//     description: "Past illnesses & conditions",
//     apiStep: 3,
//   },
//   {
//     id: "functional",
//     label: "Functional",
//     icon: User,
//     description: "Daily ability & vitals",
//     apiStep: 4,
//   },
// ];

// // ─────────────────────────────────────────────────────────────────────────────
// // Helpers
// // ─────────────────────────────────────────────────────────────────────────────

// const fmtDate = (d: string) =>
//   new Date(d).toLocaleDateString("en-US", {
//     year: "numeric",
//     month: "short",
//     day: "numeric",
//   });

// const purposeLabel = (value: string) =>
//   PURPOSES.find((p) => p.value === value)?.label ?? value;

// const STATUS_META: Record<
//   CertStatus,
//   { label: string; color: string; icon: React.ElementType }
// > = {
//   draft: {
//     label: "Draft",
//     color: "bg-muted text-muted-foreground border-border",
//     icon: FileText,
//   },
//   pending: {
//     label: "Pending",
//     color: "bg-amber-500/15 text-amber-600 border-amber-400/30",
//     icon: Clock,
//   },
//   in_review: {
//     label: "In Review",
//     color: "bg-blue-500/15 text-blue-600 border-blue-400/30",
//     icon: Eye,
//   },
//   approved: {
//     label: "Approved",
//     color: "bg-emerald-500/15 text-emerald-600 border-emerald-400/30",
//     icon: ShieldCheck,
//   },
//   rejected: {
//     label: "Rejected",
//     color: "bg-destructive/15 text-destructive border-destructive/25",
//     icon: XCircle,
//   },
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Shared sub-components
// // ─────────────────────────────────────────────────────────────────────────────

// function FormField({
//   label,
//   error,
//   children,
//   className = "",
//   hint,
// }: {
//   label: string;
//   error?: string;
//   children: React.ReactNode;
//   className?: string;
//   hint?: string;
// }) {
//   return (
//     <div className={`flex flex-col gap-1.5 ${className}`}>
//       <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
//         {label}
//       </Label>
//       {children}
//       {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
//       {error && <p className="text-[10px] text-destructive">{error}</p>}
//     </div>
//   );
// }

// function YesNoField({
//   label,
//   value,
//   onChange,
//   warning,
// }: {
//   label: string;
//   value: string;
//   onChange: (v: string) => void;
//   warning?: boolean;
// }) {
//   return (
//     <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0 gap-3">
//       <span className="text-xs text-foreground leading-snug">{label}</span>
//       <div className="flex gap-1.5 shrink-0">
//         {YES_NO.map((opt) => (
//           <button
//             key={opt}
//             type="button"
//             onClick={() => onChange(opt)}
//             className={cn(
//               "px-3 py-1 rounded text-[11px] font-medium border transition-all",
//               value === opt
//                 ? opt === "Yes" && warning
//                   ? "bg-destructive text-destructive-foreground border-destructive"
//                   : opt === "Yes"
//                     ? "bg-primary text-primary-foreground border-primary"
//                     : "bg-muted text-foreground border-border"
//                 : "bg-transparent text-muted-foreground border-border hover:bg-muted",
//             )}
//           >
//             {opt}
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Sidebar
// // ─────────────────────────────────────────────────────────────────────────────

// function FormSidebar({
//   currentStep,
//   serverStep,
//   visited,
//   onSelect,
// }: {
//   currentStep: number;
//   serverStep: number;
//   visited: Set<number>;
//   onSelect: (i: number) => void;
// }) {
//   const visitedCount = visited.size;
//   const pct = Math.round((visitedCount / FORM_STEPS.length) * 100);

//   return (
//     <div className="w-full sm:w-52 shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-border bg-card/50">
//       <div className="px-4 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
//         <div className="space-y-2.5">
//           <div className="flex items-center justify-between">
//             <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
//               Certificate request
//             </span>
//             <span className="text-[11px] font-bold tabular-nums text-primary">
//               {pct}%
//             </span>
//           </div>
//           <div className="h-1.5 rounded-full bg-muted overflow-hidden">
//             <div
//               className="h-full rounded-full bg-primary transition-all duration-500"
//               style={{ width: `${pct}%` }}
//             />
//           </div>
//           <p className="text-[10px] text-muted-foreground">
//             {visitedCount} of {FORM_STEPS.length} sections visited
//           </p>
//         </div>
//       </div>

//       <div className="flex flex-row sm:flex-col gap-0.5 py-2 px-2.5 sm:py-3 sm:flex-1 overflow-x-auto sm:overflow-x-hidden overflow-y-hidden sm:overflow-y-auto">
//         {FORM_STEPS.map((step, i) => {
//           const Icon = step.icon;
//           const isActive = i === currentStep;
//           const isDone = step.apiStep <= serverStep && i !== currentStep;

//           return (
//             <button
//               key={step.id}
//               onClick={() => onSelect(i)}
//               className={cn(
//                 "flex shrink-0 sm:shrink sm:w-full items-center gap-2 sm:gap-2.5 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-md text-left transition-all duration-150",
//                 isActive
//                   ? "bg-primary/10 text-primary"
//                   : "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer",
//               )}
//             >
//               <div
//                 className={cn(
//                   "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all border text-[10px] font-semibold",
//                   isActive
//                     ? "bg-primary border-primary text-primary-foreground"
//                     : isDone
//                       ? "bg-primary/20 border-primary/40 text-primary"
//                       : "bg-muted border-border text-muted-foreground",
//                 )}
//               >
//                 {isDone ? (
//                   <Check className="h-3 w-3" />
//                 ) : (
//                   <Icon className="h-3 w-3" />
//                 )}
//               </div>

//               <div className="flex-1 min-w-0 hidden sm:block">
//                 <div className="flex items-center justify-between gap-1">
//                   <span
//                     className={cn(
//                       "text-xs font-medium leading-tight truncate",
//                       isActive ? "text-primary" : "",
//                     )}
//                   >
//                     {step.label}
//                   </span>
//                   {isActive && (
//                     <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary shrink-0">
//                       editing
//                     </span>
//                   )}
//                   {isDone && (
//                     <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wide text-primary/60 shrink-0">
//                       done
//                     </span>
//                   )}
//                 </div>
//                 <p className="hidden sm:block text-[10px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
//                   {step.description}
//                 </p>
//                 <div className="hidden sm:block h-0.5 rounded-full bg-muted overflow-hidden mt-1.5">
//                   <div
//                     className={cn(
//                       "h-full rounded-full transition-all duration-500",
//                       isActive
//                         ? "bg-primary w-1/2"
//                         : isDone
//                           ? "bg-primary w-full"
//                           : "bg-transparent w-0",
//                     )}
//                   />
//                 </div>
//               </div>
//             </button>
//           );
//         })}
//       </div>

//       <div className="hidden sm:block px-3.5 py-3 border-t border-border">
//         <p className="text-[10px] text-muted-foreground leading-relaxed">
//           Jump between sections freely — no order needed.
//         </p>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Step 1 — Purpose
// // FIX: register "purpose" and "job_type" explicitly so react-hook-form
// //      tracks the values set via setValue from the <Select> onValueChange.
// //      Without register(), handleSubmit sees undefined for both fields.
// // ─────────────────────────────────────────────────────────────────────────────

// interface Step1Fields {
//   purpose: string;
//   purpose_other?: string;
//   job_type: string;
// }

// function StepPurpose({
//   initialData,
//   onSaved,
// }: {
//   initialData?: Partial<Step1Fields>;
//   onSaved: (nextStep: number) => void;
// }) {
//   const saveStep = useSaveStep();
//   const {
//     register,
//     handleSubmit,
//     setValue,
//     watch,
//     formState: { errors },
//   } = useForm<Step1Fields>({
//     defaultValues: {
//       purpose: initialData?.purpose ?? "",
//       purpose_other: initialData?.purpose_other ?? "",
//       job_type: initialData?.job_type ?? "",
//     },
//   });

//   // Register the Select-driven fields so handleSubmit can read them
//   useEffect(() => {
//     register("purpose", { required: "Purpose is required" });
//     register("job_type", { required: "Job type is required" });
//   }, [register]);

//   const watchedPurpose = watch("purpose");
//   const watchedJobType = watch("job_type");
//   const highRiskJob = watchedJobType && watchedJobType !== "None of the above";

//   const onSubmit = (data: Step1Fields) => {
//     const payload: Step1Payload = {
//       purpose: data.purpose,
//       purpose_other: data.purpose === "other" ? (data.purpose_other ?? null) : null,
//       job_type: data.job_type,
//     };
//     saveStep.mutate(
//       { step: 1, payload },
//       {
//         onSuccess: (res) => {
//           toast.success("Step 1 saved");
//           onSaved(1);
//         },
//         onError: (err) => toast.error(err.message || "Failed to save step 1"),
//       },
//     );
//   };

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//       <FormField label="Certificate purpose" error={errors.purpose?.message}>
//         <Select
//           defaultValue={initialData?.purpose}
//           onValueChange={(v) => setValue("purpose", v, { shouldValidate: true })}
//         >
//           <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
//             <SelectValue placeholder="Select purpose" />
//           </SelectTrigger>
//           <SelectContent>
//             {PURPOSES.map((p) => (
//               <SelectItem key={p.value} value={p.value}>
//                 {p.label}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </FormField>

//       {watchedPurpose === "other" && (
//         <FormField label="Please specify" error={errors.purpose_other?.message}>
//           <Input
//             {...register("purpose_other", { required: "Required" })}
//             placeholder="Describe the purpose"
//             className="border-border focus-visible:ring-primary text-xs h-9"
//           />
//         </FormField>
//       )}

//       <FormField label="Job / activity type" error={errors.job_type?.message}>
//         <Select
//           defaultValue={initialData?.job_type}
//           onValueChange={(v) => setValue("job_type", v, { shouldValidate: true })}
//         >
//           <SelectTrigger className="border-border focus:ring-primary text-xs h-9">
//             <SelectValue placeholder="Select job type" />
//           </SelectTrigger>
//           <SelectContent>
//             {JOB_TYPES.map((j) => (
//               <SelectItem key={j} value={j}>
//                 {j}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//       </FormField>

//       {highRiskJob && (
//         <div className="flex items-start gap-2.5 p-3 rounded-md border border-amber-400/40 bg-amber-500/10">
//           <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
//           <p className="text-xs text-amber-700 dark:text-amber-400">
//             This job type typically requires an{" "}
//             <strong>in-person physical examination</strong>. Your request will
//             be reviewed and you may be referred.
//           </p>
//         </div>
//       )}

//       <button type="submit" id="step-submit-btn" className="hidden" />
//     </form>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Steps 2 & 3 — Yes/No answer lists
// // ─────────────────────────────────────────────────────────────────────────────

// interface YesNoStepProps {
//   apiStep: 2 | 3;
//   fields: { label: string; field: string; warning?: boolean }[];
//   initialAnswers?: Record<string, string>;
//   headerNote?: React.ReactNode;
//   extraFields?: (
//     answers: Record<string, string>,
//     setAnswer: (k: string, v: string) => void,
//     register: any,
//   ) => React.ReactNode;
//   onSaved: (nextStep: number) => void;
// }

// function YesNoStep({
//   apiStep,
//   fields,
//   initialAnswers = {},
//   headerNote,
//   extraFields,
//   onSaved,
// }: YesNoStepProps) {
//   const saveStep = useSaveStep();
//   const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
//   const { register } = useForm();

//   const setAnswer = (k: string, v: string) =>
//     setAnswers((prev) => ({ ...prev, [k]: v }));

//   const redFlagSymptoms =
//     answers["shortness_breath"] === "Yes" ||
//     answers["chest_pain"] === "Yes" ||
//     answers["fainting"] === "Yes";

//   const handleSave = () => {
//     const payload: StepAnswersPayload = { answers };
//     saveStep.mutate(
//       { step: apiStep, payload },
//       {
//         onSuccess: () => {
//           toast.success(`Step ${apiStep} saved`);
//           onSaved(apiStep);
//         },
//         onError: (err) => toast.error(err.message || `Failed to save step ${apiStep}`),
//       },
//     );
//   };

//   return (
//     <div className="space-y-2">
//       {headerNote}
//       {fields.map(({ label, field, warning }) => (
//         <YesNoField
//           key={field}
//           label={label}
//           value={answers[field] ?? ""}
//           onChange={(v) => setAnswer(field, v)}
//           warning={warning}
//         />
//       ))}
//       {redFlagSymptoms && apiStep === 2 && (
//         <div className="flex items-start gap-2.5 p-3 rounded-md border border-destructive/30 bg-destructive/10 mt-3">
//           <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
//           <p className="text-xs text-destructive">
//             You have reported a <strong>red flag symptom</strong>. A physical
//             examination may be required. You can still submit and a doctor will
//             decide.
//           </p>
//         </div>
//       )}
//       {extraFields?.(answers, setAnswer, register)}
//       <button
//         id="step-submit-btn"
//         className="hidden"
//         onClick={handleSave}
//         type="button"
//       />
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Step 4 — Functional + Vitals
// // ─────────────────────────────────────────────────────────────────────────────

// interface Step4Fields {
//   temperature?: string;
//   blood_pressure?: string;
//   pulse?: string;
//   oxygen_saturation?: string;
//   notes?: string;
// }

// function StepFunctional({
//   initialAnswers = {},
//   initialVitals,
//   initialNotes,
//   onSaved,
// }: {
//   initialAnswers?: Record<string, string>;
//   initialVitals?: Step4Fields;
//   initialNotes?: string;
//   onSaved: (nextStep: number) => void;
// }) {
//   const saveStep = useSaveStep();
//   const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
//   const { register, handleSubmit } = useForm<Step4Fields>({
//     defaultValues: { ...initialVitals, notes: initialNotes },
//   });
//   const setAnswer = (k: string, v: string) =>
//     setAnswers((prev) => ({ ...prev, [k]: v }));

//   const onSubmit = (vitals: Step4Fields) => {
//     const payload: StepAnswersPayload = {
//       answers,
//       ...vitals,
//     };
//     saveStep.mutate(
//       { step: 4, payload },
//       {
//         onSuccess: () => {
//           toast.success("Step 4 saved");
//           onSaved(4);
//         },
//         onError: (err) => toast.error(err.message || "Failed to save step 4"),
//       },
//     );
//   };

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
//       <div>
//         <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
//           Daily functional ability
//         </p>
//         {[
//           { label: "Can you walk without difficulty?", field: "walk_ok" },
//           { label: "Can you climb stairs?", field: "climb_ok" },
//           { label: "Can you lift light objects without pain?", field: "lift_ok" },
//           { label: "Do you sleep well?", field: "sleep_ok" },
//           { label: "Do you have a normal appetite?", field: "appetite_ok" },
//         ].map(({ label, field }) => (
//           <YesNoField
//             key={field}
//             label={label}
//             value={answers[field] ?? ""}
//             onChange={(v) => setAnswer(field, v)}
//           />
//         ))}
//       </div>

//       <div>
//         <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
//           Vitals (optional — if home devices available)
//         </p>
//         <p className="text-[10px] text-muted-foreground mb-3">
//           If you have a thermometer, BP cuff, or pulse oximeter, enter readings
//           below.
//         </p>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//           {[
//             { label: "Temperature (°C)", field: "temperature", placeholder: "e.g. 36.6" },
//             { label: "Blood pressure", field: "blood_pressure", placeholder: "e.g. 120/80" },
//             { label: "Pulse (bpm)", field: "pulse", placeholder: "e.g. 72" },
//             { label: "O₂ saturation (%)", field: "oxygen_saturation", placeholder: "e.g. 98" },
//           ].map(({ label, field, placeholder }) => (
//             <FormField key={field} label={label}>
//               <Input
//                 {...register(field as keyof Step4Fields)}
//                 placeholder={placeholder}
//                 className="border-border focus-visible:ring-primary text-xs h-9"
//               />
//             </FormField>
//           ))}
//         </div>
//       </div>

//       <FormField label="Additional notes for the doctor (optional)">
//         <textarea
//           {...register("notes")}
//           rows={3}
//           placeholder="Any other relevant information.."
//           className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
//         />
//       </FormField>

//       <button type="submit" id="step-submit-btn" className="hidden" />
//     </form>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // RequestForm — orchestrates steps + API flow
// // ─────────────────────────────────────────────────────────────────────────────

// function RequestForm({ onSubmit: onDone }: { onSubmit: () => void }) {
//   const [currentStep, setCurrentStep] = useState(0);
//   const [visited, setVisited] = useState<Set<number>>(new Set([0]));
//   const [submitted, setSubmitted] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   const { data: requestData, isLoading: requestLoading } = useGetCurrentRequest();
//   const serverCurrentStep = requestData?.certificate?.current_step ?? 0;

//   const { data: stepData, isLoading: stepLoading } = useGetStepData(
//     FORM_STEPS[currentStep].apiStep,
//     !requestLoading,
//   );

//   const submitMutation = useSubmitCertificate();

//   useEffect(() => {
//     if (serverCurrentStep > 0) {
//       const newVisited = new Set<number>();
//       FORM_STEPS.forEach((s, i) => {
//         if (s.apiStep <= serverCurrentStep) newVisited.add(i);
//       });
//       setVisited(newVisited);
//       const nextIncomplete = FORM_STEPS.findIndex(
//         (s) => s.apiStep > serverCurrentStep,
//       );
//       if (nextIncomplete !== -1) setCurrentStep(nextIncomplete);
//     }
//   }, [serverCurrentStep]);

//   const isLast = currentStep === FORM_STEPS.length - 1;

//   const goTo = (i: number) => {
//     setVisited((v) => new Set([...v, i]));
//     setCurrentStep(i);
//   };

//   const triggerStepSave = () => {
//     const btn = document.getElementById("step-submit-btn");
//     if (btn) btn.click();
//   };

//   const handleStepSaved = useCallback(
//     (savedApiStep: number) => {
//       setIsSaving(false);
//       if (isLast) {
//         submitMutation.mutate(undefined, {
//           onSuccess: () => {
//             setSubmitted(true);
//             setTimeout(() => onDone(), 1200);
//           },
//           onError: (err) => {
//             toast.error(err.message || "Submission failed");
//           },
//         });
//       } else {
//         goTo(currentStep + 1);
//       }
//     },
//     [currentStep, isLast, submitMutation, onDone],
//   );

//   const handleNext = () => {
//     setIsSaving(true);
//     triggerStepSave();
//   };

//   if (requestLoading) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-10">
//         <div className="flex flex-col items-center gap-3 text-muted-foreground">
//           <Loader2 className="h-6 w-6 animate-spin" />
//           <p className="text-xs">Loading your request…</p>
//         </div>
//       </div>
//     );
//   }

//   if (submitted) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-6">
//         <div className="text-center space-y-3">
//           <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center mx-auto">
//             <Check className="h-7 w-7 text-emerald-600" />
//           </div>
//           <p className="text-sm font-semibold text-foreground">Request submitted!</p>
//           <p className="text-xs text-muted-foreground">
//             A doctor will review your request shortly.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   const step = FORM_STEPS[currentStep];

//   const stepContent = () => {
//     if (stepLoading) {
//       return (
//         <div className="flex items-center justify-center py-16">
//           <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
//         </div>
//       );
//     }

//     const savedAnswerMap: Record<string, string> = {};
//     if (stepData?.answers) {
//       stepData.answers.forEach((a) => {
//         savedAnswerMap[a.field] = a.value;
//       });
//     }

//     switch (step.id) {
//       case "purpose":
//         return (
//           <StepPurpose
//             key={currentStep}
//             initialData={{
//               purpose: stepData?.purpose,
//               purpose_other: stepData?.purpose_other ?? undefined,
//               job_type: stepData?.job_type,
//             }}
//             onSaved={handleStepSaved}
//           />
//         );

//       case "symptoms":
//         return (
//           <YesNoStep
//             key={currentStep}
//             apiStep={2}
//             initialAnswers={savedAnswerMap}
//             headerNote={
//               <p className="text-xs text-muted-foreground mb-3">
//                 Answer honestly about symptoms in the{" "}
//                 <strong>past 72 hours</strong>.
//               </p>
//             }
//             fields={[
//               { label: "Any fever in the past 72 hours?", field: "fever_72h" },
//               { label: "Any current headache or dizziness?", field: "headache_dizziness" },
//               { label: "Any shortness of breath?", field: "shortness_breath", warning: true },
//               { label: "Any chest pain?", field: "chest_pain", warning: true },
//               { label: "Any palpitations?", field: "palpitations" },
//               { label: "Any cough?", field: "cough" },
//               { label: "Any vomiting or diarrhea?", field: "vomiting" },
//               { label: "Any body weakness or fatigue?", field: "fatigue" },
//               { label: "Any visual disturbances?", field: "visual_disturbances" },
//               { label: "Any recent fainting episodes?", field: "fainting", warning: true },
//             ]}
//             onSaved={handleStepSaved}
//           />
//         );

//       case "history":
//         return (
//           <YesNoStep
//             key={currentStep}
//             apiStep={3}
//             initialAnswers={savedAnswerMap}
//             fields={[
//               { label: "Any chronic illnesses? (HTN, diabetes, asthma, epilepsy, heart disease)", field: "chronic_illness" },
//               { label: "Any hospitalization in the last 3 months?", field: "recent_hospitalization" },
//               { label: "Any surgery in the last 6 months?", field: "recent_surgery" },
//               { label: "Any psychiatric conditions?", field: "psychiatric" },
//               { label: "Any known allergies (drug/food)?", field: "allergies" },
//               { label: "Any chronic medication currently used?", field: "chronic_medication" },
//               { label: "Any disability or mobility limitations?", field: "disability" },
//             ]}
//             extraFields={(answers, setAnswer, register) => (
//               <div className="mt-3 space-y-3">
//                 {answers["chronic_illness"] === "Yes" && (
//                   <FormField label="Please specify condition(s)">
//                     <Input
//                       {...register("chronic_illness_detail")}
//                       placeholder="e.g. Hypertension, Diabetes Type 2"
//                       className="border-border focus-visible:ring-primary text-xs h-9"
//                     />
//                   </FormField>
//                 )}
//                 {answers["chronic_medication"] === "Yes" && (
//                   <FormField label="Please list medications">
//                     <Input
//                       {...register("medication_detail")}
//                       placeholder="e.g. Metformin 500mg, Amlodipine 5mg"
//                       className="border-border focus-visible:ring-primary text-xs h-9"
//                     />
//                   </FormField>
//                 )}
//                 {answers["allergies"] === "Yes" && (
//                   <FormField label="Please specify allergies">
//                     <Input
//                       {...register("allergy_detail")}
//                       placeholder="e.g. Penicillin, Peanuts"
//                       className="border-border focus-visible:ring-primary text-xs h-9"
//                     />
//                   </FormField>
//                 )}
//               </div>
//             )}
//             onSaved={handleStepSaved}
//           />
//         );

//       case "functional":
//         return (
//           <StepFunctional
//             key={currentStep}
//             initialAnswers={savedAnswerMap}
//             initialVitals={stepData?.vitals}
//             initialNotes={stepData?.notes}
//             onSaved={handleStepSaved}
//           />
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="flex flex-col sm:flex-row flex-1 min-h-0">
//       <FormSidebar
//         currentStep={currentStep}
//         serverStep={serverCurrentStep}
//         visited={visited}
//         onSelect={goTo}
//       />

//       <div className="flex flex-col flex-1 min-h-0">
//         <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
//           <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
//           <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
//             {step.label}
//           </span>
//           {requestData?.certificate && (
//             <Badge
//               variant="outline"
//               className="ml-1 text-[9px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary"
//             >
//               Draft saved
//             </Badge>
//           )}
//           <span className="ml-auto text-[10px] text-muted-foreground">
//             Step {currentStep + 1} of {FORM_STEPS.length}
//           </span>
//         </div>

//         <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
//           {stepContent()}
//         </div>

//         <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border">
//           <Button
//             variant="outline"
//             onClick={() => currentStep > 0 ? goTo(currentStep - 1) : undefined}
//             disabled={currentStep === 0}
//             className="border-border text-xs"
//           >
//             ← Back
//           </Button>
//           <span className="text-[11px] text-muted-foreground">
//             Step {currentStep + 1} of {FORM_STEPS.length}
//           </span>
//           <Button
//             onClick={handleNext}
//             disabled={isSaving || submitMutation.isPending}
//             className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 min-w-[110px]"
//           >
//             {isSaving || submitMutation.isPending ? (
//               <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
//             ) : null}
//             {isLast ? "Submit request" : "Save & Next →"}
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Sent Certificates List
// // ─────────────────────────────────────────────────────────────────────────────

// function SentCertificates() {
//   const { data, isLoading, isError, refetch } = useGetPatientCertificates();
//   const downloadMutation = useDownloadCertificate();

//   const certs = data?.certificates ?? [];

//   if (isLoading) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-10">
//         <div className="flex flex-col items-center gap-3 text-muted-foreground">
//           <Loader2 className="h-6 w-6 animate-spin" />
//           <p className="text-xs">Loading certificates…</p>
//         </div>
//       </div>
//     );
//   }

//   if (isError) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-10">
//         <div className="text-center space-y-3">
//           <XCircle className="h-8 w-8 text-destructive mx-auto" />
//           <p className="text-sm font-medium text-foreground">
//             Failed to load certificates
//           </p>
//           <Button
//             variant="outline"
//             size="sm"
//             className="text-xs gap-1.5"
//             onClick={() => refetch()}
//           >
//             <RefreshCw className="h-3 w-3" />
//             Retry
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   if (certs.length === 0) {
//     return (
//       <div className="flex-1 flex items-center justify-center p-10">
//         <div className="text-center space-y-2">
//           <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
//           <p className="text-sm font-medium text-foreground">No certificates yet</p>
//           <p className="text-xs text-muted-foreground">Submit a request to get started.</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
//       {certs.map((cert) => {
//         const status = cert.status === "draft" ? "pending" : cert.status;
//         const meta = STATUS_META[status as CertStatus];
//         const StatusIcon = meta.icon;
//         const isDownloading =
//           downloadMutation.isPending &&
//           (downloadMutation.variables as unknown as number) === cert.id;

//         return (
//           <div
//             key={cert.id}
//             className="rounded-lg border border-border bg-card p-3 sm:p-4 flex items-start gap-3 sm:gap-4 group hover:border-primary/30 transition-colors"
//           >
//             <div className="hidden sm:flex w-10 h-10 rounded-lg items-center justify-center bg-primary/10 border border-primary/20 shrink-0">
//               <FileText className="h-4 w-4 text-primary" />
//             </div>

//             <div className="flex-1 min-w-0">
//               <div className="flex items-center gap-2 flex-wrap">
//                 <span className="text-xs font-semibold text-foreground">
//                   {purposeLabel(cert.purpose)}
//                 </span>
//                 <Badge
//                   className={cn(
//                     "text-[10px] font-medium rounded-full px-2.5 py-0.5 border flex items-center gap-1",
//                     meta.color,
//                   )}
//                 >
//                   <StatusIcon className="h-2.5 w-2.5" />
//                   {meta.label}
//                 </Badge>
//                 {cert.has_red_flags && (
//                   <Badge
//                     variant="outline"
//                     className="text-[9px] px-1.5 py-0 border-destructive/30 bg-destructive/10 text-destructive"
//                   >
//                     Red flags
//                   </Badge>
//                 )}
//               </div>

//               <div className="flex items-center gap-2 sm:gap-3 mt-1.5 flex-wrap">
//                 <span className="text-[11px] font-mono text-muted-foreground">
//                   {cert.certificate_number}
//                 </span>
//                 <span className="text-[10px] text-muted-foreground">
//                   {fmtDate(cert.created_at)}
//                 </span>
//                 {cert.doctor && (
//                   <span className="text-[10px] text-muted-foreground hidden sm:inline">
//                     · {cert.doctor.name}
//                   </span>
//                 )}
//               </div>

//               {cert.doctor && (
//                 <p className="sm:hidden text-[10px] text-muted-foreground mt-0.5">
//                   {cert.doctor.name}
//                 </p>
//               )}

//               {cert.decision && (
//                 <div className="mt-2 flex items-center gap-1.5 flex-wrap">
//                   <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
//                     Decision:
//                   </span>
//                   <span
//                     className={cn(
//                       "text-[11px] font-medium capitalize",
//                       cert.status === "approved"
//                         ? "text-emerald-600"
//                         : "text-destructive",
//                     )}
//                   >
//                     {cert.decision}
//                   </span>
//                   {cert.valid_until && (
//                     <span className="text-[10px] text-muted-foreground">
//                       · Valid until {fmtDate(cert.valid_until)}
//                     </span>
//                   )}
//                 </div>
//               )}
//             </div>

//             <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
//               {cert.status === "approved" && (
//                 <>
//                   <Button
//                     variant="outline"
//                     size="icon"
//                     className="h-7 w-7 border-border text-muted-foreground hover:text-foreground"
//                     title="View certificate"
//                     onClick={() =>
//                       downloadMutation.mutate(cert.id, {
//                         onError: (err) =>
//                           toast.error(err.message || "Download failed"),
//                       })
//                     }
//                     disabled={isDownloading}
//                   >
//                     {isDownloading ? (
//                       <Loader2 className="h-3 w-3 animate-spin" />
//                     ) : (
//                       <QrCode className="h-3.5 w-3.5" />
//                     )}
//                   </Button>
//                   <Button
//                     variant="outline"
//                     size="icon"
//                     className="h-7 w-7 border-border text-muted-foreground hover:text-foreground hidden sm:flex"
//                     title="Download PDF"
//                     onClick={() =>
//                       downloadMutation.mutate(cert.id, {
//                         onError: (err) =>
//                           toast.error(err.message || "Download failed"),
//                       })
//                     }
//                     disabled={isDownloading}
//                   >
//                     {isDownloading ? (
//                       <Loader2 className="h-3 w-3 animate-spin" />
//                     ) : (
//                       <Download className="h-3.5 w-3.5" />
//                     )}
//                   </Button>
//                 </>
//               )}
//               <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Main Page
// // ─────────────────────────────────────────────────────────────────────────────

// type Tab = "request" | "certificates";

// const PatientFitnessCertificates = () => {
//   const { t } = useTranslation();
//   const [activeTab, setActiveTab] = useState<Tab>("request");

//   const { data: certsData } = useGetPatientCertificates();
//   const certCount = certsData?.certificates?.length ?? 0;

//   const handleRequestSubmit = () => {
//     setActiveTab("certificates");
//   };

//   const tabs: {
//     id: Tab;
//     label: string;
//     icon: React.ElementType;
//     badge?: number;
//   }[] = [
//     { id: "request", label: "New Request", icon: FilePlus2 },
//     {
//       id: "certificates",
//       label: "My Certificates",
//       icon: ClipboardList,
//       badge: certCount,
//     },
//   ];

//   return (
//     <DashboardLayout role="patient">
//       <div className="flex flex-col h-full">
//         <PageHeader
//           title={t(
//             "pages.patient.fitness_certificates.title",
//             "Fitness Certificates",
//           )}
//           subtitle={t(
//             "pages.patient.fitness_certificates.subtitle",
//             "Request and manage your medical fitness certificates",
//           )}
//         />

//         <div className="px-3 py-4 sm:px-6 sm:py-8">
//           <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col min-h-[560px]">
//             <div className="flex items-center border-b border-border bg-muted/30 px-3 sm:px-4">
//               {tabs.map((tab) => {
//                 const Icon = tab.icon;
//                 const isActive = activeTab === tab.id;
//                 return (
//                   <button
//                     key={tab.id}
//                     onClick={() => setActiveTab(tab.id)}
//                     className={cn(
//                       "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-3.5 text-xs font-medium border-b-2 transition-all duration-150 -mb-px",
//                       isActive
//                         ? "border-primary text-primary"
//                         : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
//                     )}
//                   >
//                     <Icon className="h-3.5 w-3.5 shrink-0" />
//                     <span className="hidden sm:inline">{tab.label}</span>
//                     <span className="sm:hidden">
//                       {tab.id === "request" ? "Request" : "Certificates"}
//                     </span>
//                     {tab.badge !== undefined && tab.badge > 0 && (
//                       <span
//                         className={cn(
//                           "text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none",
//                           isActive
//                             ? "bg-primary text-primary-foreground"
//                             : "bg-muted text-muted-foreground",
//                         )}
//                       >
//                         {tab.badge}
//                       </span>
//                     )}
//                   </button>
//                 );
//               })}
//             </div>

//             <div className="flex flex-col flex-1 min-h-0">
//               {activeTab === "request" ? (
//                 <RequestForm onSubmit={handleRequestSubmit} />
//               ) : (
//                 <SentCertificates />
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// };





import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FilePlus2,
  ClipboardList,
  Check,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Download,
  XCircle,
  RefreshCw,
} from "lucide-react";

import {
  useGetPatientCertificates,
  useGetCurrentRequest,
  useGetStepData,
  useSubmitCertificate,
  useDownloadCertificate,
  useWithdrawCertificate,
  usePaymentStatus,
  isSubmitPaymentRequired,
  isDownloadPaymentRequired,
  isDownloadReady,
  type Certificate,
  type SubmitPaymentRequired,
  type DownloadPaymentRequired,
} from "@/hooks/patient/use-patient-certificates";

import {
  FormSidebar,
  StepPurpose,
  YesNoStep,
  StepFunctional,
  FormField,
} from "./components/FitnessComponents";

import { FORM_STEPS, SYMPTOM_FIELDS, HISTORY_FIELDS } from "./components/FitnessConstants";
import { IremboPayError } from "./components/irembopay";
// import type { IremboPayStatic, IremboPayError } from "@/types/irembopay";

// ─────────────────────────────────────────────────────────────────────────────
// IremboPay — types + script loader
// ─────────────────────────────────────────────────────────────────────────────

const IREMBOPAY_SCRIPT_URL = "https://api.irembopay.com/environments/customer-ui";

// interface IremboPayLocale { EN: string; FR: string }
// interface IremboPayStatic {
//   locale: IremboPayLocale;
//   initiate: (options: {
//     publicKey: string;
//     invoiceNumber: string;
//     locale: string;
//     callback: (err: IremboPayError | null) => void;
//   }) => void;
//   closeModal?: () => void;
// }

/** Shape of the error object IremboPay passes to the callback */
// interface IremboPayError {
//   message?: string;
//   errors?: Array<{ code: string; detail: string }>;
// }

// declare global {
//   interface Window { IremboPay: IremboPayStatic }
// }

/** Known IremboPay error codes → user-friendly messages */
const IREMBOPAY_ERROR_MESSAGES: Record<string, string> = {
  BAD_INVOICES_PAYMENT_EXPIRED:    "This invoice has expired. Request a new one to continue.",
  BAD_INVOICES_ALREADY_PAID:       "This invoice has already been paid.",
  BAD_INVOICES_INVALID:            "Invalid invoice. Please try again.",
  BAD_INVOICES_NOT_FOUND:          "Invoice not found. Please try again.",
  BAD_INVOICES_PAYMENT_CANCELLED:  "Payment was cancelled.",
  BAD_INVOICES_PAYMENT_FAILED:     "Payment failed. Please try a different method.",
};

function parseIremboError(err: IremboPayError | null): {
  message: string;
  isExpired: boolean;
  codes: string[];
} {
  if (!err) return { message: "Payment could not be processed.", isExpired: false, codes: [] };

  const codes = err.errors?.map((e) => e.code) ?? [];
  const isExpired = codes.includes("BAD_INVOICES_PAYMENT_EXPIRED");

  // Find the first code we have a message for
  const knownMessage = codes
    .map((c) => IREMBOPAY_ERROR_MESSAGES[c])
    .find(Boolean);

  const message =
    knownMessage ??
    err.errors?.[0]?.detail ??
    err.message ??
    "Payment could not be processed. Please try again.";

  return { message, isExpired, codes };
}

/**
 * Ensures the IremboPay widget script is present in the DOM.
 * Safe to call multiple times — won't add duplicates.
 */
function ensureIremboPayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.IremboPay) { resolve(); return; }
    if (document.querySelector(`script[src="${IREMBOPAY_SCRIPT_URL}"]`)) {
      // Script tag exists but not yet loaded — wait for it
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${IREMBOPAY_SCRIPT_URL}"]`,
      )!;
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load IremboPay script")));
      return;
    }
    const script = document.createElement("script");
    script.src = IREMBOPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load IremboPay script"));
    document.head.appendChild(script);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PaymentPanel — reusable payment gate UI
// Used for both submit-payment and download-payment flows
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentPanelProps {
  title: string;
  description: string;
  paymentInfo: Pick<SubmitPaymentRequired, "amount" | "currency" | "invoice_number" | "public_key" | "payment_uuid">;
  onPaymentConfirmed: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Called when the invoice is expired so the parent can re-fetch a fresh one */
  onRefreshInvoice?: () => void;
  isRefreshingInvoice?: boolean;
}

type PaymentPhase = "idle" | "loading_sdk" | "initiating" | "verifying" | "done";

function PaymentPanel({
  title,
  description,
  paymentInfo,
  onPaymentConfirmed,
  onCancel,
  cancelLabel = "Cancel",
  onRefreshInvoice,
  isRefreshingInvoice = false,
}: PaymentPanelProps) {
  const [phase, setPhase] = useState<PaymentPhase>("idle");
  const [error, setError] = useState<{ message: string; isExpired: boolean } | null>(null);

  // Poll payment_uuid once we're in verifying phase
  const { data: statusData } = usePaymentStatus(
    paymentInfo.payment_uuid,
    phase === "verifying",
  );

  useEffect(() => {
    if (!statusData || phase !== "verifying") return;
    if (statusData.status === "paid") {
      setPhase("done");
      onPaymentConfirmed();
    } else if (statusData.status === "failed") {
      setError({ message: "Payment was not completed. Please try again.", isExpired: false });
      setPhase("idle");
    }
  }, [statusData, phase, onPaymentConfirmed]);

  // Clear error whenever paymentInfo changes (new invoice fetched)
  useEffect(() => {
    setError(null);
    setPhase("idle");
  }, [paymentInfo.invoice_number]);

  const handlePay = async () => {
    setError(null);

    // 1. Ensure the SDK script is loaded
    setPhase("loading_sdk");
    try {
      await ensureIremboPayScript();
    } catch {
      setError({ message: "Could not load payment widget. Check your connection and try again.", isExpired: false });
      setPhase("idle");
      return;
    }

    // 2. Open the widget
    setPhase("initiating");
    try {
      window.IremboPay.initiate({
        publicKey:     paymentInfo.public_key,
        invoiceNumber: paymentInfo.invoice_number,
        locale:        window.IremboPay.locale.EN,
        callback: (err: IremboPayError | null) => {
          window.IremboPay.closeModal?.();
          if (err) {
            const parsed = parseIremboError(err);
            setError({ message: parsed.message, isExpired: parsed.isExpired });
            setPhase("idle");
            return;
          }
          setPhase("verifying");
        },
      });
    } catch {
      setError({ message: "Could not open payment window. Please try again.", isExpired: false });
      setPhase("idle");
    }
  };

  // ── Verifying state ────────────────────────────────────────────────────────
  if (phase === "verifying") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-[12px] font-medium text-foreground">Confirming your payment…</p>
        <p className="text-[11px] text-muted-foreground max-w-[260px]">
          This usually takes a few seconds. Please don't close this window.
        </p>
      </div>
    );
  }

  // ── Done state ─────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center px-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
          <Check className="h-7 w-7 text-emerald-600" />
        </div>
        <p className="text-sm font-semibold text-foreground">Payment confirmed!</p>
      </div>
    );
  }

  const isLoading = phase === "loading_sdk" || phase === "initiating" || isRefreshingInvoice;

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {/* Header — only shown when title is provided */}
      {title && (
        <div>
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}

      {/* Invoice summary */}
      <div className="rounded-xl border border-border bg-muted/40 divide-y divide-border">
        <div className="flex justify-between items-center px-4 py-2.5 text-[11px]">
          <span className="text-muted-foreground">Invoice</span>
          <span className="font-mono font-medium text-foreground tracking-tight">
            {paymentInfo.invoice_number}
          </span>
        </div>
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-[12px] font-semibold text-foreground">Amount due</span>
          <span className="text-[14px] font-bold text-primary">
            {paymentInfo.currency} {paymentInfo.amount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Error block */}
      {error && (
        <div className={cn(
          "rounded-xl border p-3.5 space-y-2.5",
          error.isExpired
            ? "bg-amber-500/5 border-amber-500/25"
            : "bg-destructive/5 border-destructive/20",
        )}>
          <div className="flex items-start gap-2.5">
            <div className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
              error.isExpired ? "bg-amber-500/15" : "bg-destructive/10",
            )}>
              <AlertCircle className={cn(
                "h-3.5 w-3.5",
                error.isExpired ? "text-amber-600" : "text-destructive",
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-[12px] font-semibold leading-tight",
                error.isExpired ? "text-amber-700 dark:text-amber-400" : "text-destructive",
              )}>
                {error.isExpired ? "Invoice expired" : "Payment failed"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                {error.message}
              </p>
            </div>
          </div>

          {/* Expired — offer to get a new invoice */}
          {error.isExpired && onRefreshInvoice && (
            <Button
              size="sm"
              onClick={() => { setError(null); onRefreshInvoice(); }}
              disabled={isRefreshingInvoice}
              className="w-full h-8 text-[11px] font-semibold gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isRefreshingInvoice ? (
                <><Loader2 className="h-3 w-3 animate-spin" />Getting new invoice…</>
              ) : (
                <><RefreshCw className="h-3 w-3" />Get new invoice</>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Actions */}
      {/* Hide Pay button when expired and refresh handler exists — user must refresh first */}
      {!(error?.isExpired && onRefreshInvoice) && (
        <div className="space-y-2">
          <Button
            onClick={handlePay}
            disabled={isLoading}
            className="w-full h-10 text-[12px] font-semibold gap-2 rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {phase === "loading_sdk" ? "Loading payment…"
              : phase === "initiating" ? "Opening payment…"
              : "Pay now"}
          </Button>
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full h-9 text-[11px] rounded-xl"
            >
              {cancelLabel}
            </Button>
          )}
        </div>
      )}

      {/* When expired, still show the cancel option */}
      {error?.isExpired && onRefreshInvoice && onCancel && (
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isRefreshingInvoice}
          className="w-full h-9 text-[11px] rounded-xl"
        >
          {cancelLabel}
        </Button>
      )}

      <div className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground/50 pt-1">
        <ShieldCheck className="h-3 w-3" />
        Secured by IremboPay · End-to-end encrypted
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RequestForm — orchestrates steps + submit + payment
// ─────────────────────────────────────────────────────────────────────────────

type RequestPhase = "form" | "payment" | "submitted";

function RequestForm({ onSubmit: onDone }: { onSubmit: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [isSaving, setIsSaving] = useState(false);
  const [requestPhase, setRequestPhase] = useState<RequestPhase>("form");
  const [pendingPayment, setPendingPayment] = useState<SubmitPaymentRequired | null>(null);
  const [isRefreshingInvoice, setIsRefreshingInvoice] = useState(false);

  const { data: requestData, isLoading: requestLoading } = useGetCurrentRequest();
  const serverCurrentStep = requestData?.certificate?.current_step ?? 0;

  const { data: stepData, isLoading: stepLoading } = useGetStepData(
    FORM_STEPS[currentStep].apiStep,
    !requestLoading,
  );

  const submitMutation = useSubmitCertificate();

  useEffect(() => {
    if (serverCurrentStep > 0) {
      const newVisited = new Set<number>();
      FORM_STEPS.forEach((s, i) => {
        if (s.apiStep <= serverCurrentStep) newVisited.add(i);
      });
      setVisited(newVisited);
      const nextIncomplete = FORM_STEPS.findIndex((s) => s.apiStep > serverCurrentStep);
      if (nextIncomplete !== -1) setCurrentStep(nextIncomplete);
    }
  }, [serverCurrentStep]);

  const isLast = currentStep === FORM_STEPS.length - 1;

  const goTo = (i: number) => {
    setVisited((v) => new Set([...v, i]));
    setCurrentStep(i);
  };

  // Called by each step sub-component after it saves its data
  const handleStepSaved = useCallback(
    (_savedApiStep: number) => {
      setIsSaving(false);
      if (isLast) {
        // All steps done — call submit
        submitMutation.mutate(undefined, {
          onSuccess: (res) => {
            if (isSubmitPaymentRequired(res)) {
              // API wants payment before submitting
              setPendingPayment(res);
              setRequestPhase("payment");
            } else {
              // Already submitted (e.g. re-submit after network issue)
              setRequestPhase("submitted");
              setTimeout(() => onDone(), 1200);
            }
          },
          onError: (err) => toast.error(err.message || "Submission failed"),
        });
      } else {
        goTo(currentStep + 1);
      }
    },
    [currentStep, isLast, submitMutation, onDone],
  );

  const handleNext = () => {
    setIsSaving(true);
    const btn = document.getElementById("step-submit-btn");
    if (btn) btn.click();
  };

  // Payment confirmed → poll already detected "paid" → switch to submitted
  const handlePaymentConfirmed = useCallback(() => {
    setPendingPayment(null);
    setRequestPhase("submitted");
    setTimeout(() => onDone(), 1200);
  }, [onDone]);

  // Invoice expired — re-call submit to get a fresh invoice number
  const handleRefreshInvoice = useCallback(() => {
    setIsRefreshingInvoice(true);
    submitMutation.mutate(undefined, {
      onSuccess: (res) => {
        setIsRefreshingInvoice(false);
        if (isSubmitPaymentRequired(res)) {
          setPendingPayment(res); // new invoice_number clears PaymentPanel error via useEffect
        } else {
          // Already submitted somehow — move on
          setRequestPhase("submitted");
          setTimeout(() => onDone(), 1200);
        }
      },
      onError: (err) => {
        setIsRefreshingInvoice(false);
        toast.error(err.message || "Could not refresh invoice. Please try again.");
      },
    });
  }, [submitMutation, onDone]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (requestLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-xs">Loading your request…</p>
        </div>
      </div>
    );
  }

  // ── Payment gate ───────────────────────────────────────────────────────────
  if (requestPhase === "payment" && pendingPayment) {
    return (
      <div className="flex-1 flex flex-col justify-center">
        <PaymentPanel
          title="Complete payment to submit"
          description="Your request is ready. Pay the submission fee to send it to a doctor for review."
          paymentInfo={pendingPayment}
          onPaymentConfirmed={handlePaymentConfirmed}
          onRefreshInvoice={handleRefreshInvoice}
          isRefreshingInvoice={isRefreshingInvoice}
          onCancel={() => setRequestPhase("form")}
          cancelLabel="← Back to form"
        />
      </div>
    );
  }

  // ── Submitted success ──────────────────────────────────────────────────────
  if (requestPhase === "submitted") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center mx-auto">
            <Check className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-foreground">Request submitted!</p>
          <p className="text-xs text-muted-foreground">A doctor will review your request shortly.</p>
        </div>
      </div>
    );
  }

  // ── Multi-step form ────────────────────────────────────────────────────────
  const step = FORM_STEPS[currentStep];

  const savedAnswerMap: Record<string, string> = {};
  if (stepData?.answers) {
    stepData.answers.forEach((a) => { savedAnswerMap[a.field] = a.value; });
  }

  const stepContent = () => {
    if (stepLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    switch (step.id) {
      case "purpose":
        return (
          <StepPurpose
            key={currentStep}
            initialData={{
              purpose: stepData?.purpose,
              purpose_other: stepData?.purpose_other ?? undefined,
              job_type: stepData?.job_type,
            }}
            onSaved={handleStepSaved}
          />
        );

      case "symptoms":
        return (
          <YesNoStep
            key={currentStep}
            apiStep={2}
            initialAnswers={savedAnswerMap}
            headerNote={
              <p className="text-xs text-muted-foreground mb-3">
                Answer honestly about symptoms in the <strong>past 72 hours</strong>.
              </p>
            }
            fields={SYMPTOM_FIELDS}
            onSaved={handleStepSaved}
          />
        );

      case "history":
        return (
          <YesNoStep
            key={currentStep}
            apiStep={3}
            initialAnswers={savedAnswerMap}
            fields={HISTORY_FIELDS}
            extraFields={(answers, setAnswer, register) => (
              <div className="mt-3 space-y-3">
                {answers["chronic_illness"] === "Yes" && (
                  <FormField label="Please specify condition(s)">
                    <Input
                      {...register("chronic_illness_detail")}
                      placeholder="e.g. Hypertension, Diabetes Type 2"
                      className="border-border focus-visible:ring-primary text-xs h-9"
                    />
                  </FormField>
                )}
                {answers["chronic_medication"] === "Yes" && (
                  <FormField label="Please list medications">
                    <Input
                      {...register("medication_detail")}
                      placeholder="e.g. Metformin 500mg, Amlodipine 5mg"
                      className="border-border focus-visible:ring-primary text-xs h-9"
                    />
                  </FormField>
                )}
                {answers["allergies"] === "Yes" && (
                  <FormField label="Please specify allergies">
                    <Input
                      {...register("allergy_detail")}
                      placeholder="e.g. Penicillin, Peanuts"
                      className="border-border focus-visible:ring-primary text-xs h-9"
                    />
                  </FormField>
                )}
              </div>
            )}
            onSaved={handleStepSaved}
          />
        );

      case "functional":
        return (
          <StepFunctional
            key={currentStep}
            initialAnswers={savedAnswerMap}
            initialVitals={stepData?.vitals}
            initialNotes={stepData?.notes}
            onSaved={handleStepSaved}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row flex-1 min-h-0">
      <FormSidebar
        currentStep={currentStep}
        serverStep={serverCurrentStep}
        visited={visited}
        onSelect={goTo}
      />

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-border">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {step.label}
          </span>
          {requestData?.certificate && (
            <Badge
              variant="outline"
              className="ml-1 text-[9px] px-1.5 py-0 border-primary/20 bg-primary/5 text-primary"
            >
              Draft saved
            </Badge>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground">
            Step {currentStep + 1} of {FORM_STEPS.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {stepContent()}
        </div>

        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-muted/50 border-t border-border">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 ? goTo(currentStep - 1) : undefined}
            disabled={currentStep === 0}
            className="border-border text-xs"
          >
            ← Back
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Step {currentStep + 1} of {FORM_STEPS.length}
          </span>
          <Button
            onClick={handleNext}
            disabled={isSaving || submitMutation.isPending}
            className="text-primary-foreground text-xs bg-primary hover:bg-primary/90 min-w-[110px]"
          >
            {(isSaving || submitMutation.isPending) && (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
            )}
            {isLast ? "Submit request" : "Save & Next →"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CertificateStatusBadge
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<
  string,
  { label: string; cls: string }
> = {
  draft:     { label: "Draft",     cls: "bg-muted text-muted-foreground border-border" },
  pending:   { label: "Pending",   cls: "bg-amber-500/10 text-amber-600 border-amber-500/25" },
  in_review: { label: "In Review", cls: "bg-blue-500/10 text-blue-600 border-blue-500/25" },
  approved:  { label: "Approved",  cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25" },
  rejected:  { label: "Rejected",  cls: "bg-destructive/10 text-destructive border-destructive/25" },
};

function CertStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", s.cls)}>
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CertificateCard — single certificate row with download action
// ─────────────────────────────────────────────────────────────────────────────

function CertificateCard({ cert }: { cert: Certificate }) {
  const [downloadPhase, setDownloadPhase] = useState<
    "idle" | "loading" | "payment" | "verifying"
  >("idle");
  const [downloadPayment, setDownloadPayment] = useState<DownloadPaymentRequired | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRefreshingDownloadInvoice, setIsRefreshingDownloadInvoice] = useState(false);

  const downloadMutation = useDownloadCertificate();

  const handleDownload = async () => {
    setDownloadPhase("loading");
    setErrorMsg(null);
    try {
      const res = await downloadMutation.mutateAsync(cert.id);
      if (isDownloadReady(res)) {
        // Already paid — open the signed PDF URL directly
        window.open(res.url, "_blank");
        setDownloadPhase("idle");
      } else if (isDownloadPaymentRequired(res)) {
        // Need to pay the download fee first
        setDownloadPayment(res);
        setDownloadPhase("payment");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Download failed. Please try again.");
      setDownloadPhase("idle");
    }
  };

  const handleDownloadPaymentConfirmed = useCallback(async () => {
    // Payment confirmed — re-call download to get the signed URL
    setDownloadPhase("loading");
    setDownloadPayment(null);
    try {
      const res = await downloadMutation.mutateAsync(cert.id);
      if (isDownloadReady(res)) {
        window.open(res.url, "_blank");
      } else {
        // Shouldn't happen after paying, but handle gracefully
        toast.error("Download not ready yet. Please try again in a moment.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloadPhase("idle");
    }
  }, [cert.id, downloadMutation]);

  // Re-fetch download endpoint to get a fresh invoice when previous one expired
  const handleRefreshDownloadInvoice = useCallback(async () => {
    setIsRefreshingDownloadInvoice(true);
    try {
      const res = await downloadMutation.mutateAsync(cert.id);
      if (isDownloadReady(res)) {
        window.open(res.url, "_blank");
        setDownloadPhase("idle");
        setDownloadPayment(null);
      } else if (isDownloadPaymentRequired(res)) {
        setDownloadPayment(res); // new invoice_number clears the error in PaymentPanel
        setDownloadPhase("payment");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not refresh invoice.");
      setDownloadPhase("idle");
    } finally {
      setIsRefreshingDownloadInvoice(false);
    }
  }, [cert.id, downloadMutation]);

  const isApproved = cert.status === "approved";

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Main row */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-foreground">
              {cert.certificate_number || `Certificate #${cert.id}`}
            </span>
            <CertStatusBadge status={cert.status} />
          </div>
          <p className="text-[11px] text-muted-foreground capitalize">
            {cert.purpose?.replace(/_/g, " ")}
            {cert.job_type && cert.job_type !== "None of the above" && (
              <span className="text-muted-foreground/60"> · {cert.job_type}</span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            {new Date(cert.created_at).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            })}
            {cert.valid_until && (
              <span> · Valid until {new Date(cert.valid_until).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric",
              })}</span>
            )}
          </p>
          {cert.doctor && (
            <p className="text-[11px] text-muted-foreground">
              Reviewed by <strong className="font-medium text-foreground">{cert.doctor.name}</strong>
            </p>
          )}
          {cert.doctor_notes && (
            <p className="text-[11px] text-muted-foreground/70 italic line-clamp-2">
              "{cert.doctor_notes}"
            </p>
          )}
        </div>

        {/* Download button — only for approved certs */}
        {isApproved && downloadPhase === "idle" && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="shrink-0 h-8 text-[11px] gap-1.5 border-border"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        )}
        {isApproved && downloadPhase === "loading" && (
          <Button size="sm" variant="outline" disabled className="shrink-0 h-8 text-[11px] gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </Button>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="mx-4 mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 text-[11px] text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {errorMsg}
          <button
            onClick={() => setErrorMsg(null)}
            className="ml-auto text-destructive/60 hover:text-destructive"
          >
            <XCircle className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Download payment gate — inline within the card */}
      {downloadPhase === "payment" && downloadPayment && (
        <div className="border-t border-border bg-muted/30">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-primary" />
              Download fee required
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              A one-time fee applies to download your certificate PDF.
            </p>
          </div>
          <PaymentPanel
            title=""
            description=""
            paymentInfo={downloadPayment}
            onPaymentConfirmed={handleDownloadPaymentConfirmed}
            onRefreshInvoice={handleRefreshDownloadInvoice}
            isRefreshingInvoice={isRefreshingDownloadInvoice}
            onCancel={() => {
              setDownloadPayment(null);
              setDownloadPhase("idle");
            }}
            cancelLabel="Cancel download"
          />
        </div>
      )}

      {/* Download verifying — shown while re-fetching after payment */}
      {downloadPhase === "verifying" && (
        <div className="border-t border-border bg-muted/30 px-4 py-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-[11px] text-muted-foreground">Preparing your download…</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SentCertificates — list of all certificates with withdraw option
// ─────────────────────────────────────────────────────────────────────────────

function SentCertificates() {
  const { data, isLoading } = useGetPatientCertificates();
  const withdrawMutation = useWithdrawCertificate();

  const certs = data?.certificates ?? [];

  const hasDraftOrPending = certs.some(
    (c) => c.status === "draft" || c.status === "pending",
  );

  const handleWithdraw = () => {
    if (!confirm("Withdraw your current request? This cannot be undone.")) return;
    withdrawMutation.mutate(undefined, {
      onSuccess: () => toast.success("Request withdrawn."),
      onError: (err) => toast.error(err.message || "Could not withdraw request."),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (certs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center px-4">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-[13px] font-medium text-foreground/70">No certificates yet</p>
        <p className="text-[11px] text-muted-foreground max-w-[260px]">
          Submit a request and a doctor will review it shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-5 space-y-3">
      {/* Withdraw option for active requests */}
      {hasDraftOrPending && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px]">
          <p className="text-muted-foreground">
            You have an active request in progress.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending}
            className="h-7 text-[11px] gap-1 border-destructive/30 text-destructive hover:bg-destructive/5"
          >
            {withdrawMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            Withdraw
          </Button>
        </div>
      )}

      {/* Certificate cards */}
      <div className="space-y-3 overflow-y-auto">
        {certs.map((cert) => (
          <CertificateCard key={cert.id} cert={cert} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "request" | "certificates";

const PatientFitnessCertificates = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("request");

  const { data: certsData } = useGetPatientCertificates();
  const certCount = certsData?.certificates?.length ?? 0;

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "request", label: "New Request", icon: FilePlus2 },
    { id: "certificates", label: "My Certificates", icon: ClipboardList, badge: certCount },
  ];

  return (
    <DashboardLayout role="patient">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.patient.fitness_certificates.title", "Fitness Certificates")}
          subtitle={t(
            "pages.patient.fitness_certificates.subtitle",
            "Request and manage your medical fitness certificates",
          )}
        />

        <div className="px-3 py-4 sm:px-6 sm:py-8">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col min-h-[560px]">
            {/* Tab bar */}
            <div className="flex items-center border-b border-border bg-muted/30 px-3 sm:px-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 sm:py-3.5 text-xs font-medium border-b-2 transition-all duration-150 -mb-px",
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">
                      {tab.id === "request" ? "Request" : "Certificates"}
                    </span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        className={cn(
                          "text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col flex-1 min-h-0">
              {activeTab === "request" ? (
                <RequestForm onSubmit={() => setActiveTab("certificates")} />
              ) : (
                <SentCertificates />
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientFitnessCertificates;
