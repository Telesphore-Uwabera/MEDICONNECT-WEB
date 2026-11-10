-- Optional columns for a guest's temporary password.
-- The API keeps working if these columns are missing: it can still create a
-- hashed password, but it cannot tell later emails when to stop or when the
-- password expired. Apply this on the database before relying on re-sends.
-- Do not store the password itself. Only the existing users.password hash is used.

ALTER TABLE users
  ADD COLUMN password_must_change TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN temp_password_expires_at DATETIME NULL,
  ADD COLUMN temp_password_used_at DATETIME NULL;
