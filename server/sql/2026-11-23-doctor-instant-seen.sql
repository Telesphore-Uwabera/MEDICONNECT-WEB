-- Reviewed migration. The application does not run this file.
-- Do not apply it until the owner says yes.
--
-- Heartbeats record when a doctor's dashboard was last open.
-- The 1-minute job turns instant_consultation off when this is older than
-- about 3 minutes. It never turns instant consultation on.
-- The server keeps working if this column is absent.

ALTER TABLE doctors
  ADD COLUMN instant_seen_at DATETIME NULL;
