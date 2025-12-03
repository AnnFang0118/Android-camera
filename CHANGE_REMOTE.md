# 更改远程仓库地址

## 如果你要使用自己的 GitHub 仓库

### 1. 移除旧的远程仓库
```bash
git remote remove origin
```

### 2. 添加新的远程仓库
```bash
# 将 <你的用户名> 和 <仓库名> 替换为实际值
git remote add origin https://github.com/<你的用户名>/<仓库名>.git

# 例如：
# git remote add origin https://github.com/AnnFang0118/android-camera-app.git
```

### 3. 推送到新仓库
```bash
git push -u origin main
```

## 如果使用 SSH（推荐，更安全）

### 1. 生成 SSH 密钥（如果还没有）
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

### 2. 将公钥添加到 GitHub
- 复制 `~/.ssh/id_ed25519.pub` 的内容
- 在 GitHub Settings → SSH and GPG keys → New SSH key 添加

### 3. 使用 SSH URL
```bash
git remote set-url origin git@github.com:<你的用户名>/<仓库名>.git
git push -u origin main
```

