/**
 * One-shot filler for locale gaps. Safe to re-run: it only writes a value when
 * the locale is missing the key or the value is still identical to English.
 */
import fs from "fs";
import path from "path";

const root = path.resolve("src/locales");
const files = fs.readdirSync(path.join(root, "en")).filter((f) => f.endsWith(".json"));

const frByEn = {
  Accepted: "Accepté",
  Active: "Actif",
  Address: "Adresse",
  Age: "Âge",
  Appointment: "Rendez-vous",
  Approve: "Approuver",
  Cancelled: "Annulé",
  Cardiovascular: "Cardiovasculaire",
  Change: "Modifier",
  Close: "Fermer",
  Completed: "Terminé",
  Coverage: "Couverture",
  Created: "Créé",
  Days: "Jours",
  Decision: "Décision",
  Degree: "Diplôme",
  Department: "Département",
  Details: "Détails",
  Diagnosis: "Diagnostic",
  Duration: "Durée",
  Eczema: "Eczéma",
  Fee: "Frais",
  Finance: "Finances",
  Frequency: "Fréquence",
  Fulfill: "Exécuter",
  Gastrointestinal: "Gastro-intestinal",
  General: "Général",
  Gradual: "Progressif",
  Hours: "Heures",
  Insurance: "Assurance",
  Interval: "Intervalle",
  License: "Licence",
  "Max pts": "Pts max",
  Mild: "Léger",
  Moderate: "Modéré",
  Months: "Mois",
  Name: "Nom",
  Neurological: "Neurologique",
  "Not set": "Non défini",
  "OTP code": "Code OTP",
  Optional: "Facultatif",
  People: "Personnes",
  Phone: "Téléphone",
  Pickup: "Retrait",
  Platform: "Plateforme",
  Profile: "Profil",
  Qty: "Qté",
  Reason: "Motif",
  Receive: "Recevoir",
  Reject: "Rejeter",
  Rejected: "Rejeté",
  Request: "Demande",
  "Requested:": "Demandé :",
  Respiratory: "Respiratoire",
  Room: "Salle",
  "Rows:": "Lignes :",
  "Searching...": "Recherche…",
  Set: "Définir",
  Severe: "Sévère",
  Showing: "Affichage",
  Signed: "Signé",
  Slug: "Identifiant",
  Sudden: "Soudain",
  Summary: "Résumé",
  System: "Système",
  Temp: "Temp.",
  "Temp (C)": "Temp. (°C)",
  Temperature: "Température",
  Time: "Heure",
  Timeline: "Chronologie",
  Unpaid: "Impayé",
  Video: "Vidéo",
  "View PDF": "Voir le PDF",
  Website: "Site web",
  Weeks: "Semaines",
  "API URL": "URL de l'API",
  "API key": "Clé API",
  "units.": "unités.",
  "Booked by": "Réservé par",
  "Card view": "Vue en cartes",
  "New email": "Nouvel e-mail",
  "Auth type": "Type d'authentification",
  "Last sync": "Dernière synchronisation",
  "Issued By": "Émis par",
  "Issued At": "Émis le",
  "Table view": "Vue en tableau",
  "Name (A-Z)": "Nom (A-Z)",
  "Not signed": "Non signé",
  "Basic auth": "Authentification basique",
  "Secret key": "Clé secrète",
  "Avg. Order": "Commande moy.",
  "Legal URLs": "Liens juridiques",
  "Age {{age}}": "Âge {{age}}",
  "Add symptom": "Ajouter un symptôme",
  "New Request": "Nouvelle demande",
  "Valid until": "Valable jusqu'au",
  "Review Info": "Informations de révision",
  "Reviewed at": "Révisé le",
  "Verified at": "Vérifié le",
  "Full report": "Rapport complet",
  "Privacy URL": "Lien de confidentialité",
  "Valid Until": "Valable jusqu'au",
  "Mobile money": "Argent mobile",
  "Patient pays": "Le patient paie",
  "Newest first": "Plus récent d'abord",
  "Oldest first": "Plus ancien d'abord",
  "Requested By": "Demandé par",
  "Download PDF": "Télécharger le PDF",
  "View QR Code": "Voir le code QR",
  "Country code": "Indicatif du pays",
  "Current mode": "Mode actuel",
  "Bearer token": "Jeton Bearer",
  "items synced": "éléments synchronisés",
  "Sync queued.": "Synchronisation mise en file.",
  "{{count}}d left": "{{count}} j restants",
  "{{count}} units": "{{count}} unités",
  "Cannot Cancel": "Annulation impossible",
  "Skip pharmacy": "Passer la pharmacie",
  "Home delivery": "Livraison à domicile",
  "Receive Stock": "Recevoir le stock",
  "Current email": "E-mail actuel",
  "Changing from": "Modification depuis",
  "Current phone": "Téléphone actuel",
  "Provider name": "Nom du fournisseur",
  "Sync interval": "Intervalle de synchronisation",
  "Extra headers": "En-têtes supplémentaires",
  "Top Medicines": "Médicaments principaux",
  "Bio (Français)": "Biographie (Français)",
  "Bio ({{lang}})": "Biographie ({{lang}})",
  "Payment status": "Statut du paiement",
  "Payment method": "Mode de paiement",
  "Delivery notes": "Notes de livraison",
  "Main complaint": "Plainte principale",
  "Submit Request": "Envoyer la demande",
  "Reject Request": "Rejeter la demande",
  "Total requests": "Total des demandes",
  "Help & Contact": "Aide et contact",
  "Patient #{{id}}": "Patient n° {{id}}",
  "For {{patient}}": "Pour {{patient}}",
  "Confirm Receipt": "Confirmer la réception",
  "Loading logs...": "Chargement des journaux…",
  "Clear selection": "Effacer la sélection",
  "Rejection reason": "Motif du rejet",
  "Send to Pharmacy": "Envoyer à la pharmacie",
  "Delivery address": "Adresse de livraison",
  "Restock Requests": "Demandes de réapprovisionnement",
  "Rejection Reason": "Motif du rejet",
  "Connect provider": "Connecter le fournisseur",
  "cannot be undone": "cette action est irréversible",
  "Search medicines": "Rechercher des médicaments",
  "{{count}} orders": "{{count}} commandes",
  "Avg. order value": "Valeur moyenne des commandes",
  "Pharmacy is open": "La pharmacie est ouverte",
  "{{count}} synced": "{{count}} synchronisés",
  "{{count}} failed": "{{count}} échoués",
  "Bio (Kinyarwanda)": "Biographie (Kinyarwanda)",
  "Consultation type": "Type de consultation",
  "Insurance covered": "Couvert par l'assurance",
  "Skip prescription": "Passer l'ordonnance",
  "No medicine found": "Aucun médicament trouvé",
  "Review of Systems": "Revue des systèmes",
  "Severe chest pain": "Douleur thoracique sévère",
  "Stock: Most first": "Stock : les plus élevés d'abord",
  "New Stock Request": "Nouvelle demande de stock",
  "Select a provider": "Choisir un fournisseur",
  "No sync logs yet.": "Aucun journal de synchronisation pour le moment.",
  "Provider updated.": "Fournisseur mis à jour.",
  "Provider removed.": "Fournisseur retiré.",
  "Revenue Breakdown": "Répartition des revenus",
  "Overview & Orders": "Aperçu et commandes",
  "Check back later.": "Revenez plus tard.",
  "Quick Prescription": "Ordonnance rapide",
  "Add another system": "Ajouter un autre système",
  "Stock: Least first": "Stock : les plus bas d'abord",
  "Price: Low to high": "Prix : du plus bas au plus élevé",
  "Price: High to low": "Prix : du plus élevé au plus bas",
  "Date: Newest first": "Date : plus récent d'abord",
  "Date: Oldest first": "Date : plus ancien d'abord",
  "Requested Quantity": "Quantité demandée",
  "Switch to external": "Passer à l'externe",
  "Select a medicine?": "Choisir un médicament ?",
  "No low stock items": "Aucun article en stock faible",
  "{{count}} in queue": "{{count}} dans la file",
  "Effective {{date}}": "En vigueur le {{date}}",
  "Certificate Number": "Numéro du certificat",
  "- Patient, {{city}}": "· Patient, {{city}}",
  "No pharmacies found": "Aucune pharmacie trouvée",
  "Loading requests...": "Chargement des demandes…",
  "No medicines listed": "Aucun médicament listé",
  "Marked as reviewing": "Marqué comme en cours d'examen",
  "Repeat new password": "Répéter le nouveau mot de passe",
  "Prescription issued.": "Ordonnance émise.",
  "Loading medicines...": "Chargement des médicaments…",
  "Loading providers...": "Chargement des fournisseurs…",
  "e.g. Acute bronchitis": "p. ex. Bronchite aiguë",
  "/ 5 ({{total}} total)": "/ 5 ({{total}} au total)",
  "Prescription Requests": "Demandes d'ordonnance",
  "Medicines: Most first": "Médicaments : les plus nombreux d'abord",
  "Stock request #{{id}}": "Demande de stock n° {{id}}",
  "No stock requests yet": "Aucune demande de stock pour le moment",
  "Your current password": "Votre mot de passe actuel",
  "At least 8 characters": "Au moins 8 caractères",
  "Confirm your identity": "Confirmez votre identité",
  "No provider selected.": "Aucun fournisseur sélectionné.",
  "{{count}} data points": "{{count}} points de données",
  "No out-of-stock items": "Aucun article en rupture",
  "Find and book doctors": "Trouver et réserver un médecin",
  "Failed to load details": "Impossible de charger les détails",
  "No {{status}} bookings": "Aucune réservation « {{status}} »",
  "Follow-up instructions": "Instructions de suivi",
  "Medicines: Least first": "Médicaments : les moins nombreux d'abord",
  "Confirming receipt for": "Confirmation de réception pour",
  "No items expiring soon": "Aucun article n'expire bientôt",
  "max {{count}} patients": "max. {{count}} patients",
  "Terms & conditions URL": "Lien des conditions générales",
  "Find health facilities": "Trouver des établissements de santé",
  "Failed to load bookings": "Impossible de charger les réservations",
  "Enter primary diagnosis": "Saisir le diagnostic principal",
  "Severity classification": "Classification de la gravité",
  "Failed to load requests": "Impossible de charger les demandes",
  "Prescription is expired": "L'ordonnance est expirée",
  "Sign in to your account": "Connectez-vous à votre compte",
  "Participants ({{count}})": "{{count}} participants",
  "Patient delivery address": "Adresse de livraison du patient",
  "Editing existing summary": "Modification du résumé existant",
  "No pending prescriptions": "Aucune ordonnance en attente",
  "Failed to load dashboard": "Impossible de charger le tableau de bord",
  "Access pharmacy services": "Accéder aux services de la pharmacie",
  "Add symptom to {{system}}": "Ajouter un symptôme à {{system}}",
  "{{count}} completed today": "{{count}} terminés aujourd'hui",
  "Search by name or generic?": "Rechercher par nom ou par générique ?",
  "Try a different search term": "Essayez un autre terme de recherche",
  "Describe the main complaint": "Décrivez la plainte principale",
  "Severe breathing difficulty": "Difficulté respiratoire sévère",
  "leave blank for full amount": "laisser vide pour le montant total",
  "Failed to load prescriptions": "Impossible de charger les ordonnances",
  "No prescription requests yet": "Aucune demande d'ordonnance pour le moment",
  "inventory items ? sync every": "articles d'inventaire · synchroniser toutes les",
  "External provider connected.": "Fournisseur externe connecté.",
  "e.g. Running low on this one": "p. ex. Stock bientôt épuisé",
  "Could not issue prescription.": "Impossible d'émettre l'ordonnance.",
  "Use custom medicine: {{name}}": "Utiliser le médicament personnalisé : {{name}}",
  "Where is the symptom located?": "Où se situe le symptôme ?",
  "Search medicine, requester...": "Rechercher un médicament, un demandeur…",
  "{{change}} vs previous period": "{{change}} par rapport à la période précédente",
  "e.g. Out of budget this month": "p. ex. Hors budget ce mois-ci",
  "Could not cancel this booking.": "Impossible d'annuler cette réservation.",
  "Could not create prescription.": "Impossible de créer l'ordonnance.",
  "Prescription sent to pharmacy.": "Ordonnance envoyée à la pharmacie.",
  "Severe / uncontrolled bleeding": "Saignement sévère ou non contrôlé",
  "No requests match your filters": "Aucune demande ne correspond à vos filtres",
  "No external provider connected": "Aucun fournisseur externe connecté",
  'No medicines match "{{query}}"': "Aucun médicament ne correspond à « {{query}} »",
  "e.g. MC-FIT-3BEU-20260706-7290": "p. ex. MC-FIT-3BEU-20260706-7290",
  "This certificate is authentic.": "Ce certificat est authentique.",
  "Certifications & qualifications": "Certifications et qualifications",
  "Booking cancelled successfully.": "Réservation annulée.",
  "Search or type medicine name...": "Rechercher ou saisir le nom du médicament…",
  "Additional notes for the patient": "Notes supplémentaires pour le patient",
  "Create one using the button above": "Créez-en une avec le bouton ci-dessus",
  "Search patient, diagnosis, Rx#...": "Rechercher un patient, un diagnostic, un n° d'ordonnance…",
  "Extra headers must be valid JSON.": "Les en-têtes supplémentaires doivent être un JSON valide.",
  "~{{minutes}} min - {{fulfillment}}": "~{{minutes}} min — {{fulfillment}}",
  "Service bookings ({{total}} total)": "Réservations de services ({{total}} au total)",
  "Your account details and preferences": "Les détails et préférences de votre compte",
  "Extra headers must be a JSON object.": "Les en-têtes supplémentaires doivent être un objet JSON.",
  "Qty: {{quantity}} - Expires {{date}}": "Qté : {{quantity}} — expire le {{date}}",
  "Your service bookings will appear here": "Vos réservations de services apparaîtront ici",
  "Something went wrong. Please try again.": "Une erreur s'est produite. Veuillez réessayer.",
  "Common things you can do on {{appName}}": "Actions courantes sur {{appName}}",
  "Could not send prescription to pharmacy.": "Impossible d'envoyer l'ordonnance à la pharmacie.",
  "Document plan, counseling, and next steps": "Documentez le plan, les conseils et les prochaines étapes",
  "Review and fulfill incoming prescriptions": "Examiner et exécuter les ordonnances reçues",
  "Add a diagnosis and at least one medicine.": "Ajoutez un diagnostic et au moins un médicament.",
  "Page {{page}} of {{pages}} ({{total}} total)": "Page {{page}} sur {{pages}} ({{total}} au total)",
  "{{services}} services - {{patients}} patients": "{{services}} services — {{patients}} patients",
  "Request a medicine restock from your supplier": "Demander un réapprovisionnement à votre fournisseur",
  "Enter the 6-digit code sent to your new email.": "Saisissez le code à 6 chiffres envoyé à votre nouvel e-mail.",
  "Enter a certificate number above to verify it.": "Saisissez un numéro de certificat ci-dessus pour le vérifier.",
  "Choose a pharmacy to receive this prescription.": "Choisissez une pharmacie pour recevoir cette ordonnance.",
  "Enter your password to confirm account deletion.": "Saisissez votre mot de passe pour confirmer la suppression du compte.",
  "This prescription has no medicine items attached.": "Cette ordonnance ne contient aucun médicament.",
  "Manage external stock APIs and trigger manual syncs.": "Gérez les API de stock externes et lancez des synchronisations manuelles.",
  "No current privacy policy document is available yet.": "Aucun document de politique de confidentialité n'est disponible pour le moment.",
  "We couldn't find a certificate matching this number.": "Nous n'avons pas trouvé de certificat correspondant à ce numéro.",
  "Enter the 6-digit code sent to your new phone number.": "Saisissez le code à 6 chiffres envoyé à votre nouveau numéro.",
  "Find pharmacies and medicine-related services near you.": "Trouvez des pharmacies et des services liés aux médicaments près de chez vous.",
  'Optional JSON object, e.g. {"X-Client-Id":"mediconnect"}': 'Objet JSON facultatif, p. ex. {"X-Client-Id":"mediconnect"}',
  "Powered by MediConnect - Bringing care to your fingertips": "Propulsé par MediConnect — Des soins à portée de main",
  "Use medicines and stock saved directly inside MediConnect.": "Utilisez les médicaments et le stock enregistrés directement dans MediConnect.",
  "No current terms and conditions document is available yet.": "Aucun document de conditions générales n'est disponible pour le moment.",
  "Create, approve, receive, and track medicine restock requests": "Créer, approuver, recevoir et suivre les demandes de réapprovisionnement",
  "An OTP will be sent to your new number to confirm the change.": "Un code OTP sera envoyé à votre nouveau numéro pour confirmer le changement.",
  "An OTP will be sent to your new address to confirm the change.": "Un code OTP sera envoyé à votre nouvelle adresse pour confirmer le changement.",
  "Permanently removes your account and revokes all active sessions": "Supprime définitivement votre compte et révoque toutes les sessions actives",
  "Browse registered health facilities, clinics, and care services.": "Parcourez les établissements de santé, cliniques et services de soins enregistrés.",
  "Connect one above before switching fully to external inventory mode.": "Connectez-en un ci-dessus avant de passer entièrement au stock externe.",
  "Search available doctors and book consultations online or in person.": "Recherchez des médecins disponibles et prenez rendez-vous en ligne ou en personne.",
  "Min 8 characters, mixed case and numbers. Logs out all other devices.": "8 caractères minimum, majuscules, minuscules et chiffres. Déconnecte les autres appareils.",
  "Cancel {{service}} at {{facility}} on {{date}}. This cannot be undone.": "Annuler {{service}} à {{facility}} le {{date}}. Cette action est irréversible.",
  "Prepare connection details for systems like Ishyiga or another stock API.": "Préparez les informations de connexion pour des systèmes comme Ishyiga ou une autre API de stock.",
  "Access your patient, doctor, health facility, pharmacy, or admin workspace.": "Accédez à votre espace patient, médecin, établissement, pharmacie ou administration.",
  "Could not load external providers. Make sure the pharmacy profile is active.": "Impossible de charger les fournisseurs externes. Vérifiez que le profil de la pharmacie est actif.",
  "Choose whether stock comes from MediConnect data or an external pharmacy system.": "Choisissez si le stock provient des données MediConnect ou d'un système de pharmacie externe.",
  "Pharmacy profile was not found or is inactive, so the inventory mode could not be loaded.": "Le profil de la pharmacie est introuvable ou inactif : le mode d'inventaire n'a pas pu être chargé.",
  "Double-check the certificate number and try again, or contact the issuing doctor if you believe this is a mistake.": "Vérifiez le numéro du certificat et réessayez, ou contactez le médecin émetteur si vous pensez qu'il s'agit d'une erreur.",
  "Once you delete your account, all your data will be permanently erased and a farewell email will be sent. This action": "Une fois le compte supprimé, toutes vos données seront effacées définitivement et un e-mail d'adieu sera envoyé. Cette action",
  "Add the pharmacy stock API connection. Secrets are sent only when connecting and are hidden by the backend afterwards.": "Ajoutez la connexion à l'API de stock de la pharmacie. Les secrets ne sont envoyés qu'au moment de la connexion, puis masqués par le serveur.",
  "Get support for {{appName}}, contact our team, or learn how to use the platform for doctors, health facilities, pharmacies, and patients.": "Obtenez de l'aide pour {{appName}}, contactez notre équipe ou découvrez comment utiliser la plateforme pour les médecins, les établissements, les pharmacies et les patients.",
  "Browse by speciality": "Parcourir par spécialité",
  "{{count}} verified specialist across our network": "{{count}} spécialiste vérifié dans notre réseau",
  "{{count}} verified specialists across our network": "{{count}} spécialistes vérifiés dans notre réseau",
  "Paid 5,000 FRW requests appear here for review, video identity check, and signing.": "Les demandes payées de 5 000 FRW apparaissent ici pour examen, vérification d'identité par vidéo et signature.",
};

