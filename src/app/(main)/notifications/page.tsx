import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/getUser'
import NotificationClient from './NotificationClient'

// 샘플 알림 데이터
const SAMPLE_NOTIFICATIONS = [
  { id: 1, source_module: 'inspection', title: '크레인 안전검사 D-4', message: '생산부 크레인 안전검사가 4일 후 만료됩니다. 즉시 검사 일정을 잡아주세요.', priority: 'high', is_read: false, due_date: '2026-04-09', created_at: '2026-04-05T09:00:00' },
  { id: 2, source_module: 'inspection', title: '전기안전 정기점검 만료', message: '생산부 전기안전 정기점검이 44일 경과했습니다.', priority: 'high', is_read: false, due_date: '2026-02-20', created_at: '2026-04-05T09:00:00' },
  { id: 3, source_module: 'document', title: '환경부 배출허용기준 통보 미처리', message: '환경부 공문이 접수 후 아직 처리되지 않았습니다. 4월 15일까지 회신 필요.', priority: 'high', is_read: false, due_date: '2026-04-15', created_at: '2026-04-04T10:00:00' },
  { id: 4, source_module: 'hr', title: '박민준 대리 계약 만료 D-5', message: '생산부 박민준 대리의 계약이 5일 후 만료됩니다. 갱신 여부를 결정해주세요.', priority: 'high', is_read: false, due_date: '2026-04-10', created_at: '2026-04-05T08:00:00' },
  { id: 5, source_module: 'project', title: '생산라인 효율화 프로젝트 지연', message: '생산라인 효율화 프로젝트가 35일 지연 중입니다. 진척률 30%.', priority: 'medium', is_read: true, due_date: '2026-03-01', created_at: '2026-04-03T14:00:00' },
  { id: 6, source_module: 'education', title: '소방 안전교육 D-15', message: '4월 20일 소방 안전교육이 예정되어 있습니다. 대상: 생산부.', priority: 'medium', is_read: true, due_date: '2026-04-20', created_at: '2026-04-05T07:00:00' },
  { id: 7, source_module: 'schedule', title: '정기 설비 보전 점검 D-10', message: '4월 15일 정기 설비 보전 점검이 예정되어 있습니다.', priority: 'low', is_read: true, due_date: '2026-04-15', created_at: '2026-04-05T07:00:00' },
  { id: 8, source_module: 'hr', title: '이영희 과장 건강검진 D-25', message: '4월 30일까지 건강검진을 완료해주세요.', priority: 'low', is_read: true, due_date: '2026-04-30', created_at: '2026-04-05T07:00:00' },
]

export default async function NotificationsPage() {
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  const isSample = currentUser?.is_sample ?? false

  let notifications: any[]

  if (isSample) {
    notifications = SAMPLE_NOTIFICATIONS
  } else {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    notifications = data ?? []
  }

  return <NotificationClient notifications={notifications} isSample={isSample} />
}
