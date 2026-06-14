// ─────────────────────────────────────────────────────────────────────────────
// Shared constants for Doctor Profile step components
// ─────────────────────────────────────────────────────────────────────────────
import {
  User,
  GraduationCap,
  Briefcase,
  Award,
  FileText,
  Stethoscope,
  Link2,
} from "lucide-react";
import type { SocialLinksInfo } from "./Types";

export const CURRENCIES = ["RWF", "USD", "EUR"];

export const CONSULTATION_TYPES = [
  { value: "online",    label: "Online only" },
  { value: "in_person", label: "In-person only" },
  { value: "both",      label: "Both" },
];

export const LANGUAGES = [
  { value: "en",   label: "English" },
  { value: "fr",   label: "French" },
  { value: "kiny", label: "Kinyarwanda" },
];

export const COMMON_SPECIALIZATIONS = [
  "General Practice","Internal Medicine","Pediatrics","Surgery",
  "Obstetrics & Gynecology","Cardiology","Dermatology","Neurology",
  "Orthopedics","Psychiatry","Radiology","Anesthesiology",
  "Emergency Medicine","Oncology","Ophthalmology","ENT","Urology",
  "Nephrology","Endocrinology","Infectious Disease","Rheumatology",
  "Pulmonology","Gastroenterology","Hematology",
];

export const SOCIAL_PLATFORMS: Array<{
  key: keyof SocialLinksInfo;
  label: string;
  placeholder: string;
}> = [
  { key: "linkedin",     label: "LinkedIn",         placeholder: "https://linkedin.com/in/your-profile" },
  { key: "twitter",      label: "X / Twitter",      placeholder: "https://x.com/your-handle" },
  { key: "facebook",     label: "Facebook",         placeholder: "https://facebook.com/your-page" },
  { key: "instagram",    label: "Instagram",        placeholder: "https://instagram.com/your-handle" },
  { key: "website",      label: "Personal website", placeholder: "https://yourwebsite.com" },
  { key: "youtube",      label: "YouTube",          placeholder: "https://youtube.com/@your-channel" },
  { key: "researchgate", label: "ResearchGate",     placeholder: "https://researchgate.net/profile/your-name" },
  { key: "orcid",        label: "ORCID",            placeholder: "https://orcid.org/0000-0000-0000-0000" },
];

export const STEPS = [
  { id: "personal"        as const, label: "Personal",        icon: User,          sectionTitle: "Professional information",        description: "Specialization, degree, license, bio & fees" },
  { id: "specializations" as const, label: "Specializations", icon: Stethoscope,   sectionTitle: "Specializations",                 description: "Primary & secondary medical specializations" },
  { id: "education"       as const, label: "Education",       icon: GraduationCap, sectionTitle: "Education history",               description: "Degrees and academic background" },
  { id: "experience"      as const, label: "Experience",      icon: Briefcase,     sectionTitle: "Work experience",                 description: "Past and current positions" },
  { id: "qualifications"  as const, label: "Qualifications",  icon: Award,         sectionTitle: "Certifications & qualifications", description: "Certifications and licenses" },
  { id: "documents"       as const, label: "Documents",       icon: FileText,      sectionTitle: "Upload documents",                description: "Profile photo and official docs" },
  { id: "linksSection"    as const, label: "Social Links",    icon: Link2,         sectionTitle: "Social & online presence",        description: "LinkedIn, website, ResearchGate & more" },
];

