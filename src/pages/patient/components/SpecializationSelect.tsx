
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { t } from "i18next";
import {
  SlidersHorizontal,
  X,
  Star,
  Search,
  Zap,
  CalendarCheck,
  Clock,
  Stethoscope,
  Globe,
  Video,
  MapPin,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";

import { DoctorCard } from "@/components/DoctorCard";
import { useGetSearchDoctors,
  type ApiDoctor,
  type DoctorSearchParams,

 } from "@/hooks/patient/use-patient-doctor";
import { useGetPublicInsurances } from "@/hooks/hospital/use-hopital-insurances";

const SPECIALIZATION_GROUPS = [
  { group: "Internal Medicine", items: ["Cardiology","Endocrinology","Gastroenterology","Hematology","Infectious Disease","Nephrology","Oncology","Pulmonology","Rheumatology","Geriatrics","Hepatology","Allergy & Immunology"] },
  { group: "Surgery", items: ["Cardiothoracic Surgery","Colorectal Surgery","Neurosurgery","Orthopedic Surgery","Pediatric Surgery","Plastic & Reconstructive Surgery","Transplant Surgery","Trauma Surgery","Vascular Surgery","Urological Surgery","Bariatric Surgery","Surgical Oncology"] },
  { group: "Pediatrics", items: ["Pediatric Cardiology","Pediatric Endocrinology","Pediatric Gastroenterology","Pediatric Hematology/Oncology","Pediatric Infectious Disease","Pediatric Nephrology","Pediatric Neurology","Pediatric Pulmonology","Neonatology","Pediatric Emergency Medicine","Pediatric Rheumatology","Pediatric Critical Care","Developmental-Behavioral Pediatrics"] },
  { group: "Obstetrics & Gynecology", items: ["Maternal-Fetal Medicine","Reproductive Endocrinology & Infertility","Gynecologic Oncology","Urogynecology","Minimally Invasive Gynecologic Surgery","Female Pelvic Medicine","Pediatric & Adolescent Gynecology"] },
  { group: "Neurology", items: ["Clinical Neurophysiology","Epilepsy","Movement Disorders","Neurocritical Care","Neuro-Oncology","Neuromuscular Medicine","Sleep Medicine","Stroke Medicine","Behavioral Neurology","Child Neurology","Headache Medicine","Multiple Sclerosis"] },
  { group: "Psychiatry", items: ["Addiction Psychiatry","Child & Adolescent Psychiatry","Forensic Psychiatry","Geriatric Psychiatry","Consultation-Liaison Psychiatry","Neuropsychiatry","Sleep Psychiatry","Community Psychiatry","Psychosomatic Medicine"] },
  { group: "Radiology", items: ["Interventional Radiology","Neuroradiology","Abdominal Radiology","Breast Imaging","Cardiovascular Radiology","Musculoskeletal Radiology","Pediatric Radiology","Nuclear Medicine","Emergency Radiology","Thoracic Radiology"] },
  { group: "Orthopedics", items: ["Spine Surgery","Joint Replacement","Sports Medicine","Hand & Upper Extremity Surgery","Foot & Ankle Surgery","Pediatric Orthopedics","Orthopedic Oncology","Trauma Orthopedics","Shoulder & Elbow Surgery"] },
  { group: "Ophthalmology", items: ["Retina & Vitreous","Cornea & External Disease","Glaucoma","Neuro-Ophthalmology","Pediatric Ophthalmology","Oculoplastics","Refractive Surgery","Uveitis","Ocular Oncology"] },
  { group: "Otolaryngology (ENT)", items: ["Rhinology","Laryngology","Otology & Neurotology","Head & Neck Surgery","Facial Plastic Surgery","Pediatric ENT","Sleep Surgery","Skull Base Surgery"] },
  { group: "Dermatology", items: ["Dermatopathology","Pediatric Dermatology","Dermatologic Surgery","Mohs Surgery","Cosmetic Dermatology","Immunodermatology","Photomedicine","Trichology","Wound Care"] },
  { group: "Anesthesiology", items: ["Cardiac Anesthesiology","Pediatric Anesthesiology","Obstetric Anesthesiology","Neuroanesthesiology","Regional Anesthesiology","Pain Medicine","Critical Care Medicine","Thoracic Anesthesiology"] },
  { group: "Emergency Medicine", items: ["Pediatric Emergency Medicine","Emergency Medical Services","Toxicology","Ultrasound","Wilderness Medicine","Disaster Medicine","Hyperbaric Medicine"] },
  { group: "Family Medicine", items: ["Geriatric Medicine","Sports Medicine","Palliative Care","Adolescent Medicine","Rural Medicine","Preventive Medicine","Integrative Medicine","Hospice Medicine"] },
  { group: "Urology", items: ["Urologic Oncology","Female Urology","Pediatric Urology","Male Infertility","Endourology","Reconstructive Urology","Neurourology","Kidney Transplant Urology"] },
  { group: "Cardiology", items: ["Interventional Cardiology","Electrophysiology","Heart Failure","Echocardiography","Cardiac Imaging","Preventive Cardiology","Pediatric Cardiology","Structural Heart Disease","Cardiac Rehabilitation","Cardiovascular Genetics"] },
  { group: "Oncology", items: ["Medical Oncology","Surgical Oncology","Radiation Oncology","Hematologic Oncology","Gynecologic Oncology","Neuro-Oncology","Pediatric Oncology","Gastrointestinal Oncology","Thoracic Oncology","Genitourinary Oncology","Breast Oncology","Palliative Oncology"] },
  { group: "Infectious Disease", items: ["HIV/AIDS Medicine","Tropical Medicine","Travel Medicine","Hospital Epidemiology","Antimicrobial Stewardship","Mycology","Virology","Parasitology"] },
  { group: "Nephrology", items: ["Transplant Nephrology","Dialysis Medicine","Onco-Nephrology","Glomerular Disease","Pediatric Nephrology","Hypertension","Critical Care Nephrology","Electrolyte Disorders"] },
  { group: "Endocrinology", items: ["Diabetes & Metabolism","Thyroid Disease","Adrenal Disease","Pituitary Disease","Reproductive Endocrinology","Bone & Mineral Metabolism","Neuroendocrinology","Pediatric Endocrinology"] },
  { group: "Gastroenterology", items: ["Hepatology","Inflammatory Bowel Disease","Endoscopy","Pancreatic Disease","Motility","Pediatric Gastroenterology","Transplant Hepatology","Gastrointestinal Oncology"] },
  { group: "Rheumatology", items: ["Lupus & Connective Tissue Disease","Inflammatory Arthritis","Vasculitis","Scleroderma","Pediatric Rheumatology","Osteoporosis & Bone Disease","Gout & Crystal Arthropathies","Myositis"] },
  { group: "Pulmonology", items: ["Critical Care / Intensive Care","Sleep Medicine","Interstitial Lung Disease","Pulmonary Hypertension","Thoracic Oncology","Cystic Fibrosis","COPD & Asthma","Interventional Pulmonology","Lung Transplantation"] },
  { group: "Hematology", items: ["Benign Hematology","Hematologic Malignancies","Bone Marrow Transplantation","Coagulation & Thrombosis","Transfusion Medicine","Sickle Cell Disease","Pediatric Hematology"] },
  { group: "Genetics & Genomics", items: ["Clinical Genetics","Biochemical Genetics","Molecular Genetics","Cytogenetics","Cancer Genetics","Neurogenetics","Pharmacogenomics","Prenatal Genetics"] },
];

function SpecializationSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return SPECIALIZATION_GROUPS;
    return SPECIALIZATION_GROUPS
      .map((g) => ({ ...g, items: g.items.filter((i) => i.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        className={cn(
          "w-full px-2.5 py-1.5 text-[11px] bg-background border rounded-sm flex items-center justify-between gap-1.5 transition-all",
          open
            ? "border-primary/50 ring-2 ring-primary/20"
            : "border-border/60 hover:border-primary/40",
          value ? "text-foreground" : "text-muted-foreground/40",
        )}
      >
        <span className="truncate">{value || "Any specialization…"}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); handleSelect(""); }}
              className="text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronRight className={cn("w-3 h-3 text-muted-foreground/50 transition-transform duration-200", open && "rotate-90")} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border/60 rounded-sm shadow-lg overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/60">
            <Search className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground/40"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground/50 hover:text-foreground transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {/* Clear option */}
            {!query && (
              <button
                onClick={() => handleSelect("")}
                className={cn(
                  "w-full px-2.5 py-1.5 text-left text-[11px] transition-colors",
                  !value
                    ? "text-primary font-medium bg-primary/5"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                )}
              >
                Any specialization
              </button>
            )}

            {filtered.length === 0 ? (
              <p className="px-2.5 py-4 text-[11px] text-muted-foreground/60 text-center">
                No results for "{query}"
              </p>
            ) : (
              filtered.map((g) => (
                <div key={g.group}>
                  {!query && (
                    <p className="px-2.5 pt-2 pb-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 bg-secondary/20">
                      {g.group}
                    </p>
                  )}
                  {g.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "w-full px-2.5 py-1.5 text-left text-[11px] transition-colors",
                        value === item
                          ? "text-primary font-medium bg-primary/5"
                          : "text-foreground hover:bg-secondary/40",
                      )}
                    >
                      {query ? (
                        // Highlight matching text
                        (() => {
                          const idx = item.toLowerCase().indexOf(query.toLowerCase());
                          if (idx === -1) return item;
                          return (
                            <>
                              {item.slice(0, idx)}
                              <span className="font-semibold text-primary">{item.slice(idx, idx + query.length)}</span>
                              {item.slice(idx + query.length)}
                            </>
                          );
                        })()
                      ) : item}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SpecializationSelect;
