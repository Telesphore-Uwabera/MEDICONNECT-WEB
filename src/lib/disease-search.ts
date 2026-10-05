export type DiseaseMatch = {
  specialization: string;
  feeId: number;
};

type DiseaseEntry = DiseaseMatch & { terms: string[] };

const DISEASES: DiseaseEntry[] = [
  {
    specialization: "General Practitioner",
    feeId: 1,
    terms: [
      "fever", "fievre", "umuriro",
      "fatigue", "umunaniro",
      "cold", "flu", "grippe", "ibicurane",
      "checkup", "check up", "isuzuma", "consultation generale",
      "chills", "gutitira",
    ],
  },
  {
    specialization: "Internal Medicine",
    feeId: 2,
    terms: [
      "diabetes", "diabete", "diyabete", "isukari", "indwara y isukari",
      "hypertension", "umuvuduko w amaraso", "tension",
      "anemia", "anemie",
    ],
  },
  {
    specialization: "Infectious Disease",
    feeId: 19,
    terms: [
      "malaria", "malariya", "paludisme",
      "typhoid", "typhoide",
      "hiv", "sida",
      "tuberculosis", "tb", "igituntu",
      "covid", "hepatitis", "hepatite",
    ],
  },
  {
    specialization: "Cardiology",
    feeId: 17,
    terms: [
      "heart", "cardiac", "cardiology", "umutima", "coeur",
      "chest pain", "ububabare bwo mu gatuza", "douleur thoracique",
      "palpitations", "umutima uteragura",
      "heart failure", "heart attack",
    ],
  },
  {
    specialization: "Pulmonology",
    feeId: 24,
    terms: [
      "asthma", "asima", "asthme",
      "bronchitis", "bronchite",
      "cough", "inkorora", "toux",
      "pneumonia", "pneumonie",
      "shortness of breath", "kubura umwuka",
    ],
  },
  {
    specialization: "Dermatology",
    feeId: 12,
    terms: [
      "eczema", "eczema",
      "rash", "acne", "acné", "uruhu", "peau", "skin",
      "dermatitis",
    ],
  },
  {
    specialization: "Neurology",
    feeId: 6,
    terms: [
      "headache", "migraine", "kubabara umutwe", "mal de tete",
      "seizure", "igicuri", "epilepsy", "epilepsie",
      "stroke", "dizziness", "kuzungera", "vertige",
    ],
  },
  {
    specialization: "Psychiatry",
    feeId: 7,
    terms: [
      "depression", "depression", "anxiety", "anxiete",
      "mental", "ubwenge", "psychiatry", "psychiatrie",
      "counseling", "ubujyanama",
    ],
  },
  {
    specialization: "Ophthalmology",
    feeId: 10,
    terms: [
      "eye", "eyes", "amaso", "oeil", "yeux",
      "conjunctivitis", "vision",
    ],
  },
  {
    specialization: "Orthopedics",
    feeId: 9,
    terms: [
      "fracture", "bone", "amagufwa", "os",
      "back pain", "joint pain", "arthritis", "arthrite",
    ],
  },
  {
    specialization: "Gastroenterology",
    feeId: 22,
    terms: [
      "diarrhea", "diarrhoea", "impiswi", "diarrhee",
      "ulcer", "ulcere",
      "abdominal pain", "ububabare bwo mu nda", "mal au ventre",
      "vomiting", "kuruka", "vomissement",
      "constipation", "kwituma bigoye",
    ],
  },
  {
    specialization: "Obstetrics & Gynecology",
    feeId: 5,
    terms: [
      "pregnancy", "pregnant", "ubutwite", "grossesse", "enceinte",
      "menstruation", "gynecology", "gynecologie",
    ],
  },
  {
    specialization: "Urology",
    feeId: 16,
    terms: ["urinary", "uti", "urine", "inkari", "urologie"],
  },
  {
    specialization: "Pediatrics",
    feeId: 4,
    terms: ["child fever", "pediatric", "pediatrie", "ubuvuzi bw abana"],
  },
];

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchDisease(query: string): DiseaseMatch | null {
  const folded = fold(query);
  if (folded.length < 3) return null;

  let best: { match: DiseaseMatch; length: number } | null = null;
  for (const entry of DISEASES) {
    for (const term of entry.terms) {
      const foldedTerm = fold(term);
      if (foldedTerm.length < 3) continue;
      const hit =
        folded === foldedTerm ||
        folded.includes(foldedTerm) ||
        (folded.length >= 4 && foldedTerm.startsWith(folded));
      if (!hit) continue;
      if (!best || foldedTerm.length > best.length) {
        best = {
          match: { specialization: entry.specialization, feeId: entry.feeId },
          length: foldedTerm.length,
        };
      }
    }
  }
  return best?.match ?? null;
}

export function doctorSearchForDisease(query: string) {
  const match = matchDisease(query);
  if (!match) return null;
  const params = new URLSearchParams({
    specialization: match.specialization,
    specialization_fee_id: String(match.feeId),
    disease: "1",
    concern: query.trim(),
  });
  return `/patient/search-doctors?${params.toString()}`;
}
