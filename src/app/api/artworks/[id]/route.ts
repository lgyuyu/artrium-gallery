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

// 删除画作（需口令）- 同步删除数据库中的图片数据或文件系统中的旧文件
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

  // 删除图片数据（支持三种路径格式）
  const fileUrl = existing.imageUrl
  // 1. 数据库存储：/api/image/[uploadId]
  if (fileUrl.startsWith('/api/image/')) {
    const uploadId = fileUrl.replace('/api/image/', '')
    try {
      await db.upload.delete({ where: { id: uploadId } })
    } catch {
      // upload 记录不存在则忽略
    }
  }
  // 2. 旧文件系统：/api/uploads/[file] 或 /uploads/[file]
  else if (fileUrl.startsWith('/api/uploads/') || fileUrl.startsWith('/uploads/')) {
    const fileName = fileUrl.replace(/^\/(api\/)?uploads\//, '')
    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName)
    try {
      await unlink(filePath)
    } catch {
      // 文件不存在则忽略
    }
  }
  // 3. 预设画作 /artworks/xxx 不删除

  return NextResponse.json({ success: true })
}
