# Low Level Design (LLD) -- 근태 관리 / 업무일지 / 업무 리포트

**프로젝트:** KOG International 경영관리 지원 시스템 (KOG MSS)
**문서 버전:** 1.0
**작성일:** 2026-04-16
**작성자:** 시스템 개발팀

---

## 1. 컴포넌트 아키텍처

### 1.1 근태 관리 모듈

```
/hr/attendance/
├── page.tsx              (서버 컴포넌트) 데이터 fetch + 권한 확인
└── AttendanceClient.tsx  (클라이언트 컴포넌트) 캘린더, 필터, 폼, 승인 UI
```

#### page.tsx (서버 컴포넌트)

- Supabase 서버 클라이언트를 통해 다음 데이터를 fetch 한다:
  - `attendance_records`: 전체 근태 기록 (조인: users, departments)
  - `users`: 직원 목록 (role, department_id 포함)
  - `departments`: 부서 목록
  - `leave_quotas`: 연차 할당량 (해당 연도)
- 현재 사용자의 역할(role)을 확인하여 권한 분기 처리
- 샘플 모드 여부(`isSample`) 판별

#### AttendanceClient.tsx (클라이언트 컴포넌트)

- **Props 인터페이스:**
  ```typescript
  interface AttendanceClientProps {
    attendance: AttendanceRecord[]
    users: User[]
    departments: Department[]
    leaveQuotas: LeaveQuota[]
    role: 'admin' | 'manager' | 'staff'
    isSample: boolean
    currentUserId: number
  }
  ```
- 캘린더 렌더링, 날짜 선택, 필터 적용
- 근태 등록/신청 폼 모달
- 승인/반려 UI (매니저/admin 전용)
- 다일 등록 모드

### 1.2 업무일지 모듈

```
/worklogs/
├── page.tsx              (서버 컴포넌트) 날짜 기반 데이터 fetch
└── WorklogClient.tsx     (클라이언트 컴포넌트) 업무 CRUD, 근태 인라인, 마감 배너
```

#### page.tsx (서버 컴포넌트)

- `searchParams`에서 `date` 파라미터를 추출하여 조회 날짜 결정
- `work_logs`: 해당 날짜의 전체 업무 기록 fetch
- `attendance_records`: 해당 날짜의 근태 기록 fetch (인라인 근태 표시용)
- `users`, `departments`: 직원/부서 목록 fetch
- 공휴일/특근일 판별 (`holidays.ts` 참조)

#### WorklogClient.tsx (클라이언트 컴포넌트)

- 업무 목록 렌더링 (직원별 그룹핑)
- 업무 추가/편집/삭제 기능
- 달성 토글 및 미달성 사유 입력
- 이전일 업무 복사 모달
- 근태 인라인 드롭다운
- 08:30 KST 마감 배너 (실시간 시계)

### 1.3 업무 리포트 모듈

```
/worklogs/report/
├── page.tsx              (서버 컴포넌트) 기간별 집계 + 부서 필터
├── ReportHeader.tsx      (클라이언트 컴포넌트) 탭, 날짜, 부서 필터, 인쇄 버튼
└── ReportPrintButton.tsx (클라이언트 컴포넌트) window.print()
```

#### page.tsx (서버 컴포넌트)

- `searchParams`에서 `type`(daily/weekly/monthly), `date`, `dept` 파라미터를 추출
- 기간에 따른 `work_logs` 집계 쿼리 실행
- `dept` 파라미터가 있으면 해당 부서 데이터만 필터링
- KPI 집계 데이터 계산 (총건수, 달성, 미달성, 달성률)
- 직책별/부서별 달성률 계산
- 당일 보고서인 경우 미작성자 목록 산출

#### ReportHeader.tsx (클라이언트 컴포넌트)

- 보고서 유형 탭 (당일/주간/월간) 전환
- 날짜 선택기
- 부서 드롭다운 필터
- URL 파라미터 업데이트 (`router.push`)

#### ReportPrintButton.tsx (클라이언트 컴포넌트)

- `window.print()` 호출
- 인쇄 전 결재란 표시 토글

