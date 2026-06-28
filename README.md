# 艺境美术 ARTRIUM - VR线上画展

让每个学生都拥有属于自己的 3D 画展。

## 技术栈

- **Next.js 16** + React 19
- **React Three Fiber** - 3D 展厅渲染
- **Prisma 6** + **Turso (libSQL)** - 数据库
- **shadcn/ui** + Tailwind CSS 4
- 部署在 **Vercel**

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 Turso 数据库连接信息

# 3. 初始化数据库
npm run db:push

# 4. 启动开发服务器
npm run dev
```

## 部署到 Vercel

1. 在 [Turso](https://turso.tech) 创建数据库，获取连接 URL 和 Auth Token
2. 在 [Vercel](https://vercel.com) 导入本仓库
3. 配置环境变量：
   - `DATABASE_URL` = `libsql://your-db.turso.io`
   - `DATABASE_AUTH_TOKEN` = `your-auth-token`
4. 部署

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | Turso 数据库 URL | `libsql://your-db.turso.io` |
| `DATABASE_AUTH_TOKEN` | Turso 认证 Token | `eyJhbGciOi...` |
