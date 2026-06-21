-- =============================================
-- 002: Soft Delete + 기타 컬럼 추가
-- =============================================

-- posts 테이블 soft delete 컬럼 추가
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- comments 테이블 soft delete 컬럼 추가
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- users 테이블 추가 컬럼 (001에서 누락된 경우 대비)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS admin_memo TEXT,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_ip TEXT,
  ADD COLUMN IF NOT EXISTS level_num INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;

-- point_history 테이블 (없는 경우 생성)
CREATE TABLE IF NOT EXISTS point_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID,
    amount INT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- attendance_logs 중복 방지 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS attendance_logs_unique
  ON attendance_logs (user_id, attendance_date);

-- site_settings unique index (중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_key_unique
  ON site_settings (setting_key);

-- login_logs 인덱스
CREATE INDEX IF NOT EXISTS login_logs_user_id_idx ON login_logs (user_id);
CREATE INDEX IF NOT EXISTS login_logs_telegram_id_idx ON login_logs (telegram_id);

-- posts 인덱스
CREATE INDEX IF NOT EXISTS posts_board_type_idx ON posts (board_type);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts (user_id);
CREATE INDEX IF NOT EXISTS posts_deleted_idx ON posts (deleted);

-- comments 인덱스
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments (user_id);

-- ad_click_logs 인덱스
CREATE INDEX IF NOT EXISTS ad_click_logs_ad_id_idx ON ad_click_logs (ad_id);

-- =============================================
-- 완료
-- =============================================