---

## 2. 데이터베이스 스키마

### 2.1 attendance_records (변경)

| 컬럼 | 타입 | 제약 | 설명 | 신규 |
|------|------|------|------|------|
| id | SERIAL | PK | 근태 기록 고유 ID | |
| user_id | INT | FK -> users(id), NOT NULL | 대상 직원 | |
| date | DATE | NOT NULL | 근태 날짜 | |
| type | VARCHAR(20) | NOT NULL | 근태 유형 (연차/반차오전/반차오후/외근/출장/재택/병가/기타) | |
| note | TEXT | | 사유 또는 메모 | |
| status | VARCHAR(20) | NOT NULL, DEFAULT '승인' | 승인 상태 ('대기'/'승인'/'반려') | **신규** |
| approver_id | INT | FK -> users(id) | 승인/반려 처리자 ID | **신규** |
| approved_at | TIMESTAMPTZ | | 승인/반려 처리 시각 | **신규** |
| rejection_reason | TEXT | | 반려 사유 (반려 시 필수) | **신규** |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 시각 | |

**제약 조건:**
- `UNIQUE(user_id, date)` -- 동일 직원의 동일 날짜 중복 등록 방지

**인덱스:**
- `idx_attendance_user_date` ON (user_id, date)
- `idx_attendance_status` ON (status)
- `idx_attendance_date` ON (date)

### 2.2 leave_quotas (신규 테이블)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | SERIAL | PK | 쿼터 고유 ID |
| user_id | INT | FK -> users(id), NOT NULL | 대상 직원 |
| year | INT | NOT NULL | 적용 연도 |
| total_days | NUMERIC(4,1) | NOT NULL, DEFAULT 15.0 | 총 연차 일수 |
| used_days | NUMERIC(4,1) | NOT NULL, DEFAULT 0.0 | 사용 연차 일수 (계산 필드) |
| note | TEXT | | 비고 (특이사항) |

**제약 조건:**
- `UNIQUE(user_id, year)` -- 동일 직원의 동일 연도 중복 방지

**인덱스:**
- `idx_leave_quotas_user_year` ON (user_id, year)

### 2.3 work_logs (기존 유지)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | SERIAL | PK | 업무 고유 ID |
| user_id | INT | FK -> users(id), NOT NULL | 작성자 |
| log_date | DATE | NOT NULL | 업무 날짜 |
| log_type | VARCHAR(20) | NOT NULL | 업무 유형 (정기업무/프로젝트/돌발업무) |
| title | VARCHAR(200) | NOT NULL | 업무 제목 |
| description | TEXT | | 업무 상세 설명 |
| is_planned | BOOLEAN | DEFAULT true | 예정 업무 여부 |
| achieved | BOOLEAN | DEFAULT false | 달성 여부 |
| note | TEXT | | 미달성 사유 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성 시각 |

**인덱스:**
- `idx_worklogs_user_date` ON (user_id, log_date)
- `idx_worklogs_date` ON (log_date)

### 2.4 ER 다이어그램 (텍스트)

```
users (기존)
├── id (PK)
├── name
├── email
├── password_hash
├── role (admin/manager/staff)
├── position
└── department_id (FK -> departments)

departments (기존)
├── id (PK)
└── name

attendance_records
├── id (PK)
├── user_id (FK -> users)
├── date
├── type
├── note
├── status          ← 신규
├── approver_id     ← 신규 (FK -> users)
├── approved_at     ← 신규
├── rejection_reason ← 신규
└── created_at

leave_quotas        ← 신규 테이블
├── id (PK)
├── user_id (FK -> users)
├── year
├── total_days
├── used_days
└── note

work_logs (기존)
├── id (PK)
├── user_id (FK -> users)
├── log_date
├── log_type
├── title
├── description
├── is_planned
├── achieved
├── note
└── created_at
```

---

## 3. API / 데이터 흐름

### 3.1 근태 승인 워크플로우

