import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin'
import { backupDB } from '@/lib/db-persist'

// 获取单个学生详情（公开）- 含所有画作
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const student = await db.student.findUnique({
    where: { id },
    include: {
      artworks: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!student) {
    return NextResponse.json({ error: '学生不存在' }, { status: 404 })
  }

  return NextResponse.json(student)
}

// 更新学生（需口令）
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { name, age, bio, style, order } = body

  const existing = await db.student.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: '学生不存在' }, { status: 404 })
  }

  const updated = await db.student.update({
    where: { id },
    data: {
      ...(name !== undefined && typeof name === 'string' && name.trim() && { name: name.trim() }),
      ...(age !== undefined && { age: age?.trim() || null }),
      ...(bio !== undefined && { bio: bio?.trim() || null }),
      ...(style !== undefined && (style === 'cozy' || style === 'modern') && { style }),
      ...(order !== undefined && typeof order === 'number' && { order }),
    },
  })

  backupDB()
  return NextResponse.json(updated)
}

// 删除学生（需口令）- 级联删除画作
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id } = await params
  const existing = await db.student.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: '学生不存在' }, { status: 404 })
  }

  await db.student.delete({ where: { id } })
  backupDB()
  return NextResponse.json({ success: true })
}
