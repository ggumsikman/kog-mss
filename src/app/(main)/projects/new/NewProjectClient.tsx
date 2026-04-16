'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewProjectClient({
  userId,
  departmentId,
}: {
  userId: number
  departmentId: number | null
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: '기타',
    due_date: '',
    description: '',
    progress_pct: 0,
  })

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('projects').insert([{
      ...form,
      owner_id: userId,
      department_id: departmentId,
      start_date: new Date().toISOString().split('T')[0],
      status: '진행중',
    }])
    setLoading(false)
    if (!error) router.push('/projects')
    else alert('등록 실패: ' + error.message)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-black text-gray-900 mb-6">프로젝트 등록</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">프로젝트명 *</label>
          <input
            required
            value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="프로젝트명을 입력하세요"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">구분</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['VSM', '영업', '품질', '기타'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">마감일 *</label>
            <input
              required
              type="date"
              value={form.due_date}
              onChange={e => set('due_date', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">초기 진행률: {form.progress_pct}%</label>
          <input
            type="range" min={0} max={100} step={5}
            value={form.progress_pct}
            onChange={e => set('progress_pct', Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">설명</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="프로젝트 개요를 입력하세요"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#1A2744] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#243560] transition-colors disabled:opacity-50"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
