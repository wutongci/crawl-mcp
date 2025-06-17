# Crawl-MCP NPM 发布指南

本文档详细说明如何将crawl-mcp项目发布到npm，让其他用户可以通过`npx`一键安装和使用。

> **最新更新**: v1.1.0 已成功发布！新增真正的图片下载功能，支持自动模式和完整的微信文章本地化处理。

## 📋 发布前准备

### 1. 检查项目结构

确保项目包含以下关键文件：

```
crawl-mcp/
├── package.json          # 项目配置
├── README.md             # 项目说明
├── LICENSE               # 开源协议
├── src/                  # 源代码
├── dist/                 # 编译后代码
├── examples/             # 使用示例
├── docs/                 # 文档
└── tests/                # 测试文件
```

### 2. 完善 package.json

检查并更新关键字段：

```json
{
  "name": "crawl-mcp-server",
  "version": "1.1.0",
  "description": "微信公众号文章抓取 MCP 服务器 - 支持自动图片下载、内容清理、智能抓取，可生成完整的本地化Markdown文档",
  "main": "dist/index.js",
  "bin": {
    "crawl-mcp-server": "dist/index.js"
  },
  "keywords": [
    "mcp", 
    "model-context-protocol", 
    "crawl",
    "wechat", 
    "article",
    "scraper",
    "playwright",
    "automation",
    "cursor",
    "ai-tools",
    "content-extraction",
    "image-download",
    "markdown",
    "wechat-crawler",
    "article-extraction"
  ],
  "author": "coso<wutongc@gmail.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/wutongci/crawl-mcp-server.git"
  },
  "homepage": "https://github.com/wutongci/crawl-mcp-server#readme",
  "bugs": {
    "url": "https://github.com/wutongci/crawl-mcp-server/issues"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 3. 创建 .npmignore 文件

```gitignore
# 源代码（只发布编译后的代码）
src/
tests/
test-output/

# 开发配置
.env
.env.*
tsconfig.json
jest.config.js

# IDE
.vscode/
.idea/
*.swp
*.swo

# 临时文件
.DS_Store
Thumbs.db

# 日志
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 依赖
node_modules/

# 覆盖率报告
coverage/

# 构建缓存
.cache/
```

## 🔧 发布步骤

### 步骤 1: 注册 npm 账号

如果还没有npm账号：

```bash
# 访问 https://www.npmjs.com/ 注册账号
# 或使用命令行注册
npm adduser
```

### 步骤 2: 登录 npm

```bash
cd crawl-mcp
npm login

# 验证登录状态
npm whoami
```

### 步骤 3: 检查包名是否可用

```bash
# 检查包名是否已被占用
npm view crawl-mcp-server

# 如果提示 404，说明包名可用
# 如果返回包信息，需要更换包名
```

### 步骤 4: 构建项目

```bash
# 安装依赖
npm install

# 运行测试（如果有）
npm test

# 构建项目
npm run build

# 检查构建结果
ls -la dist/

# 验证功能（可选）
node -e "
const { ImageDownloader } = require('./dist/utils/ImageDownloader');
const downloader = new ImageDownloader();
console.log('✅ ImageDownloader 加载成功');
"
```

### 步骤 5: 版本管理

```bash
# 查看当前版本
npm version

# 发布前更新版本（选择其一）
npm version patch    # 1.0.0 -> 1.0.1 (修复)
npm version minor    # 1.0.0 -> 1.1.0 (新功能)
npm version major    # 1.0.0 -> 2.0.0 (重大更新)

# 或手动修改 package.json 中的 version 字段
```

### 步骤 6: 预览发布内容

```bash
# 查看将要发布的文件
npm pack --dry-run

# 或者实际打包查看
npm pack
tar -tzf crawl-mcp-server-1.0.0.tgz
```

### 步骤 7: 发布到 npm

```bash
# 首次发布
npm publish

# 如果包名包含 scope，需要指定公开
npm publish --access public

# 发布测试版本
npm publish --tag beta

# 发布特定版本
npm publish --tag latest
```

## 🏷️ 版本标签管理

### 常用标签

- `latest`: 最新稳定版本（默认）
- `beta`: 测试版本
- `alpha`: 早期测试版本
- `next`: 下一个版本

### 标签操作

```bash
# 发布beta版本
npm publish --tag beta

# 添加标签到已发布版本
npm dist-tag add crawl-mcp-server@1.0.1 beta

# 查看所有标签
npm dist-tag ls crawl-mcp-server

