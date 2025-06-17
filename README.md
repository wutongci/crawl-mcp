# Crawl-MCP Server

[![npm version](https://badge.fury.io/js/crawl-mcp-server.svg)](https://www.npmjs.com/package/crawl-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

🚀 **完整的微信文章抓取MCP服务器** - 基于Model Context Protocol (MCP)的智能网页抓取工具，专为Cursor IDE和AI工具设计。

## ✨ 主要特性

### 🎯 核心功能
- **单篇抓取**: 抓取指定微信公众号文章
- **批量抓取**: 同时处理多个文章链接
- **状态查询**: 实时追踪抓取进度
- **智能重试**: 自动处理网络异常和页面加载问题

### 🔧 技术特色
- **MCP协议支持**: 完整的Model Context Protocol实现
- **Playwright集成**: 稳定的无头浏览器自动化
- **多种输出格式**: markdown、json、html
- **三种抓取策略**: basic、conservative、fast
- **TypeScript支持**: 完整的类型定义

### 🎮 Cursor IDE集成
- **无缝集成**: 一键安装到Cursor
- **AI工具支持**: 直接在Cursor中使用AI进行网页抓取
- **工具自动识别**: Agent自动调用相关抓取工具

## 🚀 快速开始

### 💻 安装使用

#### 方法1: npx直接运行（推荐）
```bash
npx crawl-mcp-server@latest
```

#### 方法2: 全局安装
```bash
npm install -g crawl-mcp-server
crawl-mcp-server
```

#### 方法3: 项目本地安装
```bash
npm install crawl-mcp-server
npx crawl-mcp-server
```

### 🔌 Cursor IDE配置

1. **创建MCP配置文件**
   在项目根目录创建 `.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "crawl-mcp": {
         "command": "npx",
         "args": ["crawl-mcp-server@latest"],
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
   ```
   请帮我抓取这篇微信文章：https://mp.weixin.qq.com/s/xxxxx
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