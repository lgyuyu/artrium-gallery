import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { GalleryClient } from '@/components/gallery/gallery-client'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

// 动态生成分享 meta
export async function generateMetadata({
  params,
}: {
  params: Promise<{ studentId: string }>
}): Promise<Metadata> {
  const { studentId } = await params
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      artworks: { orderBy: { order: 'asc' }, take: 1, select: { imageUrl: true } },
    },
  })
  if (!student) {
    return { title: '展厅不存在 · 艺境美术' }
  }
  const org = await db.organization.findFirst()
  const orgName = org?.name ?? '艺境美术 ARTRIUM'
  const coverImage = student.artworks[0]?.imageUrl

  return {
    title: `${student.name}的线上画展 · ${orgName}`,
    description: `${orgName} · 学生作品展示 — 360° VR 沉浸式线上展厅`,
    openGraph: {
      title: `${student.name}的线上画展`,
      description: `${orgName} · 学生作品展示`,
      images: coverImage ? [{ url: coverImage, width: 864, height: 1152 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${student.name}的线上画展`,
      description: `${orgName} · 学生作品展示`,
      images: coverImage ? [coverImage] : [],
    },
  }
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const [student, org] = await Promise.all([
    db.student.findUnique({
      where: { id: studentId },
      include: {
        artworks: { orderBy: { order: 'asc' } },
      },
    }),
    db.organization.findFirst(),
  ])

  if (!student) {
    notFound()
  }

  const artworks = student.artworks.map((a) => ({
    id: a.id,
    title: a.title,
    imageUrl: a.imageUrl,
    artworkDate: a.artworkDate,
    description: a.description,
    order: a.order,
  }))

  return (
    <GalleryClient
      student={{
        id: student.id,
        name: student.name,
        age: student.age,
        bio: student.bio,
        style: student.style,
      }}
      artworks={artworks}
      orgName={org?.name ?? '艺境美术 ARTRIUM'}
      orgLogo={org?.logo ?? '/logo-artium.png'}
    />
  )
}
