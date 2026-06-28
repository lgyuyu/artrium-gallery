-- ============================================
-- ARTRIUM 数据库初始化
-- 在 Turso 控制台 → 你的数据库 → SQL Console 里粘贴执行
-- ============================================

-- 1. 机构信息表
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '艺境美术 ARTRIUM',
    "slogan" TEXT,
    "logo" TEXT,
    "defaultStyle" TEXT NOT NULL DEFAULT 'modern',
    "adminPassword" TEXT NOT NULL DEFAULT 'art2025',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- 2. 学生表
CREATE TABLE IF NOT EXISTS "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" TEXT,
    "bio" TEXT,
    "style" TEXT NOT NULL DEFAULT 'modern',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- 3. 画作表
CREATE TABLE IF NOT EXISTS "Artwork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "artworkDate" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "studentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Artwork_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE
);

-- 4. 上传文件表
CREATE TABLE IF NOT EXISTS "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" BLOB NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. 索引
CREATE INDEX IF NOT EXISTS "Artwork_studentId_idx" ON "Artwork"("studentId");
