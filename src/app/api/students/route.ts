import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin'

// 获取所有学生（公开）
export async function GET() {
  try {
    const students = await db.student.findMany({
      orderBy: { order: 'asc' },
      include: {
        artworks: {
          orderBy: { order: 'asc' },
          select: { id: true, imageUrl: true, title: true },
        },
      },
    })

    const result = students.map((s: any) => ({
      id: s.id,
      name: s.name,
      age: s.age,
      bio: s.bio,
      style: s.style,
      order: s.order,
      coverImage: s.artworks?.[0]?.imageUrl ?? null,
      artworkCount: s.artworks?.length ?? 0,
    }))

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// 创建学生（需口令）
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const body = await req.json()
    const { name, age, bio, style } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '学生姓名不能为空' }, { status: 400 })
    }

    // 取当前最大 order（用 aggregate）
    let nextOrder = 0
    try {
      const agg = await db.student.aggregate({ _max: { order: true } })
      nextOrder = ((agg?._max?.order as number) ?? -1) + 1
    } catch {
      const all = await db.student.findMany()
      nextOrder = all.length
    }

    const student = await db.student.create({
      data: {
        name: name.trim(),
        age: age?.trim() || null,
        bio: bio?.trim() || null,
        style: style === 'cozy' ? 'cozy' : 'modern',
        order: nextOrder,
      },
    })

    return NextResponse.json(student, { status: 201 })
  } catch (e: any) {
    console.error('[student] create error:', e)
    return NextResponse.json({ error: e.message || '创建学生失败' }, { status: 500 })
  }
}
