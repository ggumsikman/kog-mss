export const SAMPLE_DEPARTMENTS = [
  { id: 1, name: '생산부' },
  { id: 2, name: '품질부' },
  { id: 3, name: '영업부' },
  { id: 4, name: '관리부' },
]

export const SAMPLE_USERS = [
  { id: 1, name: '김철수', position: '부장', role: 'manager', department_id: 1, joined_at: '2000-03-01', departments: { name: '생산부' } },
  { id: 2, name: '이영희', position: '과장', role: 'staff', department_id: 2, joined_at: '2015-08-01', departments: { name: '품질부' } },
  { id: 3, name: '박민준', position: '대리', role: 'staff', department_id: 1, joined_at: '2023-04-10', departments: { name: '생산부' } },
  { id: 4, name: '최지현', position: '사원', role: 'staff', department_id: 3, joined_at: '2026-03-02', departments: { name: '영업부' } },
  { id: 5, name: '정수호', position: '차장', role: 'admin', department_id: 4, joined_at: '2010-07-15', departments: { name: '관리부' } },
]

// today = '2026-04-05'
export const SAMPLE_PROJECTS = [
  {
    id: 1, title: 'VSM 개선 프로젝트', category: 'VSM', status: '진행중',
    progress_pct: 65, start_date: '2026-01-10', due_date: '2026-06-30',
    description: '생산라인 가치흐름 분석 및 낭비 제거를 통한 리드타임 30% 단축 목표',
    department_id: 1, user_id: 1,
    departments: { name: '생산부' }, users: { name: '김철수', position: '부장' },
    computed_status: '진행중', delay_days: 0,
  },
  {
    id: 2, title: '품질 불량률 개선 TFT', category: '품질', status: '진행중',
    progress_pct: 40, start_date: '2026-02-01', due_date: '2026-05-31',
    description: '불량률 현 2.3%에서 0.5% 이하로 감소 목표',
    department_id: 2, user_id: 2,
    departments: { name: '품질부' }, users: { name: '이영희', position: '과장' },
    computed_status: '진행중', delay_days: 0,
  },
  {
    id: 3, title: '신규 거래처 개발', category: '영업', status: '완료',
    progress_pct: 100, start_date: '2026-01-02', due_date: '2026-03-31',
    description: '국내 완성차 업체 2개사 신규 공급망 진입',
    department_id: 3, user_id: 4,
    departments: { name: '영업부' }, users: { name: '최지현', position: '사원' },
    computed_status: '완료', delay_days: 0,
  },
  {
    id: 4, title: '생산라인 효율화', category: 'VSM', status: '진행중',
    progress_pct: 30, start_date: '2025-12-01', due_date: '2026-03-01',
    description: '라인 재배치 및 자동화 설비 도입',
    department_id: 1, user_id: 3,
    departments: { name: '생산부' }, users: { name: '박민준', position: '대리' },
    computed_status: '지연', delay_days: 35,
  },
]

export const SAMPLE_PROJECT_MILESTONES = [
  { id: 1, project_id: 1, title: '현황 분석 완료', due_date: '2026-02-28', status: '완료', note: null },
  { id: 2, project_id: 1, title: '개선안 도출', due_date: '2026-04-30', status: '진행중', note: '핵심 병목 3개소 확인' },
  { id: 3, project_id: 1, title: '파일럿 라인 적용', due_date: '2026-05-31', status: '대기', note: null },
  { id: 4, project_id: 1, title: '전체 라인 확대 적용', due_date: '2026-06-30', status: '대기', note: null },
]

export const SAMPLE_PROJECT_MEMBERS = [
  { id: 1, project_id: 1, user_id: 1, role: '프로젝트 리더', users: { name: '김철수', position: '부장', departments: { name: '생산부' } } },
  { id: 2, project_id: 1, user_id: 3, role: '실무 담당', users: { name: '박민준', position: '대리', departments: { name: '생산부' } } },
  { id: 3, project_id: 1, user_id: 2, role: '품질 지원', users: { name: '이영희', position: '과장', departments: { name: '품질부' } } },
]

