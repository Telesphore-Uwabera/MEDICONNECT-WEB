-- Reviewed deploy artifact. This script is not applied by the application.
-- Do not run it from the app. Apply it by hand after review.
--
-- Production patients has user_id plus profile fields. It has no name, email,
-- phone, or status column, so 2026-11-11-dashboard-data.sql skipped its patients
-- INSERT. This file inserts only user_id for patient-role accounts that have
-- no patients row. A second run inserts nothing (NOT EXISTS).
--
-- Patient role is stored in model_has_roles (model_type App\Models\User),
-- not in a users.role column. If a users.role column is present, that is used
-- instead.

SET @has_patient_user = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients' AND COLUMN_NAME = 'user_id'
);
SET @has_users_role = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
);

SET @sql = IF(
  @has_patient_user = 0,
  'SELECT 1',
  IF(
    @has_users_role > 0,
    'INSERT INTO patients (user_id)
     SELECT u.id FROM users u
     WHERE u.role = ''patient''
       AND NOT EXISTS (SELECT 1 FROM patients p WHERE p.user_id = u.id)',
    'INSERT INTO patients (user_id)
     SELECT u.id FROM users u
     JOIN model_has_roles m ON m.model_id = u.id AND m.model_type = ''App\\\\Models\\\\User''
     JOIN roles r ON r.id = m.role_id AND r.name = ''patient''
     WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.user_id = u.id)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
