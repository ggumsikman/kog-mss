-- ══════════════════════════════════════════════════════
-- KOG MSS v2 마이그레이션: 근태 승인 워크플로우 + 연차 관리
-- 실행 전 기존 attendance_records 테이블이 있어야 합니다
-- ══════════════════════════════════════════════════════

-- 1. attendance_records에 승인 관련 컬럼 추가
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT '승인',
  ADD COLUMN IF NOT EXISTS approver_id INT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 기존 데이터는 모두 '승인' 상태로 설정
UPDATE attendance_records SET status = '승인' WHERE status IS NULL;

-- 2. 연차 할당량 테이블 생성
CREATE TABLE IF NOT EXISTS leave_quotas (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year        INT NOT NULL,
  total_days  NUMERIC(4,1) DEFAULT 15,
  used_days   NUMERIC(4,1) DEFAULT 0,
  note        TEXT,
  UNIQUE(user_id, year)
);

-- 3. 기존 활성 사용자에 대해 2026년 연차 할당 (기본 15일)
INSERT INTO leave_quotas (user_id, year, total_days)
SELECT id, 2026, 15
FROM users
WHERE is_active = true
ON CONFLICT (user_id, year) DO NOTHING;
