import { db } from '@/lib/db'
import { AdminClient } from '@/components/admin/admin-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '管理后台 · 星玥艺术',
  description: '星玥艺术 管理后台',
}

export default async function AdminPage() {
  // 容错：数据库查询失败时用默认值，避免页面 500
  let orgName = '星玥艺术'
  let orgLogo = '/logo-xingyue.png'
  try {
    const org = await db.organization.findFirst()
    if (org) {
      orgName = org.name
      orgLogo = org.logo ?? orgLogo
    }
  } catch (e) {
    console.error('[admin] 读取机构信息失败:', e)
  }

  return <AdminClient orgName={orgName} orgLogo={orgLogo} />
}