// today = '2026-04-05'
// today = '2026-04-05' | 김철수 3개, 이영희 2개, 박민준 2개(외근), 최지현 1개, 정수호 0개(연차)
export const SAMPLE_WORK_LOGS = [
  // 김철수 부장 – 3건
  {
    id: 1, user_id: 1, log_date: '2026-04-05', log_type: '정기업무',
    title: '생산라인 일일 점검 및 불량 원인 분석',
    description: '1~3호 라인 점검 완료, 미세불량 2건 발견 및 즉시 시정 조치',
    achieved: true, is_planned: true, note: '',
    created_at: '2026-04-05T09:00:00',
    users: { name: '김철수', position: '부장', departments: { name: '생산부' } },
  },
  {
    id: 2, user_id: 1, log_date: '2026-04-05', log_type: '프로젝트',
    title: 'VSM 개선 프로젝트 4월 진도 보고서 작성',
    description: '2단계 개선안 현황 정리 및 팀장보고 완료, 3단계 일정 확정',
    achieved: true, is_planned: true, note: '',
    created_at: '2026-04-05T10:30:00',
    users: { name: '김철수', position: '부장', departments: { name: '생산부' } },
  },
  {
    id: 3, user_id: 1, log_date: '2026-04-05', log_type: '돌발업무',
    title: '설비 2호기 긴급 정지 대응',
    description: '오후 2시 이상 신호 발생, 긴급 정비팀 호출 및 현장 지휘',
    achieved: false, is_planned: false, note: '정비팀 점검 중, 내일 오전 재가동 예정',
    created_at: '2026-04-05T14:00:00',
    users: { name: '김철수', position: '부장', departments: { name: '생산부' } },
  },
  // 이영희 과장 – 2건
  {
    id: 4, user_id: 2, log_date: '2026-04-05', log_type: '정기업무',
    title: '4월 품질검사 결과 리포트 작성 및 전사 배포',
    description: '월간 불량률 1.8% (전월 대비 −0.5p), 부서별 리포트 공유 완료',
    achieved: true, is_planned: true, note: '',
    created_at: '2026-04-05T09:10:00',
    users: { name: '이영희', position: '과장', departments: { name: '품질부' } },
  },
  {
    id: 5, user_id: 2, log_date: '2026-04-05', log_type: '프로젝트',
    title: '불량률 개선 TFT 원인분석 자료 준비',
    description: '5대 주요 불량 유형별 원인분석 중, 설계팀 도면 자료 요청 완료',
    achieved: false, is_planned: true, note: '설계팀 자료 수신 후 마무리 예정',
    created_at: '2026-04-05T11:00:00',
    users: { name: '이영희', position: '과장', departments: { name: '품질부' } },
  },
  // 박민준 대리 – 2건 (외근: 협력사 방문)
  {
    id: 6, user_id: 3, log_date: '2026-04-05', log_type: '정기업무',
    title: '협력사(한국부품) 생산현장 방문 및 공정품질 확인',
    description: '납품 부품 외관·치수 검사 동행, 불량 재발 방지 대책 협의',
    achieved: true, is_planned: true, note: '',
    created_at: '2026-04-05T09:20:00',
    users: { name: '박민준', position: '대리', departments: { name: '생산부' } },
  },
  {
    id: 7, user_id: 3, log_date: '2026-04-05', log_type: '프로젝트',
    title: 'VSM 파일럿 라인 적용 현황 점검',
    description: '오후 복귀 후 파일럿 라인 3개소 현황 검토, 문제점 2건 기록',
    achieved: true, is_planned: true, note: '',
    created_at: '2026-04-05T16:00:00',
    users: { name: '박민준', position: '대리', departments: { name: '생산부' } },
  },
  // 최지현 사원 – 1건
  {
    id: 8, user_id: 4, log_date: '2026-04-05', log_type: '정기업무',
    title: '신규 거래처 미팅 일정 조율 및 견적서 발송',
    description: '(주)대한자동차 담당자와 납품 조건 협의, 견적서 발송 완료',
    achieved: true, is_planned: true, note: '',
    created_at: '2026-04-05T09:30:00',
    users: { name: '최지현', position: '사원', departments: { name: '영업부' } },
  },
  // 정수호 차장 – 0건 (연차)
]

