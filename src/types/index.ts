export type Role = 'admin' | 'manager' | 'staff'
export type ProjectStatus = '진행중' | '완료' | '지연' | '보류'
export type ProjectCategory = 'VSM' | '영업' | '품질' | '기타'
export type Priority = 'high' | 'medium' | 'low'
export type NotificationModule = 'project' | 'education' | 'schedule' | 'hr' | 'document' | 'inspection'

export interface Department {
  id: number
  name: string
  code: string
  manager_id: number | null
}

export interface User {
  id: number
  name: string
  email: string
  department_id: number
  position: string
  role: Role
  joined_at: string
  is_active: boolean
  departments?: Department
}

export interface Project {
  id: number
  title: string
  category: ProjectCategory
  department_id: number
  owner_id: number
  start_date: string
  due_date: string
  status: ProjectStatus
  progress_pct: number
  description: string
  created_at: string
  updated_at: string
  departments?: Department
  users?: User
  delay_days?: number  // 계산 필드
}

export interface WorkLog {
  id: number
  user_id: number
  log_date: string
  log_type: '정기업무' | '프로젝트' | '돌발업무'
  title: string
  description: string
  is_planned: boolean
  achieved: boolean
  note: string
  created_at: string
  users?: User
}

export interface ProjectMilestone {
  id: number
  project_id: number
  title: string
  due_date: string
  completed_at: string | null
  status: '대기' | '완료' | '지연'
}

export interface Notification {
  id: number
  source_module: NotificationModule
  ref_id: number
  title: string
  message: string
  priority: Priority
  target_user_id: number | null
  target_dept_id: number | null
  is_read: boolean
  due_date: string
  created_at: string
}

export interface Inspection {
  id: number
  title: string
  category: string
  responsible_dept_id: number
  legal_cycle_months: number
  last_inspection_date: string
  next_due_date: string
  notify_days_before: number
  status: '정상' | '임박' | '만료'
  note: string
  departments?: Department
  days_until_due?: number  // 계산 필드
}

export interface HrEvent {
  id: number
  user_id: number
  event_type: string
  due_date: string
  status: '대기' | '완료' | '누락'
  note: string
  users?: User
  days_until_due?: number
}

export type AttendanceType = '연차' | '반차오전' | '반차오후' | '외근' | '출장' | '재택' | '병가' | '기타'

export interface AttendanceRecord {
  id: number
  user_id: number
  date: string
  type: AttendanceType
  note: string
  users?: User
}

export interface AnnualSchedule {
  id: number
  title: string
  category: string
  recurrence: 'yearly' | 'monthly' | 'once'
  target_month: number
  target_day: number
  is_company_side: boolean
  is_employee_side: boolean
  description: string
  notify_days_before: number
  days_until_due?: number
}
