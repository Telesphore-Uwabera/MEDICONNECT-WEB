import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export function AdminBookingDesk() {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [hospitalId, setHospitalId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const create = useMutation({
    mutationFn: () =>
      apiFetch("/admin/service-bookings", {
        method: "POST",
        body: {
          patient_id: Number(patientId),
          hospital_id: Number(hospitalId),
          preferred_date: date,
          preferred_time: time,
          agent_notes: notes,
        },
      }),
    onSuccess: () => {
      toast.success("Facility visit booked. The RWF 1,000 platform fee is added on top of the hospital price.");
      qc.invalidateQueries({ queryKey: ["admin-appointments"] });
      setNotes("");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not create the booking.");
    },
  });

  return (
    <section className="mx-4 mt-4 rounded-[6px] border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Support booking desk</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Book a facility visit on behalf of a patient. Your user ID is stored as the agent. The platform fee is RWF 1,000 and does not replace the hospital service price.
      </p>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <input className="h-8 rounded-[5px] border border-border bg-background px-2 text-[12px]" placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} required />
        <input className="h-8 rounded-[5px] border border-border bg-background px-2 text-[12px]" placeholder="Hospital ID" value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} required />
        <input className="h-8 rounded-[5px] border border-border bg-background px-2 text-[12px]" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input className="h-8 rounded-[5px] border border-border bg-background px-2 text-[12px]" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        <button type="submit" disabled={create.isPending} className="h-8 rounded-[5px] bg-primary px-3 text-[11px] font-semibold text-primary-foreground">
          {create.isPending ? "Booking…" : "Book visit"}
        </button>
        <input
          className="h-8 rounded-[5px] border border-border bg-background px-2 text-[12px] sm:col-span-5"
          placeholder="Agent notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </form>
    </section>
  );
}
