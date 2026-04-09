'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2, Building2, Users, Pencil, Trash2 } from 'lucide-react'

export default function DepartmentClient({
  departments: initDepts,
  users,
  isSample,
}: {
  departments: any[]
  users: any[]
  isSample: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [departments, setDepartments] = useState(initDepts)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', code: '' })

  function openCreate() {
    setEditId(null)
    setForm({ name: '', code: '' })
    setShowForm(true)
  }

  function openEdit(dept: any) {
    setEditId(dept.id)
    setForm({ name: dept.name, code: dept.code || '' })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('부서명을 입력해주세요.'); return }
    if (isSample) { alert('샘플 모드에서는 수정할 수 없습니다.'); return }

    setSaving(true)
    const supabase = createClient()

    if (editId) {
      await supabase.from('departments').update({ name: form.name, code: form.code }).eq('id', editId)
    } else {
      await supabase.from('departments').insert({ name: form.name, code: form.code })
    }

    setSaving(false)
    setShowForm(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: number) {
    if (isSample) { alert('샘플 모드에서는 삭제할 수 없습니다.'); return }
    const memberCount = users.filter(u => u.department_id === id).length
    if (memberCount > 0) { alert(`소속 직원이 ${memberCount}명 있어 삭제할 수 없습니다.`); return }
    if (!confirm('이 부서를 삭제하시겠습니까?')) return

    const supabase = createClient()
    await supabase.from('departments').delete().eq('id', id)
    startTransition(() => router.refresh())
  }

  return (
    <>
      {/* 추가 버튼 */}
      <div className="flex justify-end mb-4">
        <button onClick={openCreate}
          className="flex items-center gap-1.5 bg-[#1A2744] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#243352] transition-colors">
          <Plus size={16} /> 부서 추가
        </button>
      </div>

      {/* 부서 목록 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {departments.map((dept: any) => (
          <div key={dept.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{dept.name}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                {dept.code && <span>코드: {dept.code}</span>}
                <span className="flex items-center gap-1"><Users size={10} /> {dept.member_count}명</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEdit(dept)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(dept.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">등록된 부서가 없습니다.</div>
      )}

      {/* 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <h3 className="font-bold text-gray-900 mb-4">{editId ? '부서 수정' : '부서 추가'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">부서명 *</label>
                <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="예: 생산부" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">부서 코드</label>
                <input value={form.code} onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="예: PROD" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full bg-[#1A2744] text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-[#243352] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editId ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
