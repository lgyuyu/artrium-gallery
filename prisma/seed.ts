// VR线上画展 - 数据库初始化脚本
// 用法: bun run prisma/seed.ts
// 安全初始化：只在数据库为空时才写入示例数据，不会覆盖已有数据
import { db } from '../src/lib/db'

async function main() {
  // 检查是否已有数据，有则跳过初始化（防止覆盖用户上传的作品）
  const existingStudents = await db.student.count()
  const existingOrg = await db.organization.count()
  if (existingStudents > 0 || existingOrg > 0) {
    console.log(`[seed] 检测到已有数据(学生${existingStudents}位/机构${existingOrg}个)，跳过初始化，保留现有数据`)
    return
  }

  console.log('[seed] 数据库为空，开始初始化示例数据...')

  // 1. 机构信息
  const org = await db.organization.create({
    data: {
      name: '星玥艺术',
      slogan: '让每个孩子都拥有属于自己的画展',
      logo: '/logo-xingyue.png',
      defaultStyle: 'modern',
      adminPassword: 'art2025',
    },
  })
  console.log('✅ 机构已创建:', org.name)

  // 2. 学生（4位示例）
  const students = await Promise.all([
    db.student.create({
      data: {
        name: '小明',
        age: '8岁 · 少儿启蒙班',
        bio: '小明，8岁，学习画画2年，喜欢用画笔记录大自然的色彩，对光影特别敏感。',
        style: 'modern',
        order: 0,
      },
    }),
    db.student.create({
      data: {
        name: '小红',
        age: '9岁 · 创意美术班',
        bio: '小红，9岁，性格开朗，最爱用鲜艳的色彩描绘身边的世界，是个小太阳。',
        style: 'modern',
        order: 1,
      },
    }),
    db.student.create({
      data: {
        name: '小华',
        age: '7岁 · 启蒙班',
        bio: '小华，7岁，班里最小的学员，想象力天马行空，每一笔都是惊喜。',
        style: 'cozy',
        order: 2,
      },
    }),
    db.student.create({
      data: {
        name: '小丽',
        age: '10岁 · 进阶班',
        bio: '小丽，10岁，学画4年，专注力极强，擅长精细刻画，未来可期。',
        style: 'cozy',
        order: 3,
      },
    }),
  ])
  console.log('✅ 已创建', students.length, '位学生')

  // 3. 画作（8幅，前两位学生各4幅以展示上下双排布局）
  const artworks = [
    // 小明 - 风景系 (modern) 4幅
    {
      studentIdx: 0,
      title: '夕阳下的远山',
      imageUrl: '/artworks/art-1.jpg',
      artworkDate: '2025年5月',
      description: '用湿润的水彩晕染出夕阳的暖意，远山的轮廓若隐若现。',
      order: 0,
    },
    {
      studentIdx: 0,
      title: '星空小镇',
      imageUrl: '/artworks/art-6.jpg',
      artworkDate: '2025年6月',
      description: '向梵高致敬的星空，小镇在璀璨星辰下安然入梦。',
      order: 1,
    },
    {
      studentIdx: 0,
      title: '快乐的我',
      imageUrl: '/artworks/art-2.jpg',
      artworkDate: '2025年3月',
      description: '画一个最开心的自己，蜡笔的笔触藏不住满心的欢喜。',
      order: 2,
    },
    {
      studentIdx: 0,
      title: '墨竹',
      imageUrl: '/artworks/art-5.jpg',
      artworkDate: '2025年5月',
      description: '第一次学习传统水墨，竹节的顿挫间有模有样。',
      order: 3,
    },
    // 小丽 - 静物系 (cozy) 4幅
    {
      studentIdx: 3,
      title: '桌上的静物',
      imageUrl: '/artworks/art-4.jpg',
      artworkDate: '2025年4月',
      description: '第一次尝试素描静物，光影的过渡已经很细腻。',
      order: 0,
    },
    {
      studentIdx: 3,
      title: '春天的花园',
      imageUrl: '/artworks/art-7.jpg',
      artworkDate: '2025年2月',
      description: '用手指点出满园春色，纯真的指尖开出了花。',
      order: 1,
    },
    {
      studentIdx: 3,
      title: '我的小猫',
      imageUrl: '/artworks/art-3.jpg',
      artworkDate: '2025年6月',
      description: '家里的小猫总爱在窗边晒太阳，彩铅细细描出它的柔软。',
      order: 2,
    },
    {
      studentIdx: 3,
      title: '我的城市',
      imageUrl: '/artworks/art-8.jpg',
      artworkDate: '2025年5月',
      description: '拼贴出心中的未来城市，高楼与花园共存。',
      order: 3,
    },
  ]

  for (const a of artworks) {
    await db.artwork.create({
      data: {
        title: a.title,
        imageUrl: a.imageUrl,
        artworkDate: a.artworkDate,
        description: a.description,
        order: a.order,
        studentId: students[a.studentIdx].id,
      },
    })
  }
  console.log('✅ 已创建', artworks.length, '幅画作')

  console.log('\n🎉 数据库初始化完成！')
  console.log('   机构:', org.name)
  console.log('   学生数:', students.length)
  console.log('   画作数:', artworks.length)
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
