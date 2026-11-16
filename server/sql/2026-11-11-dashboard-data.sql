-- Reviewed deploy artifact. This script is not applied by the application.
-- Run it once on the server after review. Every step is safe to run again.
--
-- patient_id is not one meaning:
--   appointments.patient_id stores users.id
--   instant_consultation_requests.patient_id, referrals.patient_id,
--   and patient_medical_info.patient_id store patients.id
-- This script does not rewrite those ids.

-- 1. Instant consultation columns the dashboards and decline/join stamps read.
SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'patient_id'),
    'SELECT 1',
    'ALTER TABLE instant_consultation_requests ADD COLUMN patient_id BIGINT UNSIGNED NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'payment_status'),
    'SELECT 1',
    'ALTER TABLE instant_consultation_requests ADD COLUMN payment_status VARCHAR(32) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'amount'),
    'SELECT 1',
    'ALTER TABLE instant_consultation_requests ADD COLUMN amount DECIMAL(12,2) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'currency'),
    'SELECT 1',
    'ALTER TABLE instant_consultation_requests ADD COLUMN currency VARCHAR(8) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'started_at'),
    'SELECT 1',
    'ALTER TABLE instant_consultation_requests ADD COLUMN started_at DATETIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'ended_at'),
    'SELECT 1',
    'ALTER TABLE instant_consultation_requests ADD COLUMN ended_at DATETIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'duration_seconds'),
    'SELECT 1',
    'ALTER TABLE instant_consultation_requests ADD COLUMN duration_seconds INT UNSIGNED NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'declined_at'),
    'SELECT 1',
    'ALTER TABLE instant_consultation_requests ADD COLUMN declined_at DATETIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'decline_reason'),
    'SELECT 1',
    'ALTER TABLE instant_consultation_requests ADD COLUMN decline_reason VARCHAR(255) NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'cancelled_at'),
    'SELECT 1',
    'ALTER TABLE instant_consultation_requests ADD COLUMN cancelled_at DATETIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'profile_completed_at'),
    'SELECT 1',
    'ALTER TABLE patients ADD COLUMN profile_completed_at TIMESTAMP NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Review links.
SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND COLUMN_NAME = 'instant_consultation_id'),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN instant_consultation_id BIGINT UNSIGNED NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND COLUMN_NAME = 'hospital_id'),
    'SELECT 1',
    'ALTER TABLE reviews ADD COLUMN hospital_id BIGINT UNSIGNED NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Notes and medical files. The app reads these when they exist and does not create them at runtime.
CREATE TABLE IF NOT EXISTS appointment_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY appointment_notes_appointment (appointment_id)
);

CREATE TABLE IF NOT EXISTS instant_consultation_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  instant_consultation_id BIGINT UNSIGNED NOT NULL,
  doctor_id BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY instant_notes_consultation (instant_consultation_id)
);

CREATE TABLE IF NOT EXISTS patient_medical_files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  visit_type VARCHAR(40) NULL,
  source_id BIGINT UNSIGNED NULL,
  file_type VARCHAR(40) NULL,
  title VARCHAR(255) NULL,
  file_path VARCHAR(500) NULL,
  notes TEXT NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY patient_medical_files_patient (patient_id)
);

-- 3. Backfill payment facts. payable_type values are shortened so dashboards can match them.
SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'patient_id'),
    'SELECT 1',
    'ALTER TABLE payments ADD COLUMN patient_id BIGINT UNSIGNED NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'paid_at'),
    'SELECT 1',
    'ALTER TABLE payments ADD COLUMN paid_at DATETIME NULL'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE instant_consultation_requests i
JOIN payments p ON p.payable_id = i.id AND p.payable_type LIKE '%instant%'
SET i.payment_status = 'paid'
WHERE i.payment_status IS NULL
  AND LOWER(p.status) IN ('paid', 'completed', 'success', 'successful');

UPDATE payments p
JOIN appointments a ON a.id = COALESCE(p.appointment_id, CASE WHEN p.payable_type LIKE '%appointment%' THEN p.payable_id END)
SET p.patient_id = a.patient_id
WHERE p.patient_id IS NULL
  AND a.patient_id IS NOT NULL;

UPDATE payments
SET paid_at = COALESCE(paid_at, updated_at, created_at)
WHERE paid_at IS NULL
  AND LOWER(status) IN ('paid', 'completed', 'success', 'successful');

UPDATE payments
SET payable_type = 'instant_consultation'
WHERE payable_type LIKE '%InstantConsultation%';

UPDATE payments
SET payable_type = 'appointment'
WHERE payable_type LIKE '%Appointment%';

-- 4. A patient-role account with no patients row cannot pass the profile gate.
INSERT INTO patients (user_id, name, email, phone, status, created_at, updated_at)
SELECT u.id, u.name, u.email, u.phone, 'active', NOW(), NOW()
FROM users u
JOIN model_has_roles m ON m.model_id = u.id
JOIN roles r ON r.id = m.role_id AND r.name = 'patient'
LEFT JOIN patients p ON p.user_id = u.id
WHERE p.id IS NULL;
