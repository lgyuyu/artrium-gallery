import { db } from '@/lib/db'
import { AdminClient } from '@/components/admin/admin-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '管理后台 · 星玥艺术',
  description: '星玥艺术 管理后台',
}

export default async function AdminPage() {
  const org = await db.organization.findFirst()
  const orgName = org?.name ?? '星玥艺术'
  const orgLogo = org?.logo ?? '/logo-xingyue.png'

  return <AdminClient orgName={orgName} orgLogo={orgLogo} />
}
