# Crawl-MCP Server

[![npm version](https://badge.fury.io/js/crawl-mcp-server.svg)](https://www.npmjs.com/package/crawl-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

🚀 **真正能下载图片的微信文章抓取工具** - 基于Model Context Protocol (MCP)的智能抓取服务器，专为Cursor IDE和AI工具设计。

> **🎉 v1.1.0 重大升级**：从"指令生成器"升级为"真正下载工具"，支持完整的图片本地化！

## ✨ 主要特性

### 🎯 核心功能 (v1.1.0)
- **真正的图片下载**: ✅ 实际下载微信图片，不只是生成指令
- **双模式设计**: 指令模式（学习用）+ 自动模式（效率用）
- **完整本地化**: 图片下载 + 路径更新 + 离线可用的Markdown文档
- **智能处理**: 微信域名识别、正确Headers、并发控制、重试机制

### 🔧 技术特色 (v1.1.0)
- **专业图片处理**: 
  - 🎯 微信图片域名识别（mmbiz.qpic.cn）
  - 🎯 正确的HTTP Headers（Referer, User-Agent）
  - 🎯 wx_fmt参数处理（jpeg, png, gif）
  - 🎯 并发控制（同时下载3张）+ 重试机制
- **MCP协议支持**: 完整的Model Context Protocol实现
- **模块化架构**: ImageDownloader + ArticleProcessor + CrawlTool
- **TypeScript支持**: 完整的类型定义和编译支持
- **Node.js 18+**: 使用内置fetch API，无额外HTTP库依赖

### 🎮 Cursor IDE集成
- **一键安装**: `npx crawl-mcp-server@1.1.0`
- **开箱即用**: 无需复杂配置，直接可用
- **AI工具支持**: 在Cursor中直接使用AI进行完整抓取
- **工具自动识别**: Agent自动调用相关抓取工具

## 🚀 快速开始

### 💻 安装使用

#### 方法1: npx直接运行（推荐）
```bash
# 使用最新的v1.1.0版本
npx crawl-mcp-server@1.1.0
```

#### 方法2: 全局安装
```bash
npm install -g crawl-mcp-server@1.1.0
crawl-mcp-server
```

#### 方法3: 项目本地安装
```bash
npm install crawl-mcp-server@1.1.0
npx crawl-mcp-server
```

> **💡 提示**: 推荐使用 `@1.1.0` 版本，确保获得最新的图片下载功能

### 🔌 Cursor IDE配置

1. **创建MCP配置文件**
   在项目根目录创建 `.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "crawl-mcp": {
         "command": "npx",
         "args": ["-y", "crawl-mcp-server@1.1.0"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

2. **重启Cursor**
   重启Cursor让配置生效

3. **开始使用**
   在Cursor中直接使用AI助手进行网页抓取：
   
   **指令模式**（学习推荐）：
   ```
   请使用crawl mcp抓取这篇微信文章：https://mp.weixin.qq.com/s/xxxxx
   ```
   
   **自动模式**（效率优先）：
   ```
   我已经获取了HTML内容，请使用crawl mcp自动模式处理并下载图片
   ```

## 🛠️ MCP工具说明

### 1. crawl_wechat_article
**单篇文章抓取工具**

**参数:**
- `url` (必需): 微信文章链接
- `outputFormat` (可选): 输出格式 (markdown/json/html，默认: markdown)
- `strategy` (可选): 抓取策略 (basic/conservative/fast，默认: basic)
- `includeImages` (可选): 是否包含图片 (默认: true)

**示例:**
```json
{
  "url": "https://mp.weixin.qq.com/s/example123",
  "outputFormat": "markdown",
  "strategy": "basic",
  "includeImages": true
}
```

### 2. crawl_wechat_batch
**批量文章抓取工具**

**参数:**
- `urls` (必需): 文章链接数组
- `outputFormat` (可选): 输出格式
- `strategy` (可选): 抓取策略
- `maxConcurrent` (可选): 最大并发数 (默认: 3)

**示例:**
```json
{
  "urls": [
    "https://mp.weixin.qq.com/s/example1",
    "https://mp.weixin.qq.com/s/example2"
  ],
  "outputFormat": "markdown",
  "maxConcurrent": 2
}
```

### 3. crawl_get_status
**状态查询工具**

**参数:**
- `sessionId` (可选): 会话ID，不提供则返回所有会话状态

## ⚙️ 抓取策略说明

| 策略 | 速度 | 稳定性 | 适用场景 |
|------|------|--------|----------|
| **fast** | ⚡ 最快 | 🔸 一般 | 网络良好，页面简单 |
| **basic** | 🚀 中等 | ⭐ 平衡 | 大多数情况（推荐） |
| **conservative** | 🐌 较慢 | 💎 最稳定 | 网络不稳定，复杂页面 |

## 📦 项目结构

```
crawl-mcp/
├── src/
│   ├── core/              # 核心模块
│   │   ├── CrawlMCPServer.ts    # MCP服务器
│   │   ├── CallOrchestrator.ts  # 调用编排器
│   │   └── StateManager.ts     # 状态管理
│   ├── adapters/          # 输出适配器
│   │   ├── MCPOutputAdapter.ts  # MCP格式转换
│   │   └── FileOutputAdapter.ts # 文件输出
│   ├── clients/           # 客户端
│   │   └── PlaywrightMCPClient.ts # Playwright客户端
│   ├── processors/        # 内容处理器
│   │   ├── ContentExtractor.ts  # 内容提取
│   │   ├── MarkdownConverter.ts # Markdown转换
│   │   └── ImageProcessor.ts    # 图片处理
│   ├── tools/             # MCP工具定义
│   ├── types/             # TypeScript类型
│   └── utils/             # 工具函数
├── docs/                  # 文档
├── examples/              # 示例代码
└── tests/                 # 测试文件
```

## 🧪 开发和测试

### 安装依赖
```bash
pnpm install
```

### 构建项目
```bash
pnpm build
```

### 运行测试
```bash
pnpm test
```

### 本地开发
```bash
pnpm dev
```

## 📊 测试覆盖

- ✅ **25个测试** 全部通过
- 🧪 **单元测试**: 核心组件功能验证
- 🔗 **集成测试**: MCP协议完整性测试
- 📋 **配置测试**: 所有配置文件验证

## 🤝 贡献指南

1. Fork 这个仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- 📦 [NPM包](https://www.npmjs.com/package/crawl-mcp-server)
- 🐙 [GitHub仓库](https://github.com/wutongci/crawl-mcp)
- 📖 [API文档](docs/API.md)
- 🛠️ [故障排除](docs/TROUBLESHOOTING.md)
- 📋 [发布指南](docs/NPM_PUBLISHING_GUIDE.md)

## 📞 支持

如果你遇到任何问题或有建议，请：

- 🐛 [提交Issue](https://github.com/wutongci/crawl-mcp/issues)
- 💬 [参与讨论](https://github.com/wutongci/crawl-mcp/discussions)
- 📧 联系开发者

---

**⭐ 如果这个项目对你有帮助，请给我们一个星标！**

Made with ❤️ by [wutongci](https://github.com/wutongci) 