# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.3] - 2024-12-18

### 🐛 Critical Bug Fixes

#### ✅ 修复的关键问题
- **MCP参数传递问题**：完全修复了 "缺少必需的参数'url'" 错误
  - 改进了参数提取逻辑，正确处理 MCP 的 `arguments` 字段
  - 兼容多种参数传递格式（arguments、直接参数等）
  - 确保参数验证逻辑正常工作
- **npm包执行权限问题**：解决了 `sh: crawl-mcp-server: command not found` 错误
  - 更新构建脚本自动为 `dist/index.js` 添加执行权限
  - 确保 `npx crawl-mcp-server` 能正常运行
  - 修复了 shebang 权限问题
- **调试模式卡死问题**：移除了临时调试代码，恢复正常功能
  - 清理了所有调试输出和临时返回
  - 恢复了完整的工具功能（指令模式、自动模式）
  - 修复了工具一直返回调试信息的问题

#### 🔧 技术改进
- **构建流程优化**：
  - 修改 `package.json` 的 build 脚本：`"build": "tsc && chmod +x dist/index.js"`
  - 确保每次构建都自动设置正确的文件权限
- **参数处理增强**：
  - 更智能的参数提取逻辑
  - 更好的错误处理和用户反馈
  - 保持向后兼容性
- **发布流程完善**：
  - 自动化的构建和发布流程
  - 完整的版本标签和代码同步

#### 🚀 用户体验
- **立即可用**：
  - `npx crawl-mcp-server@latest` 现在能正常启动
  - Cursor MCP 集成恢复正常工作
  - 所有工具功能完全可用
- **稳定性提升**：
  - 消除了随机的参数传递失败
  - 修复了工具时有时无的问题
  - 确保一致的用户体验

### 📦 安装和使用
```bash
# 直接运行最新版本
npx crawl-mcp-server@latest

# 或在 Cursor MCP 配置中使用
{
  "mcpServers": {
    "crawl-mcp": {
      "command": "npx",
      "args": ["-y", "crawl-mcp-server@latest"]
    }
  }
}
```

### ⚡ 立即测试
现在可以正常使用微信文章抓取功能：
```
https://mp.weixin.qq.com/s/任意文章链接
```

---

## [1.1.2] - 2024-12-18

### 🔧 Build Fixes
- 修复 npm 包执行权限问题
- 更新构建脚本自动设置执行权限

---

## [1.1.1] - 2024-12-18

### 🐛 Parameter Fixes  
- 修复 MCP 参数传递逻辑
- 改进错误处理机制

---

## [1.0.0] - 2024-12-26

### Added
- 初始版本发布
- 微信公众号文章抓取功能
- 支持单篇文章抓取 (`crawl_wechat_article`)
- 支持批量文章抓取 (`crawl_wechat_batch`)
- 抓取状态查询功能 (`crawl_get_status`)
- 多种输出格式支持 (markdown, json, html)
- 三种抓取策略：basic, conservative, fast
- 完整的 MCP (Model Context Protocol) 集成
- TypeScript 类型定义支持
- 全面的单元测试和集成测试
- 详细的 API 文档和故障排除指南
- 与 Cursor IDE 的完美集成

### Features
- **智能抓取**：基于 Playwright 的稳定网页抓取
- **格式转换**：自动将网页内容转换为 Markdown 格式
- **图片处理**：支持图片下载和Base64编码
- **错误处理**：完善的错误处理和重试机制
- **配置灵活**：支持多种抓取策略和配置选项
- **状态管理**：实时追踪抓取进度和状态
- **文件管理**：自动文件组织和存储

### Technical Stack
- TypeScript 5.0+
- Node.js 18+
- Model Context Protocol SDK
- Playwright (通过 MCP 调用)
- Jest (测试框架)
- Zod (数据验证)
- Cheerio (HTML 解析)
- Turndown (Markdown 转换)

### Installation
```bash
npx crawl-mcp-server
```

### Documentation
- [API Documentation](docs/API.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [NPM Publishing Guide](docs/NPM_PUBLISHING_GUIDE.md)

## [1.1.0] - 2024-12-19

### 🎉 重大功能升级

#### ✨ 新增功能
- **真正的图片下载功能**：不再只是指令生成器，现在可以实际下载微信公众号文章中的图片
- **自动模式**：新增 `mode: "auto"` 参数，支持直接处理 HTML 内容并自动下载图片
- **智能图片处理**：
  - 自动识别微信图片域名（mmbiz.qpic.cn, mmbiz.qlogo.cn）
  - 正确处理微信特有的图片格式参数（wx_fmt）
  - 自动添加必需的 HTTP Headers（Referer, User-Agent）
  - 并发下载控制（同时下载3张图片）
  - 智能重试机制（失败自动重试3次）
  - 文件大小限制和超时控制
- **完整的文件管理**：
  - 自动创建合理的目录结构
  - 智能文件命名（UUID + 扩展名）
  - 自动更新 Markdown 中的图片引用为本地路径
- **详细的处理反馈**：
  - 实时下载进度显示
  - 详细的成功/失败统计
  - 完整的错误信息和建议

#### 🔧 改进功能
- **增强的工具参数**：
  - 新增 `mode` 参数：支持 "instruction" 和 "auto" 两种模式
  - 新增 `html_content` 参数：用于传入页面 HTML 内容
  - 新增 `output_dir` 参数：自定义输出目录
- **优化的指令模式**：
  - 更详细的操作步骤说明
  - 包含自动模式的使用指导
  - 提供具体的代码示例和配置参数
- **更好的错误处理**：
  - 完善的参数验证
  - 清晰的错误信息
  - 详细的故障排除建议

#### 🏗️ 技术改进
- 使用 Node.js 18+ 内置的 fetch API
- 完整的 TypeScript 类型定义
- 模块化的代码架构（ImageDownloader, ArticleProcessor）
- 完善的单元测试覆盖

### 📦 依赖更新
- 保持所有依赖为最新稳定版本
- 优化了包大小和加载性能

### 🐛 Bug 修复
- 修复了图片 URL 提取的正则表达式
- 改进了文件路径处理的跨平台兼容性
- 优化了内存使用和性能

---

## [1.0.7] - 2024-12-18

### 初始版本
- 基础的微信文章抓取功能
- 指令模式操作
- 基本的内容提取
- Playwright 集成支持

[Unreleased]: https://github.com/yourusername/crawl-mcp-server/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/crawl-mcp-server/releases/tag/v1.0.0 