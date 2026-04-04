import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate, calcDaysUntil } from '@/lib/utils'
import { ArrowLeft, CalendarDays, MapPin, User, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import AttendanceClient from './AttendanceClient'

export default async function EducationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: edu }, { data: targets }, { data: attendances }, { data: allUsers }] = await Promise.all([
    supabase.from('education_schedules').select('*').eq('id', id).single(),
    supabase.from('education_targets')
      .select('department_id, departments(id, name)')
      .eq('education_id', id),
    supabase.from('education_attendances')
      .select('*, users(name, position, departments(name))')
      .eq('education_id', id),
    supabase.from('users')
      .select('id, name, position, department_id, departments(name)')
      .eq('is_active', true)
      .order('name'),
  ])

  if (!edu) notFound()

  const daysUntil = calcDaysUntil(edu.scheduled_date)
  const isOverdue = edu.scheduled_date < today && edu.status === '예정'
  const targetDeptIds = targets?.map((t: any) => t.department_id) ?? []

  // 대상 부서 직원만 필터
  const targetUsers = allUsers?.filter(u => targetDeptIds.includes(u.department_id)) ?? []

  // 참석자 지도 (user_id → attendance)
  const attendanceMap: Record<number, any> = {}
  attendances?.forEach((a: any) => { attendanceMap[a.user_id] = a })

  const attendedCount = attendances?.filter(a => a.attended).length ?? 0
  const totalTarget   = targetUsers.length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/education" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft size={14} /> 교육 목록
      </Link>

      {/* 헤더 카드 */}
      <div className={`bg-white rounded-xl shadow-sm border p-6 mb-5 ${isOverdue ? 'border-red-200' : 'border-gray-100'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                edu.edu_type === '의무'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'bg-blue-100 text-blue-700 border-blue-200'
              }`}>
                {edu.edu_type}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                {edu.category}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                edu.status === '완료' ? 'bg-green-100 text-green-700' :
                edu.status === '취소' ? 'bg-gray-100 text-gray-500' :
                'bg-blue-100 text-blue-700'
              }`}>
                {edu.status}
              </span>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                  <AlertTriangle size={11} /> 기한 초과
                </span>
              )}
            </div>

            <h1 className="text-xl font-black text-gray-900 mb-3">{edu.title}</h1>

            <div className="flex flex-wrap gap-5 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} /> {formatDate(edu.scheduled_date)}
              </span>
              {edu.duration_hours && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} /> {edu.duration_hours}시간
                </span>
              )}
              {edu.instructor && (
                <span className="flex items-center gap-1.5">
                  <User size={13} /> {edu.instructor}
                </span>
              )}
              {edu.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> {edu.location}
                </span>
              )}
            </div>

            {edu.description && (
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">{edu.description}</p>
            )}

            {/* 대상 부서 */}
            {targets && targets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-xs text-gray-400">대상:</span>
                {targets.map((t: any) => (
                  <span key={t.department_id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {t.departments?.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* D-day + 참석률 */}
          <div className="flex flex-col items-center gap-3">
            {edu.status !== '완료' && edu.status !== '취소' && (
              <div className="text-center">
                <p className={`text-2xl font-black ${daysUntil <= 7 ? 'text-red-600' : daysUntil <= 30 ? 'text-yellow-600' : 'text-gray-700'}`}>
                  {daysUntil < 0 ? `+${Math.abs(daysUntil)}` : `D-${daysUntil}`}
                </p>
                <p className="text-xs text-gray-400">{daysUntil < 0 ? '일 초과' : '일 전'}</p>
              </div>
            )}
            {totalTarget > 0 && (
              <div className="text-center">
                <p className="text-2xl font-black text-green-600">{attendedCount}<span className="text-sm font-normal text-gray-400">/{totalTarget}</span></p>
                <p className="text-xs text-gray-400">참석 완료</p>
              </div>
            )}
          </div>
        </div>

        {/* 참석률 바 */}
        {totalTarget > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>참석률</span>
              <span className="font-bold text-green-600">{Math.round(attendedCount / totalTarget * 100)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.round(attendedCount / totalTarget * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 참석자 관리 */}
      <AttendanceClient
        educationId={Number(id)}
        educationStatus={edu.status}
        targetUsers={targetUsers}
        attendanceMap={attendanceMap}
        allUsers={allUsers ?? []}
      />
    </div>
  )
}
