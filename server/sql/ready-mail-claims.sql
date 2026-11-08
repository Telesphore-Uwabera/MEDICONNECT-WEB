-- Reviewed deploy artifact. Do not apply this from the application process.
-- Ready mail stays retryable until this table exists. After it exists, a
-- recorded send is skipped on later calls and across restarts. A failed or
-- abandoned attempt stays available for a later call. This is at-least-once:
-- a crash after the provider accepts the message and before `status='sent'`
-- can send a second copy.

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
