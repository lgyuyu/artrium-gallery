import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin'
import { backupDB } from '@/lib/db-persist'

// 获取所有学生（公开）- 含代表画作（第一幅）和画作数量
export async function GET() {
  const students = await db.student.findMany({
    orderBy: { order: 'asc' },
    include: {
      artworks: {
        orderBy: { order: 'asc' },
        select: { id: true, imageUrl: true, title: true },
      },
    },
  })

  const result = students.map((s) => ({
    id: s.id,
    name: s.name,
    age: s.age,
    bio: s.bio,
    style: s.style,
    order: s.order,
    coverImage: s.artworks[0]?.imageUrl ?? null,
    artworkCount: s.artworks.length,
  }))

  return NextResponse.json(result)
}

// 创建学生（需口令）
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const body = await req.json()
  const { name, age, bio, style } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: '学生姓名不能为空' }, { status: 400 })
  }

  // 取当前最大 order
  const maxOrder = await db.student.aggregate({ _max: { order: true } })

  const student = await db.student.create({
    data: {
      name: name.trim(),
      age: age?.trim() || null,
      bio: bio?.trim() || null,
      style: style === 'cozy' ? 'cozy' : 'modern',
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  backupDB()
  return NextResponse.json(student, { status: 201 })
}
