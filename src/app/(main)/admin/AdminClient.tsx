'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Loader2, UserCheck, UserX, Shield, ChevronDown, KeyRound
} from 'lucide-react'

const ROLES = ['employee', 'manager', 'admin'] as const
const ROLE_LABEL: Record<string, string> = { admin: '관리자', manager: '매니저', employee: '직원' }
const ROLE_COLOR: Record<string, string> = {
  admin:    'bg-red-100 text-red-700',
  manager:  'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-600',
}

export default function AdminClient({
  users: initUsers,
}: {
  users: any[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [users, setUsers] = useState<any[]>(initUsers)

  // 등록 모달
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '0000', position: '',
    role: 'employee' as typeof ROLES[number],
    joined_at: new Date().toISOString().split('T')[0],
  })

  // 역할 변경 드롭다운
  const [editingRole, setEditingRole] = useState<number | null>(null)

  // 비밀번호 재설정
  const [resetId,  setResetId]  = useState<number | null>(null)
  const [newPw,    setNewPw]    = useState('')
  const [resetting, setResetting] = useState(false)

  function f(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function createUser() {
    if (!form.name || !form.password) {
      alert('이름과 비밀번호는 필수입니다.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) { alert('생성 실패: ' + json.error); setSaving(false); return }

    setUsers(prev => [...prev, json.user])
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', phone: '', email: '', password: '0000', position: '', role: 'employee', joined_at: new Date().toISOString().split('T')[0] })
    startTransition(() => router.refresh())
  }

  async function updateRole(userId: number, role: string) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) { alert('역할 변경 실패'); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    setEditingRole(null)
  }

  async function toggleActive(userId: number, current: boolean) {
    if (!confirm(current ? '계정을 비활성화하시겠습니까?' : '계정을 활성화하시겠습니까?')) return
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (!res.ok) { alert('변경 실패'); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u))
  }

  async function resetPassword(userId: number) {
    if (!newPw || newPw.length < 4) { alert('비밀번호는 최소 4자 이상입니다.'); return }
    setResetting(true)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPw }),
    })
    setResetting(false)
    if (!res.ok) { alert('비밀번호 재설정 실패'); return }
    setResetId(null)
    setNewPw('')
    alert('비밀번호가 변경되었습니다.')
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div>
      {/* 등록 버튼 */}
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243560] transition-colors">
          <Plus size={14} /> 사용자 추가
        </button>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">이름 / 직책</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">연락처</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">이메일</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">역할</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">상태</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.position}</p>
                </td>
                <td className="px-4 py-3.5 text-gray-600 text-xs">{u.phone ?? '-'}</td>
                <td className="px-4 py-3.5 text-gray-600 text-xs">{u.email ?? '-'}</td>
                <td className="px-4 py-3.5 text-center">
                  {editingRole === u.id ? (
                    <div className="flex items-center gap-1 justify-center">
                      <select defaultValue={u.role}
                        onChange={e => updateRole(u.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400">
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                      <button onClick={() => setEditingRole(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingRole(u.id)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${ROLE_COLOR[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                      <ChevronDown size={10} />
                    </button>
                  )}
                </td>
                <td className="px-4 py-3.5 text-center">
                  <button onClick={() => toggleActive(u.id, u.is_active)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {u.is_active ? <UserCheck size={11} /> : <UserX size={11} />}
                    {u.is_active ? '활성' : '비활성'}
                  </button>
                </td>
                <td className="px-4 py-3.5">
                  {resetId === u.id ? (
                    <div className="flex items-center gap-1">
                      <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                        placeholder="새 비밀번호 (4자+)" autoFocus
                        className="text-xs border border-gray-200 rounded px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <button onClick={() => resetPassword(u.id)} disabled={resetting}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                        {resetting ? '...' : '변경'}
                      </button>
                      <button onClick={() => { setResetId(null); setNewPw('') }} className="text-gray-400"><X size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setResetId(u.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                      <KeyRound size={12} /> 비밀번호
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">등록된 사용자가 없습니다</div>
        )}
      </div>

      {/* 사용자 등록 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">사용자 추가</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">이름 *</label>
                  <input value={form.name} onChange={e => f('name', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">직책</label>
                  <input value={form.position} onChange={e => f('position', e.target.value)} placeholder="예: 과장" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">연락처</label>
                <input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="010-0000-0000" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">이메일</label>
                <input type="email" value={form.email} onChange={e => f('email', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">초기 비밀번호 * (4자 이상)</label>
                <input type="password" value={form.password} onChange={e => f('password', e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">역할 *</label>
                  <select value={form.role} onChange={e => f('role', e.target.value)} className={inputCls}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">입사일</label>
                  <input type="date" value={form.joined_at} onChange={e => f('joined_at', e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100">
              <button onClick={createUser} disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-[#1A2744] text-white font-semibold py-2.5 rounded-xl hover:bg-[#243560] transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                {saving ? '생성 중...' : '계정 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
