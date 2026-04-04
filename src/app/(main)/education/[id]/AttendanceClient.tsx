'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Circle, Loader2, UserPlus, X, Users } from 'lucide-react'

interface User { id: number; name: string; position: string; department_id: number; departments?: any }

interface Props {
  educationId: number
  educationStatus: string
  targetUsers: User[]
  attendanceMap: Record<number, any>
  allUsers: User[]
}

export default function AttendanceClient({
  educationId, educationStatus, targetUsers, attendanceMap: initMap, allUsers
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [attMap, setAttMap] = useState<Record<number, any>>(initMap)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // 추가 참석자 (대상 외)
  const [showAdd, setShowAdd] = useState(false)
  const [addUserId, setAddUserId] = useState<number>(allUsers[0]?.id ?? 0)
  const [adding, setAdding] = useState(false)
  const [extraUsers, setExtraUsers] = useState<User[]>([])

  const allDisplayUsers = [
    ...targetUsers,
    ...extraUsers.filter(u => !targetUsers.find(t => t.id === u.id)),
  ]

  async function toggleAttendance(userId: number) {
    setTogglingId(userId)
    const supabase = createClient()
    const existing = attMap[userId]

    if (existing) {
      // 이미 있으면 toggle attended
      const next = !existing.attended
      const { error } = await supabase
        .from('education_attendances')
        .update({ attended: next })
        .eq('id', existing.id)
      if (!error) setAttMap(prev => ({ ...prev, [userId]: { ...existing, attended: next } }))
    } else {
      // 신규 등록
      const { data, error } = await supabase
        .from('education_attendances')
        .insert([{ education_id: educationId, user_id: userId, attended: true }])
        .select('*, users(name, position, departments(name))')
        .single()
      if (!error && data) setAttMap(prev => ({ ...prev, [userId]: data }))
    }
    setTogglingId(null)
  }

  async function addExtraUser() {
    if (!addUserId) return
    const user = allUsers.find(u => u.id === addUserId)
    if (!user || allDisplayUsers.find(u => u.id === user.id)) return
    setAdding(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('education_attendances')
      .insert([{ education_id: educationId, user_id: user.id, attended: false }])
      .select()
      .single()
    setAdding(false)
    if (error) { alert('추가 실패: ' + error.message); return }
    setExtraUsers(prev => [...prev, user])
    setAttMap(prev => ({ ...prev, [user.id]: data }))
    setShowAdd(false)
  }

  const attendedCount = Object.values(attMap).filter(a => a?.attended).length
  const totalCount = allDisplayUsers.length

  // 부서별 그룹핑
  const byDept: Record<string, User[]> = {}
  allDisplayUsers.forEach(u => {
    const deptName = Array.isArray(u.departments) ? u.departments[0]?.name : u.departments?.name ?? '미분류'
    if (!byDept[deptName]) byDept[deptName] = []
    byDept[deptName].push(u)
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-sm text-gray-800 flex items-center gap-2">
          <Users size={14} className="text-teal-500" />
          참석자 관리
          {totalCount > 0 && (
            <span className="text-xs text-gray-400 font-normal">
              {attendedCount}/{totalCount}명 참석
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#1A2744] border border-[#1A2744] px-3 py-1.5 rounded-lg hover:bg-[#1A2744] hover:text-white transition-colors"
        >
          <UserPlus size={12} /> 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showAdd && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
          <select
            value={addUserId}
            onChange={e => setAddUserId(Number(e.target.value))}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none bg-white"
          >
            {allUsers
              .filter(u => !allDisplayUsers.find(d => d.id === u.id))
              .map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({Array.isArray(u.departments) ? u.departments[0]?.name : u.departments?.name})
                </option>
              ))
            }
          </select>
          <button onClick={addExtraUser} disabled={adding}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            {adding ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
            추가
          </button>
          <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
      )}

      {/* 참석자 목록 — 부서별 그룹 */}
      {allDisplayUsers.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 text-sm">대상 참석자가 없습니다</p>
          <button onClick={() => setShowAdd(true)} className="mt-2 text-xs text-blue-500 hover:underline">
            + 참석자 직접 추가
          </button>
        </div>
      ) : (
        <div>
          {Object.entries(byDept).map(([deptName, users]) => (
            <div key={deptName}>
              <div className="px-5 py-2 bg-gray-50 border-y border-gray-100">
                <span className="text-xs font-bold text-gray-500">{deptName}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {users.map(user => {
                  const att = attMap[user.id]
                  const attended = att?.attended ?? false
                  return (
                    <div key={user.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${attended ? 'bg-green-50/30' : ''}`}>
                      {/* 참석 토글 */}
                      <button
                        onClick={() => toggleAttendance(user.id)}
                        disabled={togglingId === user.id || educationStatus === '취소'}
                        className="flex-shrink-0 transition-colors disabled:opacity-40"
                      >
                        {togglingId === user.id
                          ? <Loader2 size={22} className="animate-spin text-gray-400" />
                          : attended
                            ? <CheckCircle2 size={22} className="text-green-500" />
                            : <Circle size={22} className="text-gray-300 hover:text-green-400" />
                        }
                      </button>

                      {/* 아바타 */}
                      <div className={`w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 ${attended ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {user.name[0]}
                      </div>

                      {/* 이름 */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${attended ? 'text-green-700' : 'text-gray-700'}`}>
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-400">{user.position}</p>
                      </div>

                      {/* 상태 */}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        attended ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {attended ? '참석' : '미확인'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* 전체 일괄 처리 */}
          {educationStatus !== '취소' && totalCount > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 flex gap-3">
              <button
                onClick={async () => {
                  const supabase = createClient()
                  for (const u of allDisplayUsers) {
                    const att = attMap[u.id]
                    if (att) {
                      await supabase.from('education_attendances').update({ attended: true }).eq('id', att.id)
                    } else {
                      await supabase.from('education_attendances').insert([{ education_id: educationId, user_id: u.id, attended: true }])
                    }
                  }
                  startTransition(() => router.refresh())
                }}
                className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors font-semibold"
              >
                전원 참석 처리
              </button>
              <button
                onClick={async () => {
                  const supabase = createClient()
                  for (const u of allDisplayUsers) {
                    const att = attMap[u.id]
                    if (att) await supabase.from('education_attendances').update({ attended: false }).eq('id', att.id)
                  }
                  startTransition(() => router.refresh())
                }}
                className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
              >
                전체 초기화
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
