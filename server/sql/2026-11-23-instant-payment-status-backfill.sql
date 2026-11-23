-- Reviewed backfill. The application does not run this file.
-- Do not run it against production until the SELECT preview below has been read.
-- Dry run: execute only the SELECT COUNT, then ROLLBACK instead of COMMIT.
--
-- instant_consultations has 0 rows. The live visits are the 108 rows in
-- instant_consultation_requests. Dashboards and the doctor queue treat a
-- visit as paid only when payment_status is paid/completed/success/successful,
-- or when payment_status is blank AND status is already confirmed, accepted,
-- in progress, completed, or done (server/src/instant-visit.js isPaidStatus).
-- A verified payment that left the request pending, queued, waiting, or
-- payment_pending stays out of the live queue until payment_status is set.
-- Revenue itself is summed from payments.amount, so this does not copy amount,
-- and it does not invent doctor_id (NULL means any doctor) or patient_id.
--
-- Copy payment_status = 'paid' from a verified payment onto the request.
-- 106 of the 108 requests are the rows this is meant to fill. The other 2
-- stay as they are: payment_status is already set, or there is no verified
-- payment. The WHERE clause matches only a still-blank payment_status, so a
-- second run changes 0 rows.

SELECT COUNT(*) AS blank_payment_status_with_verified_payment
FROM instant_consultation_requests i
WHERE (i.payment_status IS NULL OR TRIM(i.payment_status) = '')
  AND EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.payable_id = i.id
      AND LOWER(p.status) IN ('paid', 'completed', 'success', 'successful')
      AND (
        p.payable_type = 'instant_consultation'
        OR p.payable_type LIKE '%InstantConsultation%'
        OR p.payable_type LIKE '%instant%'
      )
  );

START TRANSACTION;

UPDATE instant_consultation_requests i
SET i.payment_status = 'paid'
WHERE (i.payment_status IS NULL OR TRIM(i.payment_status) = '')
  AND EXISTS (
    SELECT 1
    FROM payments p
    WHERE p.payable_id = i.id
      AND LOWER(p.status) IN ('paid', 'completed', 'success', 'successful')
      AND (
        p.payable_type = 'instant_consultation'
        OR p.payable_type LIKE '%InstantConsultation%'
        OR p.payable_type LIKE '%instant%'
      )
  );

SELECT ROW_COUNT() AS instant_payment_status_filled;

COMMIT;