// 근태 기록 (2026년 4월 기준)
export const SAMPLE_ATTENDANCE = [
  { id: 1, user_id: 3, date: '2026-04-05', type: '외근', note: '협력사 방문 — (주)한국부품', status: '승인', approver_id: 1, approved_at: '2026-04-04T17:00:00' },
  { id: 2, user_id: 5, date: '2026-04-05', type: '연차', note: '', status: '승인', approver_id: null, approved_at: null },
  // 4월 추가 근태 데이터
  { id: 3, user_id: 1, date: '2026-04-01', type: '출장', note: '본사 회의 참석', status: '승인', approver_id: null, approved_at: null },
  { id: 4, user_id: 2, date: '2026-04-02', type: '반차오후', note: '개인 사유', status: '승인', approver_id: 1, approved_at: '2026-04-01T16:00:00' },
  { id: 5, user_id: 4, date: '2026-04-03', type: '외근', note: '거래처 미팅', status: '승인', approver_id: 1, approved_at: '2026-04-02T18:00:00' },
  { id: 6, user_id: 3, date: '2026-04-07', type: '연차', note: '', status: '승인', approver_id: 1, approved_at: '2026-04-04T15:00:00' },
  { id: 7, user_id: 1, date: '2026-04-08', type: '재택', note: '보고서 작성', status: '승인', approver_id: null, approved_at: null },
  { id: 8, user_id: 2, date: '2026-04-09', type: '병가', note: '감기', status: '승인', approver_id: 1, approved_at: '2026-04-09T08:30:00' },
  { id: 9, user_id: 4, date: '2026-04-10', type: '출장', note: '대한자동차 방문', status: '승인', approver_id: 1, approved_at: '2026-04-09T17:00:00' },
  { id: 10, user_id: 1, date: '2026-04-14', type: '외근', note: '협력사 점검', status: '승인', approver_id: null, approved_at: null },
  { id: 11, user_id: 3, date: '2026-04-15', type: '반차오전', note: '병원', status: '승인', approver_id: 1, approved_at: '2026-04-14T17:00:00' },
  { id: 12, user_id: 5, date: '2026-04-16', type: '연차', note: '', status: '승인', approver_id: null, approved_at: null },
  { id: 13, user_id: 2, date: '2026-04-21', type: '외근', note: '품질 현장 점검', status: '승인', approver_id: 1, approved_at: '2026-04-18T17:00:00' },
  { id: 14, user_id: 4, date: '2026-04-22', type: '연차', note: '', status: '승인', approver_id: 1, approved_at: '2026-04-21T09:00:00' },
  { id: 15, user_id: 1, date: '2026-04-23', type: '출장', note: '해외 바이어 미팅', status: '승인', approver_id: null, approved_at: null },
  // 대기 중인 근태 (승인 워크플로우 데모)
  { id: 16, user_id: 2, date: '2026-04-25', type: '연차', note: '개인 사유', status: '대기', approver_id: null, approved_at: null },
  { id: 17, user_id: 4, date: '2026-04-28', type: '반차오전', note: '관공서 방문', status: '대기', approver_id: null, approved_at: null },
]

// 연차 할당량 (2026년)
export const SAMPLE_LEAVE_QUOTAS = [
  { id: 1, user_id: 1, year: 2026, total_days: 20, used_days: 0, note: '근속 26년' },
  { id: 2, user_id: 2, year: 2026, total_days: 17, used_days: 0, note: '근속 11년' },
  { id: 3, user_id: 3, year: 2026, total_days: 15, used_days: 0, note: '근속 3년' },
  { id: 4, user_id: 4, year: 2026, total_days: 11, used_days: 0, note: '입사 1년 미만' },
  { id: 5, user_id: 5, year: 2026, total_days: 20, used_days: 0, note: '근속 16년' },
]