```
[직원 (staff)]
    │
    ▼
근태 신청 클릭
    │
    ▼
INSERT INTO attendance_records
  (user_id, date, type, note, status)
  VALUES (본인ID, 날짜, 유형, 사유, '대기')
    │
    ▼
[매니저/admin]
    │
    ├─── 승인 ──→ UPDATE attendance_records
    │              SET status = '승인',
    │                  approver_id = 현재유저ID,
    │                  approved_at = NOW()
    │              WHERE id = 대상ID
    │
    └─── 반려 ──→ UPDATE attendance_records
                   SET status = '반려',
                       approver_id = 현재유저ID,
                       approved_at = NOW(),
                       rejection_reason = '입력한 사유'
                   WHERE id = 대상ID
```

**참고:** 별도 API 라우트를 사용하지 않고 Supabase 브라우저 클라이언트를 직접 사용한다. 이는 기존 `AttendanceClient`, `WorklogClient` 등의 패턴과 동일하다.

### 3.2 다일 등록 플로우

```
[폼 입력]
  시작일: 2026-04-07
  종료일: 2026-04-11
  유형: 연차
  사유: 개인 사정
    │
    ▼
[클라이언트 로직] 날짜 범위 계산
  1. 시작일~종료일 사이 모든 날짜 배열 생성
  2. checkRestDay(date) 함수로 각 날짜 검증:
     - 토요일/일요일 → 제외
     - holidays.ts에 정의된 공휴일 → 제외
  3. 결과: 평일 목록 (예: [04-07, 04-08, 04-09, 04-10, 04-11] → 5일)
    │
    ▼
[확인 다이얼로그]
  "2026-04-07 ~ 2026-04-11, 총 5일 등록하시겠습니까?"
  (공휴일 0일, 주말 0일 제외)
    │
    ▼
[사용자 확인]
    │
    ▼
[Supabase] N건 개별 INSERT (upsert)
  for each date in 평일목록:
    INSERT INTO attendance_records
      (user_id, date, type, note, status)
    VALUES (대상ID, date, '연차', '개인 사정', status)
    ON CONFLICT (user_id, date) DO NOTHING
```

**checkRestDay 함수 로직:**
```typescript
function checkRestDay(date: Date): boolean {
  const day = date.getDay()
  if (day === 0 || day === 6) return true  // 주말
  const dateStr = formatDate(date)         // 'YYYY-MM-DD'
  return HOLIDAYS.includes(dateStr)        // 공휴일
}
```

### 3.3 업무일지 편집 플로우

```
[편집 버튼 클릭]
    │
    ▼
인라인 편집 모드 진입
  - editingId = log.id (편집 대상 설정)
  - editForm = { title: log.title, log_type: log.log_type, description: log.description }
    │
    ▼
[사용자 수정]
  - 제목: text input 으로 변경
  - 유형: 3버튼(정기업무/프로젝트/돌발업무) 중 선택
  - 설명: textarea 로 변경
    │
    ▼
[저장 버튼 클릭]
    │
    ▼
Supabase UPDATE work_logs
  SET title = editForm.title,
      log_type = editForm.log_type,
      description = editForm.description
  WHERE id = editingId
    │
    ▼
[상태 초기화]
  editingId = null
  editForm = null
  로컬 데이터 갱신 (setState)
```

### 3.4 이전일 복사 플로우

```
["어제 업무 복사" 버튼 클릭]
    │
    ▼
showCopyModal = true
    │
    ▼
[Supabase 조회]
  SELECT * FROM work_logs
  WHERE user_id = 현재유저ID
    AND log_date = 어제날짜
  ORDER BY created_at ASC
    │
    ▼
[미리보기 모달 표시]
  전일 업무 목록을 체크박스와 함께 표시
  selectedCopyIds: Set<number> 으로 선택 관리
    │
    ▼
[복사 버튼 클릭]
    │
    ▼
선택된 항목 각각에 대해:
  INSERT INTO work_logs
    (user_id, log_date, log_type, title, description, is_planned, achieved, note)
  VALUES
    (현재유저ID, 오늘날짜, 원본.log_type, 원본.title,
     원본.description, 원본.is_planned, false, '')
    │
    ▼
[모달 닫기 + 로컬 데이터 갱신]
```

