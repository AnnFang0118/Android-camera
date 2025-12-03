# Vercel 部署指南

## 方法一：通过 Vercel 网站（推荐）

1. **将代码推送到 Git 仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <你的仓库URL>
   git push -u origin main
   ```

2. **登录 Vercel**
   - 访问 https://vercel.com
   - 使用 GitHub/GitLab/Bitbucket 账号登录

3. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择你的仓库
   - Vercel 会自动检测为 Vite 项目

4. **部署**
   - 点击 "Deploy" 按钮
   - 等待构建完成

## 方法二：通过 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   cd "Andriod Camera"
   vercel
   ```

4. **生产环境部署**
   ```bash
   vercel --prod
   ```

## 注意事项

⚠️ **重要：相机功能需要 HTTPS**
- Vercel 自动提供 HTTPS，所以没问题
- 本地开发时，相机 API 只能在 HTTPS 或 localhost 上工作

📱 **移动设备访问**
- 确保在移动设备上测试相机功能
- 某些浏览器可能需要用户手动授权相机权限

## 环境变量

本项目目前不需要环境变量配置。

## 构建输出

- 构建命令：`npm run build`
- 输出目录：`dist`
- 已配置 SPA 路由重写（所有路由指向 index.html）