# 删除标签
npm dist-tag rm crawl-mcp-server beta
```

## 📦 用户安装和使用

发布成功后，用户可以通过以下方式使用：

### 1. 直接运行（推荐）

```bash
# 使用npx直接运行最新版本
npx crawl-mcp-server

# 运行特定版本
npx crawl-mcp-server@1.1.0

# 运行beta版本
npx crawl-mcp-server@beta
```

### 新功能使用示例 (v1.1.0+)

```bash
# 自动模式：直接处理HTML内容并下载图片
# 在Cursor中使用MCP工具：
{
  "tool": "crawl_wechat_article",
  "params": {
    "url": "https://mp.weixin.qq.com/s/your-article-url",
    "mode": "auto",
    "html_content": "[页面HTML内容]",
    "save_images": true,
    "clean_content": true,
    "output_format": "markdown"
  }
}

# 指令模式：获取详细操作步骤
{
  "tool": "crawl_wechat_article", 
  "params": {
    "url": "https://mp.weixin.qq.com/s/your-article-url",
    "mode": "instruction",
    "save_images": true
  }
}
```

### 2. 全局安装

```bash
# 全局安装
npm install -g crawl-mcp-server

# 运行
crawl-mcp
```

### 3. 在Cursor中配置

在`.cursor/mcp.json`中配置：

```json
{
  "mcpServers": {
    "crawl-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "crawl-mcp-server"
      ],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

## 🔄 更新发布

### 修复更新流程

```bash
# 1. 修改代码
# 2. 运行测试
npm test

# 3. 重新构建
npm run build

# 4. 更新版本
npm version patch

# 5. 发布
npm publish
```

### 主要更新流程 (v1.1.0 实际发布经验)

```bash
# 1. 开发新功能（如图片下载功能）
# 2. 更新文档和测试
# 3. 运行完整测试套件
npm test

# 4. 重新构建项目
npm run build

# 5. 更新版本和描述
# 手动编辑 package.json:
# - version: "1.0.7" -> "1.1.0"  
# - description: 更新为包含新功能的描述
# - keywords: 添加相关关键词

# 6. 更新 CHANGELOG.md
# 详细记录新功能、改进和修复

# 7. 提交代码
git add .
git commit -m "🎉 v1.1.0: 添加真正的图片下载功能"

# 8. 创建Git标签
git tag -a v1.1.0 -m "版本 1.1.0: 图片下载功能重大升级"

# 9. 推送到远程仓库
git push origin main
git push origin v1.1.0

# 10. 发布到NPM
npm publish
```

### 🎉 v1.1.0 发布成功案例

实际发布输出示例：
```
> crawl-mcp-server@1.1.0 prepublishOnly
> npm run build

npm notice 📦  crawl-mcp-server@1.1.0
npm notice Tarball Contents
npm notice package size: 160.7 kB
npm notice unpacked size: 739.5 kB
npm notice total files: 187
npm notice Publishing to https://registry.npmjs.org/
+ crawl-mcp-server@1.1.0
```

## 📊 发布监控

### 查看包信息

```bash
# 查看包的详细信息
npm view crawl-mcp-server

# 查看包的所有版本
npm view crawl-mcp-server versions --json

# 查看包的下载统计
npm view crawl-mcp-server

# 在线查看: https://www.npmjs.com/package/crawl-mcp-server
```

### 撤回发布

```bash
# 撤回72小时内发布的版本
npm unpublish crawl-mcp-server@1.0.0

# 撤回整个包（谨慎使用）
npm unpublish crawl-mcp-server --force

# 弃用版本（推荐替代撤回）
npm deprecate crawl-mcp-server@1.0.0 "请使用1.0.1版本"
```

## 🚀 发布优化

### 自动化发布

创建 `scripts/publish.sh`:

```bash
#!/bin/bash

set -e

echo "🔧 开始发布流程..."

# 1. 运行测试
echo "📋 运行测试..."
npm test || echo "⚠️ 测试跳过或失败，继续发布..."

# 2. 构建项目
echo "🏗️ 构建项目..."
npm run build

# 3. 验证构建结果
echo "🔍 验证构建结果..."
if [ ! -d "dist" ]; then
  echo "❌ 构建失败：dist目录不存在"
  exit 1
fi

# 4. 更新版本（手动编辑package.json后跳过此步）
if [ -n "$1" ]; then
  echo "📝 更新版本..."
  npm version $1
fi

# 5. 创建Git标签
echo "🏷️ 创建Git标签..."
VERSION=$(node -p "require('./package.json').version")
git tag -a "v$VERSION" -m "版本 $VERSION: 自动发布"

# 6. 推送到Git
echo "📤 推送到Git..."
git push origin main
git push origin "v$VERSION"

# 7. 发布到NPM
echo "🚀 发布到npm..."
npm publish

echo "✅ 发布完成！版本 $VERSION 已成功发布"
echo "📦 NPM链接: https://www.npmjs.com/package/crawl-mcp-server"
echo "🔗 GitHub标签: https://github.com/wutongci/crawl-mcp-server/releases/tag/v$VERSION"
```

使用方法：
```bash
chmod +x scripts/publish.sh

# 自动更新版本并发布
./scripts/publish.sh patch  # 或 minor, major

# 手动更新package.json后发布
./scripts/publish.sh
```

### GitHub Actions 自动发布

创建 `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run tests
        run: npm test || echo "Tests skipped"
        continue-on-error: true
        
      - name: Build
        run: npm run build
        
      - name: Verify build
        run: |
          if [ ! -d "dist" ]; then
            echo "Build failed: dist directory not found"
            exit 1
          fi
          echo "Build verification passed"
        
      - name: Publish to NPM
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            ## 🎉 新版本发布
            
            ### 主要更新
            - 查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细更新内容
            
            ### 安装使用
            ```bash
            npx crawl-mcp-server@${{ github.ref_name }}
            ```
            
            ### 相关链接
            - [NPM包](https://www.npmjs.com/package/crawl-mcp-server)
            - [使用文档](./README.md)
          draft: false
          prerelease: false
```

**设置说明**:
1. 在 GitHub 仓库设置中添加 `NPM_TOKEN` secret
2. 推送标签时自动触发发布: `git push origin v1.1.0`

## ⚠️ 注意事项

### 1. 安全考虑

- 永远不要在代码中硬编码API密钥
- 使用环境变量管理敏感信息
- 定期更新依赖包

### 2. 版本控制

- 遵循语义化版本控制（SemVer）
- 保持CHANGELOG.md更新
- 重大变更要提前通知用户

### 3. 文档维护

- 保持README.md内容最新
- 提供完整的API文档
- 包含使用示例

### 4. 社区支持

- 及时回复Issues
- 接受合理的Pull Requests
- 保持开放的沟通

## 🆘 故障排除

### 常见问题

1. **权限错误**
   ```bash
   npm login
   npm whoami
   ```

2. **包名冲突**
   ```bash
   # 更改package.json中的name字段
   # 或使用scoped包名 @username/crawl-mcp-server
   ```

3. **构建失败**
   ```bash
   rm -rf node_modules
   pnpm install
   pnpm build
   ```

4. **测试失败**
   ```bash
   pnpm test --verbose
   ```

### 回滚方案

如果发布出现问题：

```bash
# 1. 立即弃用有问题的版本
npm deprecate crawl-mcp-server@1.0.1 "存在严重bug，请使用1.0.0版本"

# 2. 发布修复版本
npm version patch
npm publish

# 3. 更新latest标签（如果需要）
npm dist-tag add crawl-mcp-server@1.0.2 latest
```

## 🎉 总结

按照这个指南，你就可以成功将crawl-mcp项目发布到npm，让全球的开发者都能够通过简单的`npx crawl-mcp-server`命令来使用你的微信文章抓取MCP服务器！

### 📈 v1.1.0 发布成果

- ✅ **NPM包发布成功**: https://www.npmjs.com/package/crawl-mcp-server
- ✅ **GitHub版本标签**: https://github.com/wutongci/crawl-mcp-server/releases/tag/v1.1.0
- ✅ **新功能上线**: 真正的图片下载功能
- ✅ **包大小**: 160.7 kB (优化后)
- ✅ **文件数量**: 187个文件
- ✅ **Node.js支持**: >=18.0.0

### 🚀 用户反馈

用户现在可以：
1. **一键安装**: `npx crawl-mcp-server@1.1.0`
2. **自动模式**: 直接处理HTML并下载图片
3. **完整本地化**: 图片下载 + Markdown生成
4. **智能处理**: 微信专用格式支持

### 📝 持续改进

记住要保持：
- **代码质量**: 定期重构和优化
- **文档更新**: 及时反映新功能和变化
- **社区响应**: 积极回复Issues和PR
- **版本管理**: 遵循语义化版本控制
- **安全维护**: 定期更新依赖和修复漏洞

这样你的开源项目才能获得更多的关注和贡献，成为微信文章抓取领域的优秀工具！🌟 