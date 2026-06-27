import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 动态返回数据库中的图片二进制
// 图片存数据库，彻底避免发布丢失问题
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const upload = await db.upload.findUnique({ where: { id } })
  if (!upload) {
    return NextResponse.json({ error: '图片不存在' }, { status: 404 })
  }

  return new NextResponse(upload.data, {
    headers: {
      'Content-Type': upload.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
