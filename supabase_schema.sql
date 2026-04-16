-- ══════════════════════════════════════════════════════
-- KOG 경영관리 시스템 (MSS) Supabase Schema
-- ══════════════════════════════════════════════════════

-- 부서
CREATE TABLE departments (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,
  code        VARCHAR(10) NOT NULL UNIQUE,
  manager_id  INT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 사용자 (직원)
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(50) NOT NULL,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT,
  department_id INT REFERENCES departments(id),
  position      VARCHAR(50),
  role          VARCHAR(20) DEFAULT 'staff', -- 'admin' | 'manager' | 'staff'
  joined_at     DATE,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE departments ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_id) REFERENCES users(id);

-- ── Module 1: 업무일지 & 프로젝트 ───────────────────────

CREATE TABLE work_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id),
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  log_type    VARCHAR(20) NOT NULL, -- '정기업무' | '프로젝트' | '돌발업무'
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  is_planned  BOOLEAN DEFAULT true,
  achieved    BOOLEAN DEFAULT false,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE projects (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  category      VARCHAR(50) DEFAULT '기타', -- 'VSM' | '영업' | '품질' | '기타'
  department_id INT REFERENCES departments(id),
  owner_id      INT NOT NULL REFERENCES users(id),
  start_date    DATE,
  due_date      DATE NOT NULL,
  status        VARCHAR(20) DEFAULT '진행중', -- '진행중' | '완료' | '지연' | '보류'
  progress_pct  SMALLINT DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_members (
  project_id  INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(30) DEFAULT '담당자', -- '담당자' | '협력자' | '검토자'
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE project_milestones (
  id            SERIAL PRIMARY KEY,
  project_id    INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  due_date      DATE NOT NULL,
  completed_at  TIMESTAMPTZ,
  status        VARCHAR(20) DEFAULT '대기' -- '대기' | '완료' | '지연'
);

-- ── Module 2: 교육 관리 ──────────────────────────────────

CREATE TABLE education_schedules (
  id                  SERIAL PRIMARY KEY,
  title               VARCHAR(200) NOT NULL,
  edu_type            VARCHAR(20) DEFAULT '사내', -- '의무' | '사내'
  category            VARCHAR(50),               -- '품질' | '생산' | '안전' | '법정'
  scheduled_date      DATE NOT NULL,
  duration_hours      NUMERIC(4,1),
  instructor          VARCHAR(100),
  location            VARCHAR(100),
  status              VARCHAR(20) DEFAULT '예정', -- '예정' | '완료' | '취소'
  description         TEXT,
  notify_days_before  INT DEFAULT 7,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE education_targets (
  education_id  INT NOT NULL REFERENCES education_schedules(id) ON DELETE CASCADE,
  department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (education_id, department_id)
);

CREATE TABLE education_attendances (
  id            SERIAL PRIMARY KEY,
  education_id  INT NOT NULL REFERENCES education_schedules(id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attended      BOOLEAN DEFAULT false,
  note          TEXT
);

-- ── Module 3: 연간 일정 스케줄 ──────────────────────────

CREATE TABLE annual_schedules (
  id                  SERIAL PRIMARY KEY,
  title               VARCHAR(200) NOT NULL,
  category            VARCHAR(50), -- '세무' | '노무' | '보험' | '복지' | '행정'
  recurrence          VARCHAR(20) DEFAULT 'yearly', -- 'yearly' | 'monthly' | 'once'
  target_month        SMALLINT,    -- 1~12
  target_day          SMALLINT,    -- 1~31
  is_company_side     BOOLEAN DEFAULT true,
  is_employee_side    BOOLEAN DEFAULT false,
  description         TEXT,
  notify_days_before  INT DEFAULT 14,
  is_active           BOOLEAN DEFAULT true
);

-- ── Module 4: 인사 & 복지 ────────────────────────────────

CREATE TABLE hr_events (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type  VARCHAR(50) NOT NULL, -- '건강검진' | '생일' | '근속포상' | '복지혜택' | '계약만료'
  due_date    DATE NOT NULL,
  status      VARCHAR(20) DEFAULT '대기', -- '대기' | '완료' | '누락'
  note        TEXT,
  notified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Module 5: 공문서 관리 ────────────────────────────────

CREATE TABLE official_documents (
  id             SERIAL PRIMARY KEY,
  doc_number     VARCHAR(50),
  title          VARCHAR(300) NOT NULL,
  sender         VARCHAR(200),
  received_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by    INT NOT NULL REFERENCES users(id),
  department_id  INT REFERENCES departments(id),
  category       VARCHAR(50), -- '행정' | '법률' | '기술' | '계약'
  status         VARCHAR(20) DEFAULT '접수', -- '접수' | '처리중' | '완료' | '폐기'
  handler_id     INT REFERENCES users(id),
  handled_at     TIMESTAMPTZ,
  disposal_date  DATE,
  file_url       TEXT,
  summary        TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE document_histories (
  id           SERIAL PRIMARY KEY,
  document_id  INT NOT NULL REFERENCES official_documents(id) ON DELETE CASCADE,
  action       VARCHAR(30) NOT NULL, -- '접수' | '배포' | '처리' | '반려' | '폐기'
  actor_id     INT NOT NULL REFERENCES users(id),
  action_at    TIMESTAMPTZ DEFAULT now(),
  note         TEXT
);

-- ── Module 6: 정기검사 관리 ──────────────────────────────

CREATE TABLE inspections (
  id                    SERIAL PRIMARY KEY,
  title                 VARCHAR(200) NOT NULL,
  category              VARCHAR(50), -- '산업안전' | '중량물' | '소방' | '환경' | '전기'
  responsible_dept_id   INT REFERENCES departments(id),
  legal_cycle_months    INT,
  last_inspection_date  DATE,
  next_due_date         DATE NOT NULL,
  notify_days_before    INT DEFAULT 30,
  status                VARCHAR(20) DEFAULT '정상', -- '정상' | '임박' | '만료'
  note                  TEXT
);

CREATE TABLE inspection_histories (
  id                SERIAL PRIMARY KEY,
  inspection_id     INT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  inspection_date   DATE NOT NULL,
  result            VARCHAR(30), -- '합격' | '불합격' | '조건부합격'
  inspector_agency  VARCHAR(200),
  certificate_url   TEXT,
  next_due_date     DATE,
  note              TEXT
);

-- ── 통합 알림 ────────────────────────────────────────────

CREATE TABLE notifications (
  id              SERIAL PRIMARY KEY,
  source_module   VARCHAR(30) NOT NULL, -- 'project' | 'education' | 'schedule' | 'hr' | 'document' | 'inspection'
  ref_id          INT,
  title           VARCHAR(300) NOT NULL,
  message         TEXT,
  priority        VARCHAR(10) DEFAULT 'medium', -- 'high' | 'medium' | 'low'
  target_user_id  INT REFERENCES users(id),
  target_dept_id  INT REFERENCES departments(id),
  is_read         BOOLEAN DEFAULT false,
  due_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── 샘플 데이터 ──────────────────────────────────────────

INSERT INTO departments (name, code) VALUES
  ('경영관리', 'MGT'),
  ('생산', 'PRD'),
  ('품질', 'QA'),
  ('영업', 'SLS');

-- ── Module 7: 근태 관리 ──────────────────────────────────

CREATE TABLE attendance_records (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  type              VARCHAR(20) NOT NULL,  -- '연차','반차오전','반차오후','외근','출장','재택','병가','기타'
  note              TEXT,
  status            VARCHAR(20) DEFAULT '승인',  -- '대기' | '승인' | '반려'
  approver_id       INT REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 연차 할당량
CREATE TABLE leave_quotas (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year        INT NOT NULL,
  total_days  NUMERIC(4,1) DEFAULT 15,
  used_days   NUMERIC(4,1) DEFAULT 0,
  note        TEXT,
  UNIQUE(user_id, year)
);

CREATE TABLE special_workdays (
  date    DATE PRIMARY KEY,
  reason  VARCHAR(200)
);

-- ── Seed Data ──────────────────────────────────────────

INSERT INTO users (name, email, department_id, position, role, joined_at) VALUES
  ('관리자', 'admin@kog.co.kr', 1, '팀장', 'admin', '2020-01-01'),
  ('김생산', 'kim@kog.co.kr', 2, '과장', 'manager', '2021-03-15'),
  ('이품질', 'lee@kog.co.kr', 3, '대리', 'staff', '2022-06-01'),
  ('박영업', 'park@kog.co.kr', 4, '사원', 'staff', '2023-01-10');

INSERT INTO projects (title, category, department_id, owner_id, start_date, due_date, status, progress_pct, description) VALUES
  ('VSM 라인개선 3차', 'VSM', 2, 2, '2026-01-10', '2026-03-20', '지연', 65, '생산라인 가치흐름 개선 3차 과제'),
  ('거래처 인증 갱신', '품질', 3, 3, '2026-02-01', '2026-03-31', '지연', 40, 'ISO 거래처 인증서 갱신'),
  ('신규거래처 계약', '영업', 4, 4, '2026-03-01', '2026-04-01', '지연', 80, 'A사 신규 계약 체결'),
  ('ISO 문서 개정', '품질', 1, 1, '2026-03-15', '2026-04-04', '지연', 90, 'ISO 9001 내부 문서 개정'),
  ('하반기 원가절감 계획', '기타', 1, 1, '2026-04-01', '2026-06-30', '진행중', 10, '원가절감 목표 수립 및 실행');
