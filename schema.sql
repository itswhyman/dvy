-- ============================================================
-- BEST Ultimate Workspace — Production Schema
-- MariaDB / MySQL 8+ · utf8mb4_unicode_ci · InnoDB
-- ============================================================
-- Usage:
--   mysql -u root -p < schema.sql
-- Or:
--   mysql -u root -p -e "SOURCE /path/to/schema.sql"
--
-- NOTE: No automatic dummy users. Register via app or use
-- the optional INSERT examples at the bottom (commented out).
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET collation_connection = utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS best_workspace
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE best_workspace;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(191) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  role          ENUM('admin','user','pro_user') NOT NULL DEFAULT 'user',
  avatar_url    VARCHAR(512) NULL,
  bio           TEXT NULL,
  status        ENUM('online','offline') NOT NULL DEFAULT 'offline',
  theme         ENUM('light','dark','system') NOT NULL DEFAULT 'system',
  member_color  CHAR(7) NULL COMMENT 'Immutable hex for team UI borders',
  sound_pref    VARCHAR(64) NULL DEFAULT 'default',
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- USER PROFILES (extended preferences)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id           BIGINT UNSIGNED NOT NULL,
  display_name      VARCHAR(120) NULL,
  headline          VARCHAR(255) NULL,
  location          VARCHAR(120) NULL,
  website           VARCHAR(255) NULL,
  notification_json JSON NULL,
  privacy_json      JSON NULL,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TEAMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(160) NOT NULL,
  description TEXT NULL,
  owner_id    BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_teams_owner (owner_id),
  CONSTRAINT fk_teams_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_members (
  team_id     BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  role        ENUM('owner','manager','member') NOT NULL DEFAULT 'member',
  member_color CHAR(7) NOT NULL COMMENT 'Immutable per membership',
  joined_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (team_id, user_id),
  KEY idx_tm_user (user_id),
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- TODOS + SUB-TODOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS todos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  team_id       BIGINT UNSIGNED NULL,
  assignee_id   BIGINT UNSIGNED NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT NULL,
  notes         TEXT NULL,
  priority      DECIMAL(2,1) NOT NULL DEFAULT 0.0 COMMENT '0.0–5.0 step 0.5',
  ai_score      DECIMAL(5,2) NULL,
  status        ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  due_at        DATETIME(3) NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  completed_at  DATETIME(3) NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_todos_user (user_id),
  KEY idx_todos_team (team_id),
  KEY idx_todos_assignee (assignee_id),
  KEY idx_todos_status (status),
  KEY idx_todos_sort (user_id, sort_order),
  CONSTRAINT fk_todos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_todos_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_todos_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_todos_priority CHECK (priority >= 0 AND priority <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sub_todos (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  todo_id       BIGINT UNSIGNED NOT NULL,
  parent_id     BIGINT UNSIGNED NULL COMMENT 'nested sub-item',
  title         VARCHAR(255) NOT NULL,
  is_done       TINYINT(1) NOT NULL DEFAULT 0,
  sort_order    INT NOT NULL DEFAULT 0,
  assignee_id   BIGINT UNSIGNED NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_sub_todo (todo_id),
  KEY idx_sub_parent (parent_id),
  CONSTRAINT fk_sub_todo FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_parent FOREIGN KEY (parent_id) REFERENCES sub_todos(id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- NOTES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  team_id       BIGINT UNSIGNED NULL,
  title         VARCHAR(255) NOT NULL DEFAULT 'Untitled',
  content       LONGTEXT NOT NULL,
  template      ENUM('blank','grid','lined','dotted','music','calendar') NOT NULL DEFAULT 'blank',
  category      VARCHAR(80) NOT NULL DEFAULT 'general',
  project_desc  TEXT NULL COMMENT 'Required for team notes by managers',
  is_archived   TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notes_user (user_id),
  KEY idx_notes_team (team_id),
  KEY idx_notes_template (template),
  CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notes_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- BOARDS (whiteboard / canvas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boards (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id           BIGINT UNSIGNED NOT NULL,
  team_id           BIGINT UNSIGNED NULL,
  title             VARCHAR(255) NOT NULL DEFAULT 'Untitled board',
  canvas_data_json  LONGTEXT NOT NULL,
  viewport_json     JSON NULL COMMENT 'zoom, pan x/y',
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_boards_user (user_id),
  KEY idx_boards_team (team_id),
  CONSTRAINT fk_boards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_boards_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- SOCIAL: POSTS / LIKES / COMMENTS (threaded)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  content         TEXT NOT NULL,
  image_url       VARCHAR(512) NULL,
  likes_count     INT UNSIGNED NOT NULL DEFAULT 0,
  comments_count  INT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_posts_user (user_id),
  KEY idx_posts_created (created_at),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_likes (
  post_id     BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (post_id, user_id),
  KEY idx_pl_user (user_id),
  CONSTRAINT fk_pl_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_pl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_comments (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id     BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  parent_id   BIGINT UNSIGNED NULL COMMENT 'threaded / nested replies',
  text        TEXT NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_pc_post (post_id),
  KEY idx_pc_user (user_id),
  KEY idx_pc_parent (parent_id),
  CONSTRAINT fk_pc_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_parent FOREIGN KEY (parent_id) REFERENCES post_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- FOLLOWS / BLOCKS (social graph)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id  BIGINT UNSIGNED NOT NULL,
  following_id BIGINT UNSIGNED NOT NULL,
  created_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (follower_id, following_id),
  KEY idx_uf_following (following_id),
  CONSTRAINT fk_uf_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_uf_following FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id  BIGINT UNSIGNED NOT NULL,
  blocked_id  BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT fk_ub_blocker FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ub_blocked FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- CHAT GROUPS + MESSAGES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_groups (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(160) NOT NULL,
  team_id     BIGINT UNSIGNED NULL,
  created_by  BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_cg_team (team_id),
  CONSTRAINT fk_cg_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  CONSTRAINT fk_cg_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_group_members (
  group_id    BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  joined_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (group_id, user_id),
  KEY idx_cgm_user (user_id),
  CONSTRAINT fk_cgm_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_cgm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id         BIGINT UNSIGNED NOT NULL,
  receiver_id       BIGINT UNSIGNED NULL COMMENT 'DM target',
  group_id          BIGINT UNSIGNED NULL,
  text              TEXT NOT NULL,
  attachments_json  JSON NULL,
  is_read           TINYINT(1) NOT NULL DEFAULT 0,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_msg_sender (sender_id),
  KEY idx_msg_receiver (receiver_id),
  KEY idx_msg_group (group_id),
  KEY idx_msg_created (created_at),
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- SUBSCRIPTIONS / BILLING
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id             BIGINT UNSIGNED NOT NULL,
  stripe_customer_id  VARCHAR(191) NULL,
  stripe_sub_id       VARCHAR(191) NULL,
  plan                ENUM('free','pro','team','enterprise') NOT NULL DEFAULT 'free',
  status              ENUM('active','canceled','past_due','trialing','incomplete') NOT NULL DEFAULT 'active',
  current_period_end  DATETIME(3) NULL,
  post_limit          INT UNSIGNED NOT NULL DEFAULT 20,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sub_user (user_id),
  KEY idx_sub_stripe (stripe_customer_id),
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- SYSTEM SETTINGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key   VARCHAR(120) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at    DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('announcement_banner', ''),
  ('maintenance_mode', '0'),
  ('max_upload_mb', '10')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- ============================================================
-- OPTIONAL TEST DATA (commented — do NOT auto-run in prod)
-- Password for examples: Password123!
-- Generate hash with: node -e "console.log(require('bcryptjs').hashSync('Password123!',10))"
-- ============================================================
/*
INSERT INTO users (email, password_hash, name, role, member_color) VALUES
  ('admin@best.app', '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'Admin', 'admin', '#6366F1'),
  ('maya@best.app',  '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'Maya Chen', 'user', '#22D3EE'),
  ('leo@best.app',   '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'Leo Park', 'pro_user', '#F472B6');

INSERT INTO user_profiles (user_id, display_name, headline) VALUES
  (1, 'Admin', 'System administrator'),
  (2, 'Maya Chen', 'Product designer'),
  (3, 'Leo Park', 'Full-stack engineer');

INSERT INTO subscriptions (user_id, plan, status, post_limit) VALUES
  (1, 'enterprise', 'active', 10000),
  (2, 'free', 'active', 20),
  (3, 'pro', 'active', 200);
*/

-- Done.
SELECT 'BEST schema applied successfully' AS status;