// days_until relative to 2026-04-05
export const SAMPLE_EDUCATIONS = [
  {
    id: 1, title: '산업안전보건 정기교육', edu_type: '의무', status: '완료',
    scheduled_date: '2026-03-15', duration_hours: 8, instructor: '한국산업안전보건공단',
    location: '본사 대강당', description: '전 직원 대상 연간 정기 안전교육', note: '전 직원 이수 완료',
    days_until: -21,
    education_targets: [
      { department_id: 1, departments: { name: '생산부' } },
      { department_id: 2, departments: { name: '품질부' } },
    ],
  },
  {
    id: 2, title: '소방 안전교육', edu_type: '의무', status: '예정',
    scheduled_date: '2026-04-20', duration_hours: 2, instructor: '소방안전교육원',
    location: '본사 교육실', description: '화재 예방 및 초기 대응 실습', note: null,
    days_until: 15,
    education_targets: [
      { department_id: 1, departments: { name: '생산부' } },
    ],
  },
  {
    id: 3, title: '리더십 역량 향상 교육', edu_type: '사내', status: '예정',
    scheduled_date: '2026-05-10', duration_hours: 4, instructor: '외부 강사 (김리더)',
    location: '본사 세미나실', description: '팀장급 이상 대상 리더십 역량 강화', note: '팀장급 이상 필수',
    days_until: 35,
    education_targets: [
      { department_id: 4, departments: { name: '관리부' } },
    ],
  },
  {
    id: 4, title: '개인정보보호 교육', edu_type: '의무', status: '예정',
    scheduled_date: '2026-03-28', duration_hours: 1, instructor: null,
    location: '온라인', description: '개인정보보호법 개정사항 안내', note: null,
    days_until: -8,
    education_targets: [
      { department_id: 3, departments: { name: '영업부' } },
      { department_id: 4, departments: { name: '관리부' } },
    ],
  },
]

// Sample education detail (id=2, 소방 안전교육)
export const SAMPLE_EDU_DETAIL = SAMPLE_EDUCATIONS[1]
export const SAMPLE_EDU_TARGETS = [{ department_id: 1, departments: { id: 1, name: '생산부' } }]
export const SAMPLE_EDU_ATTENDANCE_MAP: Record<number, any> = {
  1: { id: 1, user_id: 1, education_id: 2, attended: true },
  3: { id: 2, user_id: 3, education_id: 2, attended: false },
}
export const SAMPLE_EDU_TARGET_USERS = [
  { id: 1, name: '김철수', position: '부장', department_id: 1, departments: { name: '생산부' } },
  { id: 3, name: '박민준', position: '대리', department_id: 1, departments: { name: '생산부' } },
]

// days_until relative to 2026-04-05
export const SAMPLE_SCHEDULES = [
  {
    id: 1, title: '정기 주주총회', category: '경영', target_month: 3, target_day: 28,
    recurrence: 'yearly', is_active: true, note: '이사회 결의 및 감사보고서 사전 준비 필요',
    days_until: 357, next_date: '2027-03-28',
  },
  {
    id: 2, title: '상반기 사업계획 검토', category: '경영', target_month: 6, target_day: 30,
    recurrence: 'yearly', is_active: true, note: '부서별 목표 대비 실적 취합',
    days_until: 86, next_date: '2026-06-30',
  },
  {
    id: 3, title: '안전보건 점검의 날', category: '안전', target_month: null, target_day: 4,
    recurrence: 'monthly', is_active: true, note: '매월 4일 현장 안전 순찰',
    days_until: 29, next_date: '2026-05-04',
  },
  {
    id: 4, title: '정기 설비 보전 점검', category: '생산', target_month: null, target_day: 15,
    recurrence: 'monthly', is_active: true, note: '전 설비 예방보전 점검',
    days_until: 10, next_date: '2026-04-15',
  },
  {
    id: 5, title: '연간 법정교육 완료 보고', category: '교육', target_month: 12, target_day: 31,
    recurrence: 'yearly', is_active: true, note: '고용노동부 제출용 이수율 보고서',
    days_until: 270, next_date: '2026-12-31',
  },
  {
    id: 6, title: '하반기 인사평가', category: '인사', target_month: 7, target_day: 1,
    recurrence: 'yearly', is_active: true, note: '전 직원 상반기 업적 평가',
    days_until: 87, next_date: '2026-07-01',
  },
]

