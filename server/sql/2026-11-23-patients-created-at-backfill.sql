-- Reviewed backfill. The application does not run this file.
-- Do not run it against production until the SELECT previews below have been read.
-- Dry run: execute only the two SELECT COUNT statements, then ROLLBACK
-- instead of COMMIT if you open the transaction and want to stop.
--
-- patients has 3,991 rows. 926 of them have created_at IS NULL.
-- Fill created_at from the linked account (users.created_at via patients.user_id)
-- and, only when that is missing, from patients.updated_at.
-- Rows whose created_at is already set are not touched.
-- Rows with neither source stay NULL. The second SELECT counts those.
-- A second run updates nothing because the WHERE clause requires created_at IS NULL.

SELECT COUNT(*) AS created_at_null
FROM patients
WHERE created_at IS NULL;

SELECT COUNT(*) AS no_source_left_null
FROM patients p
LEFT JOIN users u ON u.id = p.user_id
WHERE p.created_at IS NULL
  AND u.created_at IS NULL
  AND p.updated_at IS NULL;

START TRANSACTION;

UPDATE patients p
LEFT JOIN users u ON u.id = p.user_id
SET p.created_at = COALESCE(u.created_at, p.updated_at)
WHERE p.created_at IS NULL
  AND COALESCE(u.created_at, p.updated_at) IS NOT NULL;

-- ROW_COUNT() here is the number of NULL created_at rows that had a source.
-- The no_source_left_null preview is the number left untouched.
SELECT ROW_COUNT() AS patients_created_at_filled;

COMMIT;