### 3.5 부서별 리포트 필터

```
URL: /worklogs/report?type=weekly&date=2026-04-14&dept=2

[서버] page.tsx
  1. searchParams에서 파라미터 추출:
     - type = 'weekly'
     - date = '2026-04-14'
     - dept = 2
  2. 기간 계산:
     - weekly → 2026-04-14(월) ~ 2026-04-18(금)
  3. work_logs 쿼리:
     SELECT * FROM work_logs
     WHERE log_date BETWEEN '2026-04-14' AND '2026-04-18'
  4. dept 필터 적용:
     - users 테이블과 조인하여 department_id = 2인 직원만 필터
  5. departments 목록 fetch (드롭다운 렌더링용)
  6. 집계 데이터 계산:
     - 총 건수, 달성 건수, 미달성 건수, 달성률
     - 직책별 달성률
     - 부서별 달성률
    │
    ▼
[클라이언트] ReportHeader
  - 부서 드롭다운: departments 목록 렌더링
  - 부서 변경 시:
    router.push(`/worklogs/report?type=${type}&date=${date}&dept=${newDeptId}`)
  - "전체" 선택 시:
    router.push(`/worklogs/report?type=${type}&date=${date}`)
    (dept 파라미터 제거)
```

---

## 4. 상태 관리 설계

### 4.1 AttendanceClient 상태

```typescript
// === 기존 상태 ===
const [year, setYear] = useState<number>(currentYear)
const [month, setMonth] = useState<number>(currentMonth)
const [filterDept, setFilterDept] = useState<number | ''>('')
const [filterType, setFilterType] = useState<string>('')
const [selectedDate, setSelectedDate] = useState<string | null>(null)
const [showForm, setShowForm] = useState<boolean>(false)
const [saving, setSaving] = useState<boolean>(false)
const [form, setForm] = useState<AttendanceForm>({
  user_id: '',
  date: '',
  type: '',
  note: ''
})

// === 신규 상태 ===

// 승인/반려 관련
const [showRejectModal, setShowRejectModal] = useState<boolean>(false)
const [rejectingId, setRejectingId] = useState<number | null>(null)
const [rejectReason, setRejectReason] = useState<string>('')

// 다일 등록 관련
const [dateRange, setDateRange] = useState<boolean>(false)
const [dateTo, setDateTo] = useState<string>('')

// 로컬 데이터 (서버 데이터의 클라이언트 사본)
const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[]>(attendance)
const [localLeaveQuotas, setLocalLeaveQuotas] = useState<LeaveQuota[]>(leaveQuotas)
```

**상태 전이 다이어그램 (승인 워크플로우):**

```
                    ┌─────────┐
                    │  대기   │ ← 직원 신청 시 초기 상태
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              │                     │
              ▼                     ▼
        ┌─────────┐          ┌─────────┐
        │  승인   │          │  반려   │
        └─────────┘          └─────────┘
```

### 4.2 WorklogClient 상태

```typescript
// === 기존 상태 ===
const [logs, setLogs] = useState<WorkLog[]>(initialLogs)
const [showAddForm, setShowAddForm] = useState<boolean>(false)
const [newLog, setNewLog] = useState<NewLogForm>({
  title: '',
  log_type: '정기업무',
  description: '',
  is_planned: true
})
const [filterType, setFilterType] = useState<string>('')
const [filterUser, setFilterUser] = useState<number | ''>('')

// === 신규 상태 ===

// 편집 관련
const [editingId, setEditingId] = useState<number | null>(null)
const [editForm, setEditForm] = useState<EditForm>({
  title: '',
  log_type: '',
  description: ''
})

// 이전일 복사 관련
const [showCopyModal, setShowCopyModal] = useState<boolean>(false)
const [prevLogs, setPrevLogs] = useState<WorkLog[]>([])
const [selectedCopyIds, setSelectedCopyIds] = useState<Set<number>>(new Set())
const [copyLoading, setCopyLoading] = useState<boolean>(false)
```

