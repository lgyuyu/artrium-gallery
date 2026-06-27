import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdmin } from '@/lib/admin'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// 上传画作（需口令）- multipart/form-data
// 字段: file (图片), studentId, title, artworkDate?, description?
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const studentId = formData.get('studentId') as string | null
  const title = formData.get('title') as string | null
  const artworkDate = (formData.get('artworkDate') as string | null) || null
  const description = (formData.get('description') as string | null) || null

  if (!file) {
    return NextResponse.json({ error: '缺少图片文件' }, { status: 400 })
  }
  if (!studentId) {
    return NextResponse.json({ error: '缺少学生ID' }, { status: 400 })
  }
  if (!title || !title.trim()) {
    return NextResponse.json({ error: '缺少画作名称' }, { status: 400 })
  }

  // 校验学生存在
  const student = await db.student.findUnique({ where: { id: studentId } })
  if (!student) {
    return NextResponse.json({ error: '学生不存在' }, { status: 404 })
  }

  // 校验文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: '仅支持 JPG/PNG/WEBP/GIF 格式' }, { status: 400 })
  }

  // 校验文件大小 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: '图片大小不能超过 10MB' }, { status: 400 })
  }

  // 生成唯一文件名
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${randomUUID()}.${ext}`
  // 写入 public/uploads（同时通过 /api/uploads/[file] 动态路由提供访问，兼容所有部署环境）
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }
  const filePath = path.join(uploadDir, fileName)

  // 写入文件
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await writeFile(filePath, buffer)

  // 使用动态 API 路由访问，确保所有环境下都能读取
  const imageUrl = `/api/uploads/${fileName}`

  // 取该学生当前最大 order
  const maxOrder = await db.artwork.aggregate({
    where: { studentId },
    _max: { order: true },
  })

  // 创建画作记录
  const artwork = await db.artwork.create({
    data: {
      title: title.trim(),
      imageUrl,
      artworkDate,
      description,
      studentId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  return NextResponse.json(artwork, { status: 201 })
}
