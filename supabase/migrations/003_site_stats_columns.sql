-- =============================================
-- 003: site_stats 테이블 컬럼 추가/확인
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- site_stats 테이블 생성 (없으면)
CREATE TABLE IF NOT EXISTS site_stats (
  id BIGINT PRIMARY KEY DEFAULT 1,
  base_members INT DEFAULT 330,
  base_online INT DEFAULT 15,
  base_today INT DEFAULT 70,
  base_total INT DEFAULT 13000,
  label_members TEXT DEFAULT '가입인원',
  label_online TEXT DEFAULT '실시간 접속',
  label_today TEXT DEFAULT '당일 방문자',
  label_total TEXT DEFAULT '누적방문자수',
  total_visitors INT DEFAULT 13000,
  admin_pin TEXT DEFAULT '1234',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 테이블에 컬럼이 없는 경우 추가
ALTER TABLE site_stats
  ADD COLUMN IF NOT EXISTS base_members INT DEFAULT 330,
  ADD COLUMN IF NOT EXISTS base_online INT DEFAULT 15,
  ADD COLUMN IF NOT EXISTS base_today INT DEFAULT 70,
  ADD COLUMN IF NOT EXISTS base_total INT DEFAULT 13000,
  ADD COLUMN IF NOT EXISTS label_members TEXT DEFAULT '가입인원',
  ADD COLUMN IF NOT EXISTS label_online TEXT DEFAULT '실시간 접속',
  ADD COLUMN IF NOT EXISTS label_today TEXT DEFAULT '당일 방문자',
  ADD COLUMN IF NOT EXISTS label_total TEXT DEFAULT '누적방문자수',
  ADD COLUMN IF NOT EXISTS total_visitors INT DEFAULT 13000,
  ADD COLUMN IF NOT EXISTS admin_pin TEXT DEFAULT '1234';

-- 기본 행 삽입 (없으면)
INSERT INTO site_stats (id, base_members, base_online, base_today, base_total, label_members, label_online, label_today, label_total, total_visitors)
VALUES (1, 330, 15, 70, 13000, '가입인원', '실시간 접속', '당일 방문자', '누적방문자수', 13000)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 완료! site_stats 테이블이 준비되었습니다.
-- =============================================
