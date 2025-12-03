# GitHub 推送指南

## 情况一：项目已经有 Git 仓库（你的情况）

### 1. 添加新文件并提交
```bash
cd "Andriod Camera"
git add .
git commit -m "添加 Vercel 部署配置"
```

### 2. 推送到 GitHub
```bash
git push origin main
```

---

## 情况二：全新项目，还没有 Git 仓库

### 1. 在 GitHub 上创建新仓库
- 访问 https://github.com
- 点击右上角 "+" → "New repository"
- 输入仓库名称（例如：`android-camera-app`）
- 选择 Public 或 Private
- **不要**勾选 "Initialize this repository with a README"
- 点击 "Create repository"

### 2. 初始化本地 Git 仓库
```bash
cd "Andriod Camera"
git init
```

### 3. 添加所有文件
```bash
git add .
```

### 4. 提交代码
```bash
git commit -m "Initial commit: Android Camera App"
```

### 5. 连接远程仓库
```bash
# 将 <你的用户名> 和 <仓库名> 替换为实际值
git remote add origin https://github.com/<你的用户名>/<仓库名>.git

# 例如：
# git remote add origin https://github.com/annfa/android-camera-app.git
```

### 6. 推送到 GitHub
```bash
git branch -M main
git push -u origin main
```

---

## 常用 Git 命令

### 查看状态
```bash
git status
```

### 查看远程仓库
```bash
git remote -v
```

### 如果遇到冲突
```bash
# 先拉取远程更改
git pull origin main

# 解决冲突后再次推送
git add .
git commit -m "解决冲突"
git push origin main
```

### 如果忘记密码
- 使用 Personal Access Token 代替密码
- 在 GitHub Settings → Developer settings → Personal access tokens 创建

---

## 快速操作（你的情况）

由于你的项目已经有 Git 仓库，只需要：

```bash
cd "Andriod Camera"
git add .
git commit -m "添加 Vercel 部署配置"
git push origin main
```

