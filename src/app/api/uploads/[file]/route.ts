import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// 动态返回上传的图片文件
// 这样无论部署环境如何（standalone/preview），都能通过 API 读取上传的图片
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params

  // 安全：防止路径遍历
  if (file.includes('..') || file.includes('/')) {
    return NextResponse.json({ error: '非法文件名' }, { status: 400 })
  }

  // 可能的存储位置：public/uploads 或 项目根 uploads
  const candidates = [
    path.join(process.cwd(), 'public', 'uploads', file),
    path.join(process.cwd(), 'uploads', file),
  ]

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      try {
        const buffer = await readFile(filePath)
        // 根据扩展名设置 Content-Type
        const ext = file.split('.').pop()?.toLowerCase() || 'jpg'
        const mimeMap: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          webp: 'image/webp',
          gif: 'image/gif',
        }
        const contentType = mimeMap[ext] || 'image/jpeg'
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      } catch {
        // 读失败，尝试下一个
      }
    }
  }

  return NextResponse.json({ error: '文件不存在' }, { status: 404 })
}