export const SPECIALIZATION_MAP: Record<string, string[]> = {
  "Internal Medicine": [
    "Cardiology","Endocrinology","Gastroenterology","Hematology",
    "Infectious Disease","Nephrology","Oncology","Pulmonology",
    "Rheumatology","Geriatrics","Hepatology","Allergy & Immunology",
  ],
  "Surgery": [
    "Cardiothoracic Surgery","Colorectal Surgery","Neurosurgery",
    "Orthopedic Surgery","Pediatric Surgery","Plastic & Reconstructive Surgery",
    "Transplant Surgery","Trauma Surgery","Vascular Surgery",
    "Urological Surgery","Bariatric Surgery","Surgical Oncology",
  ],
  "Pediatrics": [
    "Pediatric Cardiology","Pediatric Endocrinology","Pediatric Gastroenterology",
    "Pediatric Hematology/Oncology","Pediatric Infectious Disease","Pediatric Nephrology",
    "Pediatric Neurology","Pediatric Pulmonology","Neonatology",
    "Pediatric Emergency Medicine","Pediatric Rheumatology","Pediatric Critical Care",
    "Developmental-Behavioral Pediatrics",
  ],
  "Obstetrics & Gynecology": [
    "Maternal-Fetal Medicine","Reproductive Endocrinology & Infertility",
    "Gynecologic Oncology","Urogynecology","Minimally Invasive Gynecologic Surgery",
    "Female Pelvic Medicine","Pediatric & Adolescent Gynecology",
  ],
  "Neurology": [
    "Clinical Neurophysiology","Epilepsy","Movement Disorders","Neurocritical Care",
    "Neuro-Oncology","Neuromuscular Medicine","Sleep Medicine","Stroke Medicine",
    "Behavioral Neurology","Child Neurology","Headache Medicine","Multiple Sclerosis",
  ],
  "Psychiatry": [
    "Addiction Psychiatry","Child & Adolescent Psychiatry","Forensic Psychiatry",
    "Geriatric Psychiatry","Consultation-Liaison Psychiatry","Neuropsychiatry",
    "Sleep Psychiatry","Community Psychiatry","Psychosomatic Medicine",
  ],
  "Radiology": [
    "Interventional Radiology","Neuroradiology","Abdominal Radiology","Breast Imaging",
    "Cardiovascular Radiology","Musculoskeletal Radiology","Pediatric Radiology",
    "Nuclear Medicine","Emergency Radiology","Thoracic Radiology",
  ],
  "Orthopedics": [
    "Spine Surgery","Joint Replacement","Sports Medicine","Hand & Upper Extremity Surgery",
    "Foot & Ankle Surgery","Pediatric Orthopedics","Orthopedic Oncology",
    "Trauma Orthopedics","Shoulder & Elbow Surgery",
  ],
  "Ophthalmology": [
    "Retina & Vitreous","Cornea & External Disease","Glaucoma","Neuro-Ophthalmology",
    "Pediatric Ophthalmology","Oculoplastics","Refractive Surgery","Uveitis","Ocular Oncology",
  ],
  "Otolaryngology (ENT)": [
    "Rhinology","Laryngology","Otology & Neurotology","Head & Neck Surgery",
    "Facial Plastic Surgery","Pediatric ENT","Sleep Surgery","Skull Base Surgery",
  ],
  "Dermatology": [
    "Dermatopathology","Pediatric Dermatology","Dermatologic Surgery","Mohs Surgery",
    "Cosmetic Dermatology","Immunodermatology","Photomedicine","Trichology","Wound Care",
  ],
  "Anesthesiology": [
    "Cardiac Anesthesiology","Pediatric Anesthesiology","Obstetric Anesthesiology",
    "Neuroanesthesiology","Regional Anesthesiology","Pain Medicine",
    "Critical Care Medicine","Thoracic Anesthesiology",
  ],
  "Emergency Medicine": [
    "Pediatric Emergency Medicine","Emergency Medical Services","Toxicology","Ultrasound",
    "Wilderness Medicine","Disaster Medicine","Sports Medicine in EM","Hyperbaric Medicine",
  ],
  "Pathology": [
    "Anatomic Pathology","Clinical Pathology","Forensic Pathology","Hematopathology",
    "Neuropathology","Dermatopathology","Cytopathology","Surgical Pathology",
    "Molecular Pathology","Transfusion Medicine","Pediatric Pathology",
  ],
  "Family Medicine": [
    "Geriatric Medicine","Sports Medicine","Palliative Care","Adolescent Medicine",
    "Rural Medicine","Preventive Medicine","Integrative Medicine","Hospice Medicine",
  ],
  "Urology": [
    "Urologic Oncology","Female Urology","Pediatric Urology","Male Infertility",
    "Endourology","Reconstructive Urology","Neurourology","Kidney Transplant Urology",
  ],
  "Cardiology": [
    "Interventional Cardiology","Electrophysiology","Heart Failure","Echocardiography",
    "Cardiac Imaging","Preventive Cardiology","Pediatric Cardiology",
    "Structural Heart Disease","Cardiac Rehabilitation","Cardiovascular Genetics",
  ],
  "Oncology": [
    "Medical Oncology","Surgical Oncology","Radiation Oncology","Hematologic Oncology",
    "Gynecologic Oncology","Neuro-Oncology","Pediatric Oncology",
    "Gastrointestinal Oncology","Thoracic Oncology","Genitourinary Oncology",
    "Breast Oncology","Palliative Oncology",
  ],
  "Infectious Disease": [
    "HIV/AIDS Medicine","Tropical Medicine","Travel Medicine","Hospital Epidemiology",
    "Antimicrobial Stewardship","Mycology","Virology","Parasitology",
    "Immunocompromised Host",
  ],
  "Nephrology": [
    "Transplant Nephrology","Dialysis Medicine","Onco-Nephrology","Glomerular Disease",
    "Pediatric Nephrology","Hypertension","Critical Care Nephrology","Electrolyte Disorders",
  ],
  "Endocrinology": [
    "Diabetes & Metabolism","Thyroid Disease","Adrenal Disease","Pituitary Disease",
    "Reproductive Endocrinology","Bone & Mineral Metabolism",
    "Neuroendocrinology","Pediatric Endocrinology",
  ],
  "Gastroenterology": [
    "Hepatology","Inflammatory Bowel Disease","Endoscopy","Pancreatic Disease",
    "Motility","Pediatric Gastroenterology","Transplant Hepatology","Gastrointestinal Oncology",
  ],
  "Rheumatology": [
    "Lupus & Connective Tissue Disease","Inflammatory Arthritis","Vasculitis","Scleroderma",
    "Pediatric Rheumatology","Osteoporosis & Bone Disease","Gout & Crystal Arthropathies","Myositis",
  ],
  "Pulmonology": [
    "Critical Care / Intensive Care","Sleep Medicine","Interstitial Lung Disease",
    "Pulmonary Hypertension","Thoracic Oncology","Cystic Fibrosis","COPD & Asthma",
    "Interventional Pulmonology","Lung Transplantation",
  ],
  "Hematology": [
    "Benign Hematology","Hematologic Malignancies","Bone Marrow Transplantation",
    "Coagulation & Thrombosis","Transfusion Medicine","Sickle Cell Disease","Pediatric Hematology",
  ],
  "Physical Medicine & Rehabilitation": [
    "Spinal Cord Injury","Brain Injury Rehabilitation","Musculoskeletal Medicine",
    "Pediatric Rehabilitation","Cancer Rehabilitation","Pain Medicine","Sports Medicine",
    "Electrodiagnostic Medicine",
  ],
  "Nuclear Medicine": [
    "PET/CT Imaging","Thyroid Disease","Bone Scintigraphy","Radionuclide Therapy",
    "Cardiac Nuclear Imaging","Neuro-Nuclear Medicine","Pediatric Nuclear Medicine",
  ],
  "Preventive Medicine": [
    "Occupational Medicine","Aerospace Medicine","Undersea & Hyperbaric Medicine",
    "Public Health & General Preventive Medicine","Medical Toxicology",
    "Clinical Informatics","Lifestyle Medicine",
  ],
  "Genetics & Genomics": [
    "Clinical Genetics","Biochemical Genetics","Molecular Genetics","Cytogenetics",
    "Cancer Genetics","Neurogenetics","Pharmacogenomics","Prenatal Genetics",
  ],
  "General Practice": [],
};

export const PRIMARY_SPECIALIZATIONS = Object.keys(SPECIALIZATION_MAP).sort();
