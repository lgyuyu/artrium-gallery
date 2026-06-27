import { db } from '@/lib/db'
import { AdminClient } from '@/components/admin/admin-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '管理后台 · 艺境美术 ARTRIUM',
  description: '艺境美术 ARTRIUM 管理后台',
}

export default async function AdminPage() {
  const org = await db.organization.findFirst()
  const orgName = org?.name ?? '艺境美术 ARTRIUM'
  const orgLogo = org?.logo ?? '/logo-artium.png'

  return <AdminClient orgName={orgName} orgLogo={orgLogo} />
}
