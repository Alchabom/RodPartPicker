-- 016_auth: users, email sign-in codes and refresh tokens.
-- Every DATETIME is naive UTC set by the API (get_now()), so none has a DEFAULT.
-- Design rationale: docs/superpowers/specs/2026-11-09-auth-design.md

-- ---------- Users ----------
-- display_name is NULL until onboarding. Its collation is explicit so names
-- are unique ignoring case ("TroutBum" = "troutbum") whatever the server default.
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(254) NOT NULL,                          -- lowercased and trimmed
  display_name  VARCHAR(30) COLLATE utf8mb4_0900_ai_ci NULL,
  created_at    DATETIME NOT NULL,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_display_name (display_name)
) ENGINE=InnoDB;

-- ---------- Login codes ----------
-- Keyed by email, not user_id: on first sign-in the user doesn't exist yet.
CREATE TABLE login_codes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(254) NOT NULL,
  code_hash     CHAR(64) NOT NULL,                              -- hex HMAC-SHA256
  attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,            -- wrong guesses
  requester_ip  VARCHAR(45) NOT NULL,                           -- fits IPv6
  expires_at    DATETIME NOT NULL,
  consumed_at   DATETIME NULL,                                  -- used, replaced or exhausted
  created_at    DATETIME NOT NULL,
  KEY idx_login_codes_email (email, created_at),
  KEY idx_login_codes_ip    (requester_ip, created_at)
) ENGINE=InnoDB;

-- ---------- Refresh tokens ----------
-- family_id is a UUID shared by a sign-in's first token and every token that replaces it.
CREATE TABLE refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  family_id   CHAR(36) NOT NULL,
  token_hash  CHAR(64) NOT NULL,                                -- hex SHA-256
  expires_at  DATETIME NOT NULL,
  revoked_at  DATETIME NULL,
  created_at  DATETIME NOT NULL,
  UNIQUE KEY uq_refresh_tokens_token_hash (token_hash),
  KEY idx_refresh_tokens_family (family_id),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
