-- Reviewed deploy artifact. This script is not applied by the application.
-- Run it once on the server after review. Every step is safe to run again.
--
-- patient_id is not one meaning:
--   appointments.patient_id and payments.patient_id store users.id
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

-- 3. Backfill payment facts.
-- Live payments has payable_id + payable_type, not appointment_id.
-- Each UPDATE is prepared only when the columns it names exist, so a re-run
-- after a partial failure does not stop the rest of the script.
-- WHERE clauses only touch rows that are still empty, so a second run is a no-op.
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

-- Shorten the polymorphic type first. The joins below also match the old class name.
SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payable_type'),
    'UPDATE payments SET payable_type = ''instant_consultation'' WHERE payable_type LIKE ''%InstantConsultation%''',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payable_type'),
    'UPDATE payments SET payable_type = ''appointment'' WHERE payable_type LIKE ''%Appointment%''',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'instant_consultation_requests' AND COLUMN_NAME = 'payment_status')
    AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payable_id')
    AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payable_type'),
    'UPDATE instant_consultation_requests i JOIN payments p ON p.payable_id = i.id AND (p.payable_type = ''instant_consultation'' OR p.payable_type LIKE ''%instant%'') SET i.payment_status = ''paid'' WHERE i.payment_status IS NULL AND LOWER(p.status) IN (''paid'', ''completed'', ''success'', ''successful'')',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- appointments.patient_id is users.id, so this keeps payments.patient_id as users.id.
-- Join only through payable_id when the payable is an appointment.
SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'patient_id')
    AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payable_id')
    AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payable_type')
    AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appointments' AND COLUMN_NAME = 'patient_id'),
    'UPDATE payments p JOIN appointments a ON a.id = p.payable_id AND (p.payable_type = ''appointment'' OR p.payable_type LIKE ''%Appointment%'') SET p.patient_id = a.patient_id WHERE p.patient_id IS NULL AND a.patient_id IS NOT NULL',
    'SELECT 1'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'paid_at')
    AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'created_at')
    AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'updated_at'),
    'UPDATE payments SET paid_at = COALESCE(paid_at, updated_at, created_at) WHERE paid_at IS NULL AND LOWER(status) IN (''paid'', ''completed'', ''success'', ''successful'')',
    IF(
      EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'paid_at')
      AND EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'created_at'),
      'UPDATE payments SET paid_at = COALESCE(paid_at, created_at) WHERE paid_at IS NULL AND LOWER(status) IN (''paid'', ''completed'', ''success'', ''successful'')',
      'SELECT 1'
    )
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Optional copy of name, email, phone and status onto patients.
-- Production patients has user_id plus profile fields only, so this INSERT is skipped there.
-- The user_id-only backfill is 2026-11-16-patients-user-id-backfill.sql. The app does not run either file.
SET @patient_cols = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients'
    AND COLUMN_NAME IN ('user_id', 'name', 'email', 'phone', 'status')
);
SET @sql = IF(
  @patient_cols = 5,
  'INSERT INTO patients (user_id, name, email, phone, status)
   SELECT u.id, u.name, u.email, u.phone, ''active''
   FROM users u
   JOIN model_has_roles m ON m.model_id = u.id AND m.model_type = ''App\\\\Models\\\\User''
   JOIN roles r ON r.id = m.role_id AND r.name = ''patient''
   LEFT JOIN patients p ON p.user_id = u.id
   WHERE p.id IS NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
