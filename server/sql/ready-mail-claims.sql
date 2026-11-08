-- Reviewed deploy artifact. This script is not applied by the application.
-- Leave it unapplied until someone chooses to run it after code review.
--
-- Without this table, a ready mail is single-flight only inside the current
-- process. A restart can send it again. Durability is not active.
-- With this table, a recorded send is skipped on later calls and across
-- restarts. A failed or abandoned attempt stays available for a later call.
-- The in-app notice uses a separate claim key from the email, so a mail
-- retry does not insert another notification.
-- This is at-least-once, not exactly-once: a crash after the provider
-- accepts the message and before status='sent' can send a second copy.

CREATE TABLE IF NOT EXISTS ready_mail_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  claim_key VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  last_error VARCHAR(255) NULL,
  claimed_at DATETIME NOT NULL,
  sent_at DATETIME NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ready_mail_claims_key (claim_key)
);