### 4.3 ReportHeader 상태

```typescript
// 보고서 유형 (URL 파라미터 기반)
const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily')

// 날짜 선택
const [selectedDate, setSelectedDate] = useState<string>(today)

// 부서 필터
const [selectedDept, setSelectedDept] = useState<number | ''>('')
```

---

## 5. UI 와이어프레임 (텍스트)

### 5.1 근태 등록 모달 (고도화)

```
┌──────────────────────────────────────┐
│  근태 등록/신청                  [X] │
├──────────────────────────────────────┤
│                                      │
│  직원 *                              │
│  [▼ 김철수 부장 - 생산부         ]   │
│                                      │
│  ☐ 연속 등록 (다일)                  │
│                                      │
│  시작일 *                            │
│  [ 2026-04-07               ]       │
│                                      │
│  종료일 (연속 등록 활성화 시)         │
│  [ 2026-04-11               ]       │
│  → 평일 5일 (공휴일 0일 제외)        │
│                                      │
│  유형 *                              │
│  ┌──────┐┌──────┐┌──────┐┌──────┐   │
│  │ 연차 ││반차AM││반차PM││ 외근 │   │
│  └──────┘└──────┘└──────┘└──────┘   │
│  ┌──────┐┌──────┐┌──────┐┌──────┐   │
│  │ 출장 ││ 재택 ││ 병가 ││ 기타 │   │
│  └──────┘└──────┘└──────┘└──────┘   │
│                                      │
│  잔여 연차: 12.0 / 15.0일           │
│  ████████████░░░░ 80%                │
│                                      │
│  비고                                │
│  [______________________________]   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │       등록 / 신청             │   │
│  └──────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘
```

**주요 동작:**
- 직원(staff) 로그인 시 직원 드롭다운이 본인으로 고정됨
- "연속 등록" 체크 시 종료일 입력 필드 활성화, 평일 계산 결과 표시
- 연차/반차 선택 시 잔여 연차 정보 표시
- staff 역할일 경우 버튼 텍스트가 "신청"으로 표시

### 5.2 승인/반려 UI (날짜 상세 패널)

```
┌──────────────────────────────────────┐
│  4월 7일 (월) 상세                [+]│
├──────────────────────────────────────┤
│                                      │
│  ● [대기] 연차                       │
│    박민준 대리 | 생산부              │
│    사유: 개인 사정                    │
│    신청일: 2026-04-04                │
│    ┌──────────┐  ┌──────────┐       │
│    │  ✓ 승인   │  │  ✗ 반려   │       │
│    └──────────┘  └──────────┘       │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  ● [승인] 외근                       │
│    김철수 부장 | 생산부              │
│    사유: 협력사 점검                  │
│    승인자: 이관리 | 2026-04-03       │
│                              [삭제] │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  ● [반려] 연차                       │
│    이영희 사원 | 경영지원부           │
│    반려 사유: 인원 부족 기간          │
│    처리자: 이관리 | 2026-04-02       │
│                                      │
└──────────────────────────────────────┘
```

**주요 동작:**
- 대기 상태: 승인/반려 버튼 표시 (매니저/admin에게만)
- 승인 상태: 승인자 정보 표시, 삭제 버튼 (매니저/admin에게만)
- 반려 상태: 반려 사유 표시
- [+] 버튼: 해당 날짜에 근태 등록 폼 열기

### 5.3 반려 사유 입력 모달