const rwByEn = {
  Cookies: "Amakuki",
  Consultations: "Ibiganiro",
  Eczema: "Egzema",
  Video: "Videwo",
  "Browse by speciality": "Shakisha ukurikije ubuhanga",
  "{{count}} verified specialist across our network": "Umuganga {{count}} wemejwe muri uru rusobe",
  "{{count}} verified specialists across our network": "Abaganga {{count}} bemejwe muri uru rusobe",
  "Pharmacy orders": "Ibisabwa muri farumasi",
  "Facility visits": "Gusura ivuriro",
  "In-person bookings at health facilities": "Gahunda zo kugana ivuriro ubwite",
  Referrals: "Kohereza umurwayi",
  "Send patients to another doctor or facility": "Ohereza abarwayi ku wundi muganga cyangwa ku kigo nderabuzima",
  "Pharmacy Rx": "Ordonansi ya farumasi",
  "Prescriptions patients can send to a pharmacy": "Ordonansi umurwayi ashobora kohereza muri farumasi",
  "Paid 5,000 FRW requests appear here for review, video identity check, and signing.": "Ibisabwa byishyuwe 5.000 FRW bigaragara hano kugira ngo bisuzumwe, haboneke umwirondoro kuri videwo, hakanasinywe.",
  "Care loop": "Urugendo rw'ubuvuzi",
  "Patient bookings, affiliated doctor visits, referrals, and prescriptions from the same care network.": "Gahunda z'abarwayi, gusura abaganga bafatanije, kohereza abarwayi, n'ordonansi zo mu rusobe rumwe rw'ubuvuzi.",
  "Patient bookings": "Gahunda z'abarwayi",
  "Doctor visits": "Gusura abaganga",
  "Doctor prescriptions": "Ordonansi z'abaganga",
  "All time": "Igihe cyose",
  "Doctors send prescriptions here. Patients place orders from those prescriptions or from the marketplace.": "Abaganga bohereza ordonansi hano. Abarwayi basaba imiti bashingiye kuri izo ordonansi cyangwa ku isoko.",
  "Awaiting action": "Bitegereje igikorwa",
  "Patient orders": "Ibisabwa n'abarwayi",
};

