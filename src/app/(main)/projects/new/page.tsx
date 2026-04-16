import { getCurrentUser } from '@/lib/auth/getUser'
import { redirect } from 'next/navigation'
import NewProjectClient from './NewProjectClient'

export default async function NewProjectPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <NewProjectClient
      userId={user.id}
      departmentId={user.department_id}
    />
  )
}