```
┌──────────────────────────────────────┐
│  근태 반려                       [X] │
├──────────────────────────────────────┤
│                                      │
│  대상: 박민준 대리 - 연차            │
│  날짜: 2026-04-07                    │
│                                      │
│  반려 사유 *                         │
│  ┌──────────────────────────────┐   │
│  │                              │   │
│  │                              │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────┐  ┌──────────────┐    │
│  │   취소    │  │   반려 확인   │    │
│  └──────────┘  └──────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

### 5.4 업무 편집 인라인

```
┌──────────────────────────────────────┐
│  편집 모드                    [취소] │
├──────────────────────────────────────┤
│                                      │
│  유형:                               │
│  ┌────────┐┌──────────┐┌──────┐    │
│  │정기업무││ 프로젝트  ││ 돌발 │    │
│  └────────┘└──────────┘└──────┘    │
│                                      │
│  제목:                               │
│  [생산라인 일일 점검_____________]   │
│                                      │
│  설명:                               │
│  ┌──────────────────────────────┐   │
│  │ 1~3호 라인 점검 완료         │   │
│  │ 이상 없음                    │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │           저장                │   │
│  └──────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘
```

### 5.5 이전일 복사 모달

```
┌──────────────────────────────────────┐
│  어제 업무 복사                  [X] │
│  2026-04-15 (화) 업무 → 오늘 복사    │
├──────────────────────────────────────┤
│                                      │
│  ☑ [정기] 생산라인 일일 점검         │
│     1~3호 라인 점검                  │
│                                      │
│  ☑ [프로젝트] VSM 4월 진도보고       │
│     주간 진행 상황 정리              │
│                                      │
│  ☐ [돌발] 설비 2호기 긴급 대응       │
│     전기 계통 점검                   │
│                                      │
├──────────────────────────────────────┤
│  선택 2건을 오늘 업무로 복사         │
│                                      │
│  ┌──────────────────────────────┐   │
│  │           복사                │   │
│  └──────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘
```

### 5.6 리포트 헤더 (부서 필터 추가)

```
┌──────────────────────────────────────────────────┐
│                                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │ 당일 │ │ 주간 │ │ 월간 │    보고서 유형 탭     │
│  └──────┘ └──────┘ └──────┘                      │
│                                                    │
│  날짜: [◀] 2026-04-14 ~ 04-18 [▶]               │
│                                                    │
│  부서: [▼ 전체 부서               ]               │
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ 총건수    달성     미달성    달성률       │    │
│  │  45       38        7       84.4%        │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
│  부서별 달성률                                     │
│  ┌──────────────────────────────────────────┐    │
│  │ 생산부     ████████████░░░ 85.0% (17/20) │    │
│  │ 경영지원부 ██████████░░░░░ 78.5% (11/14) │    │
│  │ 품질관리부 █████████████░░ 90.9% (10/11) │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
│                                   [인쇄]          │
│                                                    │
└──────────────────────────────────────────────────┘
```

### 5.7 인쇄 시 결재란 (print only)

```
┌──────────────────────────────────────────────────┐
│                   결  재                          │
├──────────┬──────────┬──────────┬──────────┤      │
│  구분    │  작성    │  검토    │  승인    │      │
├──────────┼──────────┼──────────┼──────────┤      │
│          │          │          │          │      │
│  서명    │          │          │          │      │
│          │          │          │          │      │
├──────────┼──────────┼──────────┼──────────┤      │
│  일자    │   /  /   │   /  /   │   /  /   │      │
└──────────┴──────────┴──────────┴──────────┘      │
└──────────────────────────────────────────────────┘
```

---

## 6. 샘플 데이터 변경

### 6.1 SAMPLE_ATTENDANCE 확장

기존 15건의 샘플 데이터에 `status` 필드를 추가하고, 대기 상태 2건을 신규 추가한다.

**기존 데이터 변경:**
- 모든 기존 레코드에 `status: '승인'` 필드 추가

**신규 추가 (대기 상태 2건):**

```typescript
// 대기 상태 샘플 데이터
{ user_id: 2, date: '2026-04-25', type: '연차',     status: '대기', note: '개인 사정' },
{ user_id: 4, date: '2026-04-28', type: '반차오전',  status: '대기', note: '병원 진료' },
```

### 6.2 SAMPLE_LEAVE_QUOTAS 신규

```typescript
const SAMPLE_LEAVE_QUOTAS: LeaveQuota[] = [
  { id: 1, user_id: 1, year: 2026, total_days: 20.0, used_days: 3.0,  note: '근속 26년' },
  { id: 2, user_id: 2, year: 2026, total_days: 17.0, used_days: 5.5,  note: '근속 11년' },
  { id: 3, user_id: 3, year: 2026, total_days: 15.0, used_days: 2.0,  note: '근속 3년' },
  { id: 4, user_id: 4, year: 2026, total_days: 11.0, used_days: 1.0,  note: '입사 1년 미만' },
  { id: 5, user_id: 5, year: 2026, total_days: 20.0, used_days: 4.0,  note: '근속 16년' },
]
```

**연차 할당 기준 (참고):**
- 1년 미만: 11일
- 1~3년: 15일
- 3~10년: 15일
- 10~20년: 17일
- 20년 이상: 20일

---

## 7. 검증 체크리스트

### 7.1 근태 관리

- [ ] 직원이 근태를 신청하면 `status='대기'`로 저장된다
- [ ] 매니저/admin이 직접 등록하면 `status='승인'`으로 즉시 저장된다
- [ ] 매니저가 승인하면 `status='승인'`, `approver_id`, `approved_at`이 기록된다
- [ ] 매니저가 반려하면 반려 사유 입력이 필수이다
- [ ] 반려 시 `status='반려'`, `rejection_reason`, `approver_id`, `approved_at`이 기록된다
- [ ] 다일 등록 시 공휴일/주말이 자동으로 제외된다
- [ ] 다일 등록 전 확인 다이얼로그에 등록 일수가 표시된다
- [ ] 연차 잔여일수가 등록 모달에 실시간으로 표시된다
- [ ] 잔여 연차 초과 시 경고 메시지가 표시된다
- [ ] staff 역할 직원이 본인 근태를 캘린더에서 확인할 수 있다
- [ ] 대기/승인/반려 상태가 시각적으로 구분된다
- [ ] 근태 삭제 시 확인 다이얼로그가 표시된다
- [ ] 근태 삭제는 매니저/admin만 가능하다

### 7.2 업무일지

- [ ] 업무 등록 시 제목과 유형이 필수 입력이다
- [ ] 업무 유형 3종(정기/프로젝트/돌발)이 정상 작동한다
- [ ] 달성 토글이 즉시 반영된다
- [ ] 미달성 시 사유 입력 영역이 활성화된다
- [ ] 업무 편집 시 제목/설명/유형이 변경 가능하다
- [ ] 편집 모드에서 저장/취소가 정상 작동한다
- [ ] 이전일 복사 모달에 전일 업무가 표시된다
- [ ] 선택한 항목만 오늘로 복사된다 (achieved=false 초기화)
- [ ] 전일 업무가 없을 경우 적절한 메시지가 표시된다
- [ ] 08:30 KST 마감 배너가 실시간으로 업데이트된다
- [ ] 과거 날짜는 staff에게 읽기 전용이다
- [ ] 과거 날짜는 admin/manager에게 편집 가능하다

### 7.3 업무 리포트

- [ ] 당일/주간/월간 탭 전환이 정상 작동한다
- [ ] KPI 요약(총건수, 달성, 미달성, 달성률)이 정확하다
- [ ] 부서 필터 변경 시 URL 파라미터가 업데이트된다
- [ ] 부서별 달성률 통계가 정상 표시된다
- [ ] 직책별 달성률 프로그레스 바가 정상 표시된다
- [ ] 당일 보고서에 미작성자가 표시된다
- [ ] 인쇄 시 결재란이 표시된다
- [ ] 인쇄 시 화면 전용 UI(필터, 버튼)가 숨겨진다

### 7.4 샘플 모드

- [ ] 샘플 모드에서 승인/반려 UI가 표시된다 (대기 상태 데이터 포함)
- [ ] 샘플 모드에서 연차 잔여일수가 표시된다
- [ ] 샘플 모드에서 업무 편집 UI가 표시된다
- [ ] 샘플 모드에서 이전일 복사 모달이 표시된다
- [ ] 샘플 모드에서 부서별 리포트 필터가 작동한다
- [ ] 샘플 모드에서 데이터 변경(등록/수정/삭제)이 차단된다

---

## 부록: 문서 이력

| 버전 | 일자 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-16 | 초안 작성 |