const ensure = {
  "pages.json::landing.store_coming_soon": {
    en: "Coming soon",
    fr: "Bientôt disponible",
    rw: "Biraza vuba",
  },
  "pages.json::cards.bookings_open": {
    en: "Accepting bookings",
    fr: "Réservations ouvertes",
    rw: "Gahunda ziri gufungura",
  },
  "pages.json::cards.bookings_closed": {
    en: "Bookings closed",
    fr: "Réservations fermées",
    rw: "Gahunda zafunze",
  },
  "pages.json::cards.departments_label": {
    en: "departments",
    fr: "départements",
    rw: "ibice",
  },
  "admin.json::overview.pending_appointments": {
    en: "Pending appointments",
    fr: "Rendez-vous en attente",
    rw: "Gahunda zitegereje",
  },
  "admin.json::overview.active_consultations": {
    en: "Active consultations",
    fr: "Consultations en cours",
    rw: "Ibiganiro biri gukorwa",
  },
  "admin.json::overview.open_certificates": {
    en: "Open certificates",
    fr: "Certificats ouverts",
    rw: "Ibyemezo bifunguye",
  },
  "admin.json::overview.awaiting_approval": {
    en: "Awaiting approval",
    fr: "En attente d'approbation",
    rw: "Bitegereje kwemezwa",
  },
  "admin.json::overview.manage": {
    en: "Manage",
    fr: "Gérer",
    rw: "Gucunga",
  },
  "admin.json::overview.appointments": {
    en: "Appointments",
    fr: "Rendez-vous",
    rw: "Gahunda",
  },
  "admin.json::overview.view_all": {
    en: "View all",
    fr: "Tout voir",
    rw: "Reba byose",
  },
  "admin.json::overview.total": {
    en: "Total",
    fr: "Total",
    rw: "Igiteranyo",
  },
  "admin.json::overview.today": {
    en: "Today",
    fr: "Aujourd'hui",
    rw: "Uyu munsi",
  },
  "admin.json::overview.pending": {
    en: "Pending",
    fr: "En attente",
    rw: "Bitegereje",
  },
  "admin.json::overview.certificates": {
    en: "Certificates",
    fr: "Certificats",
    rw: "Ibyemezo",
  },
  "admin.json::overview.track": {
    en: "Track",
    fr: "Suivre",
    rw: "Kurikirana",
  },
  "admin.json::overview.issued": {
    en: "Issued",
    fr: "Émis",
    rw: "Byatanzwe",
  },
  "admin.json::overview.with_doctor": {
    en: "With doctor",
    fr: "Chez le médecin",
    rw: "Kuri muganga",
  },
  "admin.json::overview.awaiting_pay": {
    en: "Awaiting pay",
    fr: "Paiement en attente",
    rw: "Kwishyura bitegereje",
  },
  "admin.json::overview.revenue": {
    en: "Revenue",
    fr: "Revenus",
    rw: "Amafaranga yinjira",
  },
  "admin.json::overview.total_revenue": {
    en: "Total revenue",
    fr: "Revenu total",
    rw: "Amafaranga yose yinjira",
  },
  "admin.json::overview.todays_revenue": {
    en: "Today's revenue",
    fr: "Revenu du jour",
    rw: "Amafaranga y'uyu munsi",
  },
  "admin.json::overview.pending_payments": {
    en: "Pending payments",
    fr: "Paiements en attente",
    rw: "Kwishyura bitegereje",
  },
  "admin.json::overview.currency": {
    en: "Currency",
    fr: "Devise",
    rw: "Ifaranga",
  },
  "admin.json::overview.quick_actions": {
    en: "Quick actions",
    fr: "Actions rapides",
    rw: "Ibikorwa byihuse",
  },
  "admin.json::overview.manage_users": {
    en: "Manage users",
    fr: "Gérer les utilisateurs",
    rw: "Gucunga abakoresha",
  },
  "admin.json::overview.flagged_accounts": {
    en: "Flagged accounts",
    fr: "Comptes signalés",
    rw: "Konti zagaragajwe",
  },
  "admin.json::overview.system_reports": {
    en: "System reports",
    fr: "Rapports du système",
    rw: "Raporo za sisitemu",
  },
  "admin.json::overview.search_placeholder": {
    en: "Name, phone, invoice…",
    fr: "Nom, téléphone, facture…",
    rw: "Izina, telefoni, fagitire…",
  },
  "admin.json::overview.load_error": {
    en: "Failed to load dashboard data. Please try again.",
    fr: "Impossible de charger le tableau de bord. Veuillez réessayer.",
    rw: "Ntibishoboye gupakira amakuru y'incamake. Ongera ugerageze.",
  },
  "admin.json::ui.support_booking_desk": {
    en: "Support booking desk",
    fr: "Bureau de réservation du support",
    rw: "Ibiro byo gufasha gufata gahunda",
  },
  "admin.json::ui.legal_documents": {
    en: "Legal documents",
    fr: "Documents juridiques",
    rw: "Inyandiko z'amategeko",
  },
  "admin.json::ui.current_version": {
    en: "Current version",
    fr: "Version actuelle",
    rw: "Verisiyo iriho",
  },
  "admin.json::ui.inactive_documents_hint": {
    en: "Inactive documents remain saved but hidden publicly.",
    fr: "Les documents inactifs restent enregistrés mais cachés au public.",
    rw: "Inyandiko zidakora zigasigara zibitswe ariko zihishwe ku mugaragaro.",
  },
  "admin.json::ui.failed_review": {
    en: "Failed to load review details.",
    fr: "Impossible de charger les détails de l'avis.",
    rw: "Ntibishoboye gupakira ibisobanuro by'isuzuma.",
  },
  "admin.json::ui.no_comment": {
    en: "No comment",
    fr: "Aucun commentaire",
    rw: "Nta gisobanuro",
  },
  "admin.json::ui.date_of_birth": {
    en: "Date of birth",
    fr: "Date de naissance",
    rw: "Italiki y'amavuko",
  },
  "admin.json::ui.failed_pharmacies": {
    en: "Failed to load pharmacies",
    fr: "Impossible de charger les pharmacies",
    rw: "Ntibishoboye gupakira farumasi",
  },
  "admin.json::ui.check_connection": {
    en: "Check your connection and try again",
    fr: "Vérifiez votre connexion et réessayez",
    rw: "Reba umuyoboro wawe wongere ugerageze",
  },
  "admin.json::ui.no_pharmacies_match": {
    en: "No pharmacies match your filters",
    fr: "Aucune pharmacie ne correspond à vos filtres",
    rw: "Nta farumasi ihuye n'ibyo wahisemo",
  },
  "admin.json::ui.widen_search": {
    en: "Try widening your search criteria",
    fr: "Élargissez vos critères de recherche",
    rw: "Gerageza kwagura ibyo ushaka",
  },
  "admin.json::ui.operating_hours": {
    en: "Operating hours",
    fr: "Heures d'ouverture",
    rw: "Amasaha y'akazi",
  },
  "admin.json::ui.hours_not_specified": {
    en: "Hours not specified",
    fr: "Heures non précisées",
    rw: "Amasaha ntabwo yagaragajwe",
  },
  "admin.json::ui.fulfilment": {
    en: "Fulfilment",
    fr: "Exécution",
    rw: "Gusohoza",
  },
  "admin.json::ui.social_links": {
    en: "Social links",
    fr: "Liens sociaux",
    rw: "Imiyoboro y'imbuga nkoranyambaga",
  },
  "admin.json::ui.admin_account": {
    en: "Admin account",
    fr: "Compte administrateur",
    rw: "Konti y'umuyobozi",
  },
  "admin.json::ui.pharmacy_profile": {
    en: "Pharmacy profile",
    fr: "Profil de la pharmacie",
    rw: "Umwirondoro wa farumasi",
  },
  "admin.json::ui.review_status_hint": {
    en: "Review details and manage account status",
    fr: "Examinez les détails et gérez le statut du compte",
    rw: "Suzuma ibisobanuro ugenzure uko konti ihagaze",
  },
  "admin.json::ui.facility_profile": {
    en: "Health facility profile",
    fr: "Profil de l'établissement de santé",
    rw: "Umwirondoro w'ikigo nderabuzima",
  },
  "admin.json::ui.affiliated_facilities": {
    en: "Affiliated health facilities",
    fr: "Établissements de santé affiliés",
    rw: "Ibigo nderabuzima bifatanije",
  },
  "admin.json::ui.license_expiry": {
    en: "License expiry",
    fr: "Expiration de la licence",
    rw: "Igihe uruhushya rurarangirira",
  },
  "admin.json::ui.expiry_saved": {
    en: "Expiry date saved.",
    fr: "Date d'expiration enregistrée.",
    rw: "Itariki yo kurangira yabitswe.",
  },
  "admin.json::ui.uploaded_documents": {
    en: "Uploaded documents",
    fr: "Documents téléversés",
    rw: "Inyandiko zashyizweho",
  },
  "admin.json::ui.renewed_license": {
    en: "Renewed medical license",
    fr: "Licence médicale renouvelée",
    rw: "Uruhushya rw'ubuvuzi rwavuguruwe",
  },
  "admin.json::ui.renewed_license_saved": {
    en: "Renewed license saved.",
    fr: "Licence renouvelée enregistrée.",
    rw: "Uruhushya rwavuguruwe rwabitswe.",
  },
  "admin.json::ui.fee_configuration": {
    en: "Fee configuration",
    fr: "Configuration des tarifs",
    rw: "Igena ry'ibiciro",
  },
  "admin.json::ui.set_fee_override": {
    en: "Set fee override",
    fr: "Définir un tarif exceptionnel",
    rw: "Shyiraho igiciro cyihariye",
  },
  "admin.json::ui.suspend_doctor": {
    en: "Suspend doctor",
    fr: "Suspendre le médecin",
    rw: "Hagarika umuganga",
  },
  "admin.json::ui.loading": {
    en: "Loading...",
    fr: "Chargement…",
    rw: "Birimo gupakira…",
  },
  "admin.json::ui.payout_amount": {
    en: "Payout amount",
    fr: "Montant du versement",
    rw: "Amafaranga yo kwishyura",
  },
  "admin.json::ui.delete_wallet": {
    en: "Delete wallet?",
    fr: "Supprimer le portefeuille ?",
    rw: "Siba ikofi?",
  },
  "admin.json::ui.main_wallet": {
    en: "Main Wallet",
    fr: "Portefeuille principal",
    rw: "Ikofi nyamukuru",
  },
  "admin.json::ui.platform_reserve": {
    en: "Platform reserve fund",
    fr: "Fonds de réserve de la plateforme",
    rw: "Ifunguro ry'ububiko bwa platforme",
  },
  "admin.json::ui.last_topup": {
    en: "Last topup",
    fr: "Dernier rechargement",
    rw: "Iyuzuza riheruka",
  },
  "admin.json::ui.last_withdrawn": {
    en: "Last withdrawn",
    fr: "Dernier retrait",
    rw: "Iyakuza riheruka",
  },
  "admin.json::ui.sign_in_required": {
    en: "Sign in required",
    fr: "Connexion requise",
    rw: "Ugomba kwinjira",
  },
  "admin.json::ui.sign_in_required_body": {
    en: "Sign in to continue to this page.",
    fr: "Connectez-vous pour continuer sur cette page.",
    rw: "Injira kugira ngo ukomeze kuri iyi paji.",
  },
  "admin.json::ui.go_back": {
    en: "Go back",
    fr: "Retour",
    rw: "Subira inyuma",
  },
  "common.json::session_replaced": {
    en: "You were signed out because this account signed in on another tab or device.",
    fr: "Vous avez été déconnecté car ce compte s'est connecté dans un autre onglet ou sur un autre appareil.",
    rw: "Wasohotse kuko iyi konti yinjiye mu kindi kiganiro cyangwa ku kindi gikoresho.",
  },
  "common.json::idle_timeout": {
    en: "You were logged out after 1 hour of inactivity.",
    fr: "Vous avez été déconnecté après 1 heure d'inactivité.",
    rw: "Wasohotse nyuma y'isaha imwe utakoze ikintu.",
  },
};

