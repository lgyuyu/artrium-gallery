import { db } from '@/lib/db'
import { StudentCard } from '@/components/home/student-card'
import Link from 'next/link'
import { Settings, ChevronDown, Frame } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [org, students] = await Promise.all([
    db.organization.findFirst(),
    db.student.findMany({
      orderBy: { order: 'asc' },
      include: {
        artworks: {
          orderBy: { order: 'asc' },
          select: { imageUrl: true },
        },
      },
    }),
  ])

  const studentList = students.map((s) => ({
    id: s.id,
    name: s.name,
    age: s.age,
    bio: s.bio,
    coverImage: s.artworks[0]?.imageUrl ?? null,
    artworkCount: s.artworks.length,
  }))

  const totalArtworks = studentList.reduce((sum, s) => sum + s.artworkCount, 0)
  const orgName = org?.name ?? '艺境美术 ARTRIUM'
  const orgSlogan = org?.slogan ?? '让每个孩子都拥有属于自己的画展'
  const orgLogo = org?.logo ?? '/logo-artium.png'

  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/75 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src={orgLogo} alt={orgName} className="h-9 w-9 rounded object-contain" />
            <div className="leading-tight">
              <p className="font-serif text-lg font-medium tracking-wide">{orgName}</p>
              <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Online Gallery</p>
            </div>
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold transition-colors px-3 py-1.5 rounded-md hover:bg-accent/50"
          >
            <Settings className="h-3.5 w-3.5" />
            管理后台
          </Link>
        </div>
      </header>

      {/* Hero 区 */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/40 via-background to-background" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gold/5 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          {/* 顶部装饰线 */}
          <div className="flex items-center justify-center gap-3 mb-6 animate-fade-in">
            <span className="h-px w-12 bg-gold/60" />
            <Frame className="h-4 w-4 text-gold" />
            <span className="h-px w-12 bg-gold/60" />
          </div>

          <p className="text-xs sm:text-sm tracking-[0.35em] uppercase text-gold font-medium mb-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            ARTRIUM · 艺境美术
          </p>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-medium leading-tight animate-fade-in" style={{ animationDelay: '200ms' }}>
            学生线上画展
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '300ms' }}>
            {orgSlogan}
          </p>

          {/* 数据统计 */}
          <div className="mt-10 flex items-center justify-center gap-8 sm:gap-12 animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="text-center">
              <p className="font-serif text-3xl sm:text-4xl text-foreground">{studentList.length}</p>
              <p className="text-xs text-muted-foreground tracking-wider mt-1">位小艺术家</p>
            </div>
            <span className="h-10 w-px bg-border" />
            <div className="text-center">
              <p className="font-serif text-3xl sm:text-4xl text-foreground">{totalArtworks}</p>
              <p className="text-xs text-muted-foreground tracking-wider mt-1">幅精选作品</p>
            </div>
          </div>

          {/* 滚动提示 */}
          <div className="mt-14 flex flex-col items-center gap-2 text-muted-foreground animate-fade-in" style={{ animationDelay: '500ms' }}>
            <span className="text-xs tracking-widest">向下探索</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </div>
        </div>
      </section>

      {/* 学员展厅网格 */}
      <section className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-end justify-between mb-8 sm:mb-10">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-gold mb-2">Exhibitions</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium">学员展厅</h2>
          </div>
          <p className="hidden sm:block text-sm text-muted-foreground">点击卡片进入 3D 沉浸展厅</p>
        </div>

        {studentList.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Frame className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>暂无展厅，请前往管理后台添加学生</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {studentList.map((s, i) => (
              <StudentCard key={s.id} {...s} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* 页脚 */}
      <footer className="mt-auto border-t border-border/60 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src={orgLogo} alt={orgName} className="h-7 w-7 rounded object-contain" />
              <div className="text-sm">
                <span className="font-serif font-medium">{orgName}</span>
                <span className="text-muted-foreground ml-2">· {orgSlogan}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>© {new Date().getFullYear()} {orgName}</span>
              <Link href="/admin" className="hover:text-gold transition-colors">管理后台</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
