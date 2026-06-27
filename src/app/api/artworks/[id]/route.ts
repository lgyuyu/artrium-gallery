import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin'
import { unlink } from 'fs/promises'
import path from 'path'

// 更新画作信息（需口令）
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
  const { title, artworkDate, description, order } = body

  const existing = await db.artwork.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: '画作不存在' }, { status: 404 })
  }

  const updated = await db.artwork.update({
    where: { id },
    data: {
      ...(title !== undefined && typeof title === 'string' && title.trim() && { title: title.trim() }),
      ...(artworkDate !== undefined && { artworkDate: artworkDate?.trim() || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(order !== undefined && typeof order === 'number' && { order }),
    },
  })

  return NextResponse.json(updated)
}

// 删除画作（需口令）- 同时删除上传的文件（仅删除 /uploads/ 下的，预设画作图保留）
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id } = await params
  const existing = await db.artwork.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: '画作不存在' }, { status: 404 })
  }

  // 删除数据库记录
  await db.artwork.delete({ where: { id } })

  // 删除文件（处理 /uploads/ 和 /api/uploads/ 两种路径）
  const fileUrl = existing.imageUrl
  let fileName: string | null = null
  if (fileUrl.startsWith('/uploads/')) {
    fileName = fileUrl.replace('/uploads/', '')
  } else if (fileUrl.startsWith('/api/uploads/')) {
    fileName = fileUrl.replace('/api/uploads/', '')
  }
  if (fileName) {
    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName)
    try {
      await unlink(filePath)
    } catch {
      // 文件不存在则忽略
    }
  }

  return NextResponse.json({ success: true })
}
