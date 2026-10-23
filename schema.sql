SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS best_workspace
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE best_workspace;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role ENUM('admin', 'user', 'pro_user') NOT NULL DEFAULT 'user',
  avatar_url VARCHAR(500) NULL,
  bio TEXT NULL,
  status ENUM('online', 'offline') NOT NULL DEFAULT 'offline',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS todos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  priority ENUM('low', 'medium', 'high', 'ai_suggested') NOT NULL DEFAULT 'medium',
  ai_score DECIMAL(5,2) NULL,
  status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
  due_date DATE NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_todos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_todos_user_status (user_id, status),
  KEY idx_todos_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'general',
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_notes_user_cat (user_id, category),
  KEY idx_notes_archived (is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS boards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  canvas_data_json LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_boards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_boards_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(500) NULL,
  likes_count INT UNSIGNED NOT NULL DEFAULT 0,
  comments_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_posts_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_likes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_post_like (post_id, user_id),
  CONSTRAINT fk_pl_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_pl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_comments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pc_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_pc_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_groups (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cg_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_group_members (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cgm (group_id, user_id),
  CONSTRAINT fk_cgm_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_cgm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id INT UNSIGNED NOT NULL,
  receiver_id INT UNSIGNED NULL,
  group_id INT UNSIGNED NULL,
  text TEXT NOT NULL,
  attachments_json JSON NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_msg_group FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  KEY idx_msg_dm (sender_id, receiver_id),
  KEY idx_msg_group (group_id),
  KEY idx_msg_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teams (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  team_name VARCHAR(160) NOT NULL,
  lead_user_id INT UNSIGNED NOT NULL,
  performance_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  metrics_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teams_lead FOREIGN KEY (lead_user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_teams_score (performance_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_members (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  team_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role_in_team VARCHAR(80) NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tm (team_id, user_id),
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  stripe_customer_id VARCHAR(120) NULL,
  stripe_subscription_id VARCHAR(120) NULL,
  plan_type ENUM('free', 'pro', 'enterprise') NOT NULL DEFAULT 'free',
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  current_period_end DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sub_user (user_id),
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  UNIQUE KEY uq_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (id, email, password_hash, name, role, avatar_url, bio, status) VALUES
(1, 'admin@best.app', '$2b$10$rQZ8K8Y5Y5Y5Y5Y5Y5Y5YuGKxGxGxGxGxGxGxGxGxGxGxGxGxGxG', 'Admin User', 'admin', NULL, 'Platform administrator', 'offline'),
(2, 'maya@best.app', '$2b$10$rQZ8K8Y5Y5Y5Y5Y5Y5Y5YuGKxGxGxGxGxGxGxGxGxGxGxGxGxGxG', 'Maya Chen', 'pro_user', NULL, 'Product designer & AI enthusiast', 'offline'),
(3, 'leo@best.app', '$2b$10$rQZ8K8Y5Y5Y5Y5Y5Y5Y5YuGKxGxGxGxGxGxGxGxGxGxGxGxGxGxG', 'Leo Hart', 'user', NULL, 'Full-stack engineer', 'offline'),
(4, 'sara@best.app', '$2b$10$rQZ8K8Y5Y5Y5Y5Y5Y5Y5YuGKxGxGxGxGxGxGxGxGxGxGxGxGxGxG', 'Sara Kim', 'pro_user', NULL, 'Team lead · Creative ops', 'offline')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO todos (user_id, title, description, priority, ai_score, status, due_date, sort_order) VALUES
(2, 'Q4 roadmap draft', 'Outline milestones and owners for Q4 launch', 'high', 88.50, 'in_progress', DATE_ADD(CURDATE(), INTERVAL 7 DAY), 1),
(2, 'Design system tokens', 'Sync color/spacing tokens across GUI modules', 'medium', 62.00, 'pending', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 2),
(2, 'Ship whiteboard v1', 'Canvas save/load + shape tools', 'high', 91.00, 'pending', DATE_ADD(CURDATE(), INTERVAL 5 DAY), 3),
(3, 'API rate limits', 'Add sliding window limiter on public endpoints', 'medium', 55.00, 'pending', DATE_ADD(CURDATE(), INTERVAL 10 DAY), 1),
(3, 'Socket presence', 'Online/offline presence channel', 'low', 40.00, 'completed', NULL, 2);

INSERT INTO notes (user_id, title, content, category, is_archived) VALUES
(2, 'Workspace vision', 'Unified productivity + creative tools with AI scoring and real-time collab.', 'strategy', 0),
(2, 'Meeting notes — Sprint 12', 'Focus on canvas persistence and chat read receipts this sprint.', 'meetings', 0),
(3, 'DB pool tuning', 'connectionLimit=15, idleTimeout=60s, safeQuery wrappers everywhere.', 'engineering', 0);

INSERT INTO boards (user_id, title, canvas_data_json) VALUES
(2, 'Product flow', '{"version":1,"objects":[{"type":"rect","x":80,"y":60,"w":160,"h":80,"fill":"#8a6bff","text":"Ideate"},{"type":"rect","x":320,"y":60,"w":160,"h":80,"fill":"#38e8d0","text":"Build"},{"type":"line","x1":240,"y1":100,"x2":320,"y2":100}]}'),
(3, 'API map', '{"version":1,"objects":[{"type":"rect","x":40,"y":40,"w":120,"h":60,"fill":"#ff6bcb","text":"Auth"},{"type":"rect","x":200,"y":40,"w":120,"h":60,"fill":"#8a6bff","text":"Todos"}]}');

INSERT INTO posts (user_id, content, image_url, likes_count, comments_count) VALUES
(2, 'Shipped the first AI priority scorer for todos. Rate any task and get a 0-100 urgency score.', NULL, 3, 1),
(4, 'Team standup: we are locking the whiteboard JSON schema this week. Feedback welcome.', NULL, 2, 0),
(3, 'Socket.IO presence is live on staging. Online indicators should feel instant now.', NULL, 5, 2);

INSERT INTO post_comments (post_id, user_id, body) VALUES
(1, 3, 'Love this — already using it on the roadmap board.'),
(3, 2, 'Presence latency is under 100ms on my end. Nice work.');

INSERT INTO teams (team_name, lead_user_id, performance_score, metrics_json) VALUES
('Core Product', 4, 86.40, '{"completed_week":18,"wip":7,"velocity":22}'),
('Platform Eng', 3, 79.20, '{"completed_week":14,"wip":5,"velocity":19}');

INSERT INTO team_members (team_id, user_id, role_in_team) VALUES
(1, 4, 'lead'),
(1, 2, 'designer'),
(1, 3, 'engineer'),
(2, 3, 'lead'),
(2, 1, 'admin');

INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan_type, status, current_period_end) VALUES
(1, NULL, NULL, 'enterprise', 'active', DATE_ADD(NOW(), INTERVAL 1 YEAR)),
(2, NULL, NULL, 'pro', 'active', DATE_ADD(NOW(), INTERVAL 30 DAY)),
(3, NULL, NULL, 'free', 'active', NULL),
(4, NULL, NULL, 'pro', 'active', DATE_ADD(NOW(), INTERVAL 30 DAY));

INSERT INTO system_settings (setting_key, setting_value) VALUES
('announcement_banner', 'Welcome to BEST Workspace — AI scoring and real-time chat are live.'),
('maintenance_mode', 'false'),
('ai_model', 'gpt-4o-mini'),
('ai_temperature', '0.3'),
('max_free_todos', '50'),
('max_free_boards', '3')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
