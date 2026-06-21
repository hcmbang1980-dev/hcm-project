-- =============================================
-- 호치민방앗간 CMS - 전체 테이블 생성 스크립트
-- Supabase SQL Editor에서 한 번에 실행
-- =============================================

-- 1. users 테이블 컬럼 추가 (기존 테이블에 없는 컬럼만)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS admin_memo TEXT,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_ip TEXT,
  ADD COLUMN IF NOT EXISTS level_num INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS points INT DEFAULT 0;

-- 2. site_settings 재구성 (key/value 방식)
CREATE TABLE IF NOT EXISTS site_settings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category TEXT,
    setting_key TEXT UNIQUE,
    setting_value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

-- 기존 site_settings가 단일행 방식이면 초기 데이터 삽입
INSERT INTO site_settings (category, setting_key, setting_value) VALUES
  ('point',   'attendance_point',       '10'),
  ('point',   'post_point',             '5'),
  ('point',   'comment_point',          '2'),
  ('point',   'review_point',           '20'),
  ('point',   'signup_point',           '10'),
  ('chat',    'chat_enabled',           'true'),
  ('chat',    'chat_right',             '20'),
  ('chat',    'chat_bottom',            '20'),
  ('chat',    'chat_width',             '380'),
  ('chat',    'chat_height',            '500'),
  ('popup',   'popup_slide_speed',      '5000'),
  ('popup',   'popup_default_close_hours', '24'),
  ('site',    'site_name',              '호치민방앗간'),
  ('site',    'telegram_link',          'https://t.me/bangasgan'),
  ('banner',  'main_slider_speed',      '5000'),
  ('ui',      'sidebar_enabled',        'true'),
  ('ui',      'footer_ad_enabled',      'true'),
  ('ui',      'popup_enabled',          'true'),
  ('ui',      'stats_visible',          'true'),
  ('ui',      'notice_visible',         'true'),
  ('ui',      'banner_visible',         'true'),
  ('ui',      'main_sections_order',    'hero,stats,notice,board,banner'),
  ('ui',      'hero_layout',            'default'),
  ('ui',      'chat_position',          'bottom-right')
ON CONFLICT (setting_key) DO NOTHING;

-- 3. admin_logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    action TEXT,
    telegram_id TEXT,
    target_user TEXT,
    reason TEXT,
    admin_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- 4. login_logs
CREATE TABLE IF NOT EXISTS login_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID,
    telegram_id TEXT,
    ip TEXT,
    user_agent TEXT,
    login_type TEXT DEFAULT 'LOGIN',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- 5. notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID,
    title TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- 6. reports
CREATE TABLE IF NOT EXISTS reports (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reporter_id UUID,
    target_type TEXT,
    target_id TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- 7. user_activity_logs
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID,
    action TEXT,
    target_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- 8. site_statistics
CREATE TABLE IF NOT EXISTS site_statistics (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stat_date DATE UNIQUE,
    new_users INT DEFAULT 0,
    posts_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    visitors INT DEFAULT 0
  );

-- 9. attendance_logs (출석 전용, 기존 attendance 테이블 보완)
CREATE TABLE IF NOT EXISTS attendance_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID,
    attendance_date DATE,
    point INT DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, attendance_date)
  );

-- 10. level_settings (등급 기준 DB화)
CREATE TABLE IF NOT EXISTS level_settings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    level_num INT UNIQUE,
    grade_name TEXT,
    icon TEXT,
    required_exp INT
  );

INSERT INTO level_settings (level_num, grade_name, icon, required_exp) VALUES
  (1,   '새싹',   '🌱', 0),
  (10,  '견습',   '🪴', 100),
  (20,  '일반',   '⚔️', 300),
  (30,  '고수',   '🥋', 600),
  (50,  '전문가', '🎖️', 1000),
  (70,  '영웅',   '🏆', 2000),
  (100, '전설',   '👑', 4000),
  (130, '최고',   '💎', 7000)
ON CONFLICT (level_num) DO NOTHING;

-- 11. ads 통합 테이블 (팝업/메인배너/사이드/하단/게시판 광고 통합)
CREATE TABLE IF NOT EXISTS ads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT,
    image_url TEXT,
    mobile_image_url TEXT,
    link_url TEXT,
    position TEXT,
    active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    close_hours INT DEFAULT 24,
    slide_group TEXT,
    is_slide BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- 12. ad_click_logs
CREATE TABLE IF NOT EXISTS ad_click_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ad_id BIGINT,
    user_id UUID,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- 13. ad_view_logs
CREATE TABLE IF NOT EXISTS ad_view_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ad_id BIGINT,
    user_id UUID,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- 14. banned_ips
CREATE TABLE IF NOT EXISTS banned_ips (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ip TEXT UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

-- 15. user_blocks (차단 이력)
CREATE TABLE IF NOT EXISTS user_blocks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID,
    reason TEXT,
    admin_name TEXT,
    blocked_at TIMESTAMPTZ DEFAULT NOW(),
    unblocked_at TIMESTAMPTZ
  );

-- 16. boards (게시판 설정)
CREATE TABLE IF NOT EXISTS boards (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    board_name TEXT,
    slug TEXT UNIQUE,
    read_level INT DEFAULT 1,
    write_level INT DEFAULT 1,
    comment_level INT DEFAULT 1,
    active BOOLEAN DEFAULT TRUE
  );

INSERT INTO boards (board_name, slug, read_level, write_level, comment_level, active) VALUES
  ('공지사항',   'notice',   1, 5, 1, TRUE),
  ('이벤트',     'event',    1, 5, 1, TRUE),
  ('자유게시판', 'free',     1, 1, 1, TRUE),
  ('안구정화',   'gallery',  1, 1, 1, TRUE),
  ('가입인사',   'intro',    1, 1, 1, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 17. menus (메뉴 설정)
CREATE TABLE IF NOT EXISTS menus (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    label TEXT,
    path TEXT,
    sort_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    require_auth BOOLEAN DEFAULT FALSE
  );

INSERT INTO menus (label, path, sort_order, active, require_auth) VALUES
  ('홈',         '/',              1, TRUE, FALSE),
  ('공지사항',   '/board/notice',  2, TRUE, TRUE),
  ('이벤트',     '/board/event',   3, TRUE, TRUE),
  ('자유게시판', '/board/free',    4, TRUE, TRUE),
  ('안구정화',   '/board/gallery', 5, TRUE, TRUE),
  ('가입인사',   '/board/intro',   6, TRUE, TRUE),
  ('출석체크',   '/attendance',    7, TRUE, TRUE),
  ('마이페이지', '/mypage',        8, TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- =============================================
-- 완료! Supabase SQL Editor에서 실행하세요.
-- =============================================
