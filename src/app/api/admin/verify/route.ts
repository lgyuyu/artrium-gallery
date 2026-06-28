import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 验证管理员口令
// body: { password: string }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const password = body.password

  if (!password) {
    return NextResponse.json({ error: '请输入口令' }, { status: 400 })
  }

  const org = await db.organization.findFirst()
  if (!org) {
    return NextResponse.json({ error: '系统未初始化' }, { status: 500 })
  }

  if (password !== org.adminPassword) {
    return NextResponse.json({ error: '口令错误' }, { status: 401 })
  }

  return NextResponse.json({ success: true, password })
}
