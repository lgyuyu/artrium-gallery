import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin'
import { backupDB } from '@/lib/db-persist'

// 批量更新画作顺序（需口令）
// body: { items: [{ id, order }] }
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const body = await req.json()
  const items: Array<{ id: string; order: number }> = body.items

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 })
  }

  // 并行更新
  await Promise.all(
    items.map((item) =>
      db.artwork.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    )
  )

  backupDB()
  return NextResponse.json({ success: true })
}