function load(lang) {
  const out = {};
  for (const file of files) {
    out[file] = JSON.parse(fs.readFileSync(path.join(root, lang, file), "utf8"));
  }
  return out;
}

function getPath(obj, keyPath) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== "object" || !(part in cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

function setPath(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!cur[part] || typeof cur[part] !== "object") cur[part] = {};
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}

function walk(enNode, locNode, map, stats, trail = []) {
  if (enNode && typeof enNode === "object" && !Array.isArray(enNode)) {
    for (const key of Object.keys(enNode)) {
      if (!locNode || typeof locNode !== "object") continue;
      if (!(key in locNode)) {
        const enVal = enNode[key];
        if (typeof enVal === "string" && map[enVal]) {
          locNode[key] = map[enVal];
          stats.added += 1;
        }
        continue;
      }
      walk(enNode[key], locNode[key], map, stats, trail.concat(key));
    }
    return;
  }
  if (typeof enNode === "string" && typeof locNode === "string" && locNode === enNode && map[enNode]) {
    return map[enNode];
  }
  return undefined;
}

function applyMap(enTree, locTree, map) {
  const stats = { replaced: 0, added: 0 };
  function rec(enNode, locNode) {
    if (!enNode || typeof enNode !== "object" || Array.isArray(enNode)) return;
    for (const key of Object.keys(enNode)) {
      if (!locNode || typeof locNode !== "object" || !(key in locNode)) {
        if (typeof enNode[key] === "string" && map[enNode[key]]) {
          locNode[key] = map[enNode[key]];
          stats.added += 1;
        } else if (enNode[key] && typeof enNode[key] === "object") {
          locNode[key] = Array.isArray(enNode[key]) ? [] : {};
          rec(enNode[key], locNode[key]);
        }
        continue;
      }
      if (typeof enNode[key] === "string") {
        if (locNode[key] === enNode[key] && map[enNode[key]] && map[enNode[key]] !== enNode[key]) {
          locNode[key] = map[enNode[key]];
          stats.replaced += 1;
        }
      } else if (enNode[key] && typeof enNode[key] === "object") {
        rec(enNode[key], locNode[key]);
      }
    }
  }
  rec(enTree, locTree);
  return stats;
}

const en = load("en");
const fr = load("fr");
const rw = load("rw");

for (const [id, value] of Object.entries(ensure)) {
  const [file, ...rest] = id.split("::");
  const keyPath = rest.join("::");
  for (const [lang, tree] of [["en", en], ["fr", fr], ["rw", rw]]) {
    const current = getPath(tree[file], keyPath);
    if (current === undefined) setPath(tree[file], keyPath, value[lang]);
  }
}

let frStats = { replaced: 0, added: 0 };
let rwStats = { replaced: 0, added: 0 };
for (const file of files) {
  const a = applyMap(en[file], fr[file], frByEn);
  const b = applyMap(en[file], rw[file], rwByEn);
  frStats.replaced += a.replaced;
  frStats.added += a.added;
  rwStats.replaced += b.replaced;
  rwStats.added += b.added;
}

for (const [lang, tree] of [["en", en], ["fr", fr], ["rw", rw]]) {
  for (const file of files) {
    fs.writeFileSync(path.join(root, lang, file), `${JSON.stringify(tree[file], null, 2)}\n`);
  }
}

console.log("fr", frStats, "rw", rwStats);
void walk;