export const SAMPLE_HR_EVENTS = [
  {
    id: 1, title: '박민준 대리 계약 만료 예정', event_type: '계약만료', status: '대기',
    due_date: '2026-04-10', user_id: 3, days_until: 5,
    users: { id: 3, name: '박민준', position: '대리', joined_at: '2023-04-10', departments: { name: '생산부' } },
  },
  {
    id: 2, title: '이영희 과장 건강검진', event_type: '건강검진', status: '대기',
    due_date: '2026-04-30', user_id: 2, days_until: 25,
    users: { id: 2, name: '이영희', position: '과장', joined_at: '2015-08-01', departments: { name: '품질부' } },
  },
  {
    id: 3, title: '최지현 사원 생일', event_type: '생일', status: '완료',
    due_date: '2026-03-20', user_id: 4, days_until: -16,
    users: { id: 4, name: '최지현', position: '사원', joined_at: '2026-03-02', departments: { name: '영업부' } },
  },
  {
    id: 4, title: '김철수 부장 장기근속 포상', event_type: '근속포상', status: '대기',
    due_date: '2026-05-15', user_id: 1, days_until: 40,
    users: { id: 1, name: '김철수', position: '부장', joined_at: '2000-03-01', departments: { name: '생산부' } },
  },
]

export const SAMPLE_DOCUMENTS = [
  {
    id: 1, title: '환경부 배출허용기준 준수 점검 통보',
    category: '관공서', status: '접수',
    received_date: '2026-04-04', received_by: 5, handler_id: null,
    department_id: 1, doc_number: '환경부-2026-0401',
    sender: '환경부 한강유역환경청',
    summary: '4월 15일까지 대기오염물질 배출현황 자료 제출 요청. 미제출 시 과태료 부과 예정.',
    note: '4월 15일까지 회신 필요 (긴급)',
    disposal_date: '2027-04-04', days_since: 1,
    users: { name: '정수호', position: '차장' },
    handler: null,
    departments: { name: '생산부' },
  },
  {
    id: 2, title: '거래처 단가 조정 요청 공문',
    category: '거래처', status: '처리중',
    received_date: '2026-04-03', received_by: 4, handler_id: 4,
    department_id: 3, doc_number: 'KCO-2026-0403',
    sender: '(주)한국부품',
    summary: '원자재 가격 상승으로 인한 납품 단가 8% 인상 요청. 계약 재협상 필요.',
    note: null,
    disposal_date: null, days_since: 2,
    users: { name: '최지현', position: '사원' },
    handler: { name: '최지현' },
    departments: { name: '영업부' },
  },
  {
    id: 3, title: '산업안전보건법 시행규칙 개정 안내',
    category: '법령', status: '처리완료',
    received_date: '2026-03-28', received_by: 5, handler_id: 5,
    department_id: 4, doc_number: '고용부-2026-법령-032',
    sender: '고용노동부',
    summary: '2026년 4월 시행 안전보건관리체계 구축 의무화. 50인 이상 사업장 해당.',
    note: '3개월 내 내부 규정 정비 완료',
    disposal_date: '2027-03-28', days_since: 8,
    users: { name: '정수호', position: '차장' },
    handler: { name: '정수호' },
    departments: { name: '관리부' },
  },
  {
    id: 4, title: '소방점검 결과 통보서',
    category: '관공서', status: '처리완료',
    received_date: '2026-03-25', received_by: 5, handler_id: 5,
    department_id: 1, doc_number: '소방서-2026-0325',
    sender: '○○소방서',
    summary: '연간 정기 소방점검 결과 양호 판정. 소화기 2대 교체 권고.',
    note: null,
    disposal_date: null, days_since: 11,
    users: { name: '정수호', position: '차장' },
    handler: { name: '정수호' },
    departments: { name: '생산부' },
  },
]

