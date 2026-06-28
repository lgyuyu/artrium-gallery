import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 获取机构信息（公开）
export async function GET() {
  try {
    const org = await db.organization.findFirst()
    if (!org) {
      return NextResponse.json({ error: '机构未初始化' }, { status: 404 })
    }
    return NextResponse.json({
      id: org.id,
      name: org.name,
      slogan: org.slogan,
      logo: org.logo,
      defaultStyle: org.defaultStyle,
    })
  } catch (e: any) {
    console.error('[API] organization GET error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// 更新机构信息（需口令）
export async function PATCH(req: NextRequest) {
  const { verifyAdmin } = await import('@/lib/admin')
  const auth = await verifyAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
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
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      slogan: updated.slogan,
      logo: updated.logo,
      defaultStyle: updated.defaultStyle,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
