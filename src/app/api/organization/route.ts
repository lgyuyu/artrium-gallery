import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin'
import { backupDB } from '@/lib/db-persist'

// 获取机构信息（公开）
export async function GET() {
  const org = await db.organization.findFirst({
    select: {
      id: true,
      name: true,
      slogan: true,
      logo: true,
      defaultStyle: true,
    },
  })
  if (!org) {
    return NextResponse.json({ error: '机构未初始化' }, { status: 404 })
  }
  return NextResponse.json(org)
}

// 更新机构信息（需口令）
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const body = await req.json()
  const { name, slogan, logo, defaultStyle, adminPassword } = body

  const org = await db.organization.findFirst()
  if (!org) {
    return NextResponse.json({ error: '机构未初始化' }, { status: 404 })
  }

  const updated = await db.organization.update({
    where: { id: org.id },
    data: {
      ...(name !== undefined && { name }),
      ...(slogan !== undefined && { slogan }),
      ...(logo !== undefined && { logo }),
      ...(defaultStyle !== undefined && { defaultStyle }),
      ...(adminPassword !== undefined && adminPassword.length > 0 && { adminPassword }),
    },
    select: {
      id: true,
      name: true,
      slogan: true,
      logo: true,
      defaultStyle: true,
    },
  })

  backupDB()
  return NextResponse.json(updated)
}