export const SAMPLE_DOC_HISTORIES = [
  { id: 1, document_id: 3, action: '접수', note: '고용노동부 발송 법령 개정 안내문 접수', action_at: '2026-03-28T09:00:00', users: { name: '정수호', position: '차장' } },
  { id: 2, document_id: 3, action: '처리', note: '팀장 공유 및 내부 규정 검토 착수', action_at: '2026-03-29T10:30:00', users: { name: '정수호', position: '차장' } },
  { id: 3, document_id: 3, action: '완료', note: '규정 정비 일정 수립 완료 (6월 30일 목표)', action_at: '2026-04-02T15:00:00', users: { name: '정수호', position: '차장' } },
]

// days_until relative to 2026-04-05
export const SAMPLE_INSPECTIONS = [
  {
    id: 1, title: '크레인 안전검사', category: '산업안전',
    responsible_dept_id: 1, legal_cycle_months: 12,
    last_inspection_date: '2025-04-01', next_due_date: '2026-04-09',
    notify_days_before: 30, note: null,
    departments: { name: '생산부' }, days_until: 4, status: '임박',
  },
  {
    id: 2, title: '전기안전 정기점검', category: '전기',
    responsible_dept_id: 1, legal_cycle_months: 12,
    last_inspection_date: '2025-02-20', next_due_date: '2026-02-20',
    notify_days_before: 30, note: null,
    departments: { name: '생산부' }, days_until: -44, status: '만료',
  },
  {
    id: 3, title: '소방시설 정기점검', category: '소방',
    responsible_dept_id: 4, legal_cycle_months: 12,
    last_inspection_date: '2025-10-15', next_due_date: '2026-10-15',
    notify_days_before: 30, note: null,
    departments: { name: '관리부' }, days_until: 193, status: '정상',
  },
  {
    id: 4, title: '압력용기 검사', category: '산업안전',
    responsible_dept_id: 1, legal_cycle_months: 24,
    last_inspection_date: '2024-09-01', next_due_date: '2026-09-01',
    notify_days_before: 60, note: '2년 주기 법정 검사',
    departments: { name: '생산부' }, days_until: 149, status: '정상',
  },
  {
    id: 5, title: '환경측정 (작업환경)', category: '환경',
    responsible_dept_id: 1, legal_cycle_months: 6,
    last_inspection_date: '2026-01-05', next_due_date: '2026-07-05',
    notify_days_before: 30, note: null,
    departments: { name: '생산부' }, days_until: 91, status: '정상',
  },
]

export const SAMPLE_INSPECTION_HISTORIES = [
  { id: 1, inspection_id: 2, inspection_date: '2025-02-20', result: '합격', inspector_agency: '한국전기안전공사', certificate_url: null, next_due_date: '2026-02-20', note: null },
  { id: 2, inspection_id: 2, inspection_date: '2024-02-15', result: '합격', inspector_agency: '한국전기안전공사', certificate_url: null, next_due_date: '2025-02-15', note: '전압측정 정상' },
]

// 특근 처리된 날짜 (2026-04-05 = 일요일이지만 특근)
export const SAMPLE_SPECIAL_WORKDAYS = [
  { date: '2026-04-05', reason: '4월 월말 생산 완료 특근' },
]

// Dashboard sample data
export const SAMPLE_DELAYED_PROJECTS = SAMPLE_PROJECTS.filter(p => p.computed_status === '지연')
export const SAMPLE_URGENT_INSPECTIONS = SAMPLE_INSPECTIONS.filter(i => i.status === '임박' || i.status === '만료')
export const SAMPLE_PENDING_DOCS = SAMPLE_DOCUMENTS.filter(d => ['접수', '처리중'].includes(d.status))
export const SAMPLE_THIS_MONTH_EDUCATIONS = SAMPLE_EDUCATIONS.filter(e => e.scheduled_date.startsWith('2026-04') && e.status === '예정')
export const SAMPLE_DEPT_STATS = {
  '1': { name: '생산부', total: 15, done: 12 },
  '2': { name: '품질부', total: 10, done: 9 },
  '3': { name: '영업부', total: 8, done: 5 },
  '4': { name: '관리부', total: 6, done: 6 },
}
