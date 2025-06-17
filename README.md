# 微信文章抓取 MCP 服务器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

一个专为微信公众号文章抓取设计的 Model Context Protocol (MCP) 服务器。通过智能步骤编排和 Playwright 自动化，实现高效、可靠的微信文章内容提取。

## ✨ 功能特性

### 🎯 核心功能

- **智能抓取**: 自动检测和处理微信文章的各种页面状态
- **批量处理**: 支持多URL并发抓取，可配置并发限制和延迟控制
- **格式转换**: 支持 Markdown 和 JSON 格式输出
- **图片保存**: 自动下载和本地化存储文章图片
- **内容清理**: 移除广告和无关元素，保留纯净内容

### 🔧 技术特性

- **步骤编排**: 智能的抓取步骤规划和执行
- **状态管理**: 完整的会话跟踪和状态监控
- **错误恢复**: 自动重试和优雅的错误处理
- **类型安全**: 完整的 TypeScript 类型定义
- **可扩展性**: 模块化设计，易于扩展新功能

### 🛡️ 可靠性保障

- **超时控制**: 防止长时间等待和资源泄漏
- **重试机制**: 智能重试策略应对网络异常
- **资源清理**: 自动清理过期会话和临时文件
- **日志记录**: 详细的操作日志便于调试和监控

## 📦 安装

### 前置要求

- Node.js 18+
- pnpm (推荐) 或 npm
- 支持的操作系统: macOS, Linux, Windows

### 快速安装

```bash
# 克隆项目
git clone <repository-url>
cd crawl-mcp

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行测试
pnpm test
```

## 🚀 快速开始

### 1. 启动 MCP 服务器

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm start
```

### 2. 配置 Claude Desktop

将以下配置添加到您的 Claude Desktop 配置文件中：

```json
{
  "mcpServers": {
    "wechat-crawler": {
      "command": "node",
      "args": ["path/to/crawl-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 3. 使用 MCP 工具

在 Claude 中使用以下工具：

#### 抓取单篇文章
```
crawl_wechat_article(
  url="https://mp.weixin.qq.com/s/article-url",
  options={
    "output_format": "markdown",
    "save_images": true,
    "clean_content": true
  }
)
```

#### 批量抓取
```
crawl_wechat_batch(
  urls=["url1", "url2", "url3"],
  options={
    "concurrent_limit": 2,
    "delay_seconds": 3
  }
)
```

#### 查询状态
```
crawl_get_status(session_id="your-session-id")
```

## 🛠️ API 参考

### 工具列表

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| `crawl_wechat_article` | 抓取单篇微信文章 | `url`, `options?` |
| `crawl_wechat_batch` | 批量抓取多篇文章 | `urls`, `options?` |
| `crawl_get_status` | 查询会话状态 | `session_id` |

### 配置选项

#### CrawlOptions
```typescript
interface CrawlOptions {
  output_format: 'markdown' | 'json';    // 输出格式
  save_images: boolean;                  // 是否保存图片
  clean_content: boolean;                // 是否清理内容
  timeout: number;                       // 超时时间(ms)
  retry_attempts: number;                // 重试次数
  delay_between_steps: number;           // 步骤间延迟(ms)
}
```

#### BatchCrawlOptions
```typescript
interface BatchCrawlOptions extends CrawlOptions {
  concurrent_limit: number;              // 并发限制
  delay_seconds: number;                 // 请求间延迟(秒)
  stop_on_error: boolean;               // 出错时是否停止
}
```

## 📁 项目结构

```
crawl-mcp/
├── src/
│   ├── core/                    # 核心业务逻辑
│   │   ├── CallOrchestrator.ts  # 调用编排器
│   │   ├── CrawlMCPServer.ts    # MCP服务器主类
│   │   └── StateManager.ts     # 状态管理器
│   ├── steps/                   # 抓取步骤实现
│   │   ├── BaseStep.ts         # 抽象基类
│   │   ├── NavigateStep.ts     # 页面导航
│   │   ├── WaitStep.ts         # 等待加载
│   │   ├── SnapshotStep.ts     # 内容快照
│   │   ├── ClickStep.ts        # 点击交互
│   │   └── ScreenshotStep.ts   # 截图保存
│   ├── clients/                 # 客户端实现
│   │   └── PlaywrightMCPClient.ts # Playwright客户端
│   ├── processors/              # 内容处理器
│   │   └── ContentProcessor.ts  # HTML内容处理
│   ├── adapters/               # 输出适配器
│   │   └── MCPOutputAdapter.ts  # MCP输出格式化
│   ├── types/                  # 类型定义
│   │   ├── crawl.types.ts      # 抓取相关类型
│   │   ├── mcp.types.ts        # MCP相关类型
│   │   └── playwright.types.ts  # Playwright类型
│   ├── config/                 # 配置文件
│   │   ├── defaultConfig.ts    # 默认配置
│   │   └── wechatSelectors.ts  # 微信页面选择器
│   ├── tools/                  # 工具定义
│   │   └── toolDefinitions.ts  # MCP工具定义
│   ├── utils/                  # 工具类
│   │   └── Logger.ts           # 日志工具
│   └── index.ts                # 入口文件
├── tests/                      # 测试文件
├── examples/                   # 使用示例
├── docs/                       # 文档
└── dist/                       # 构建输出
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 测试覆盖率
pnpm test:coverage
```

### 测试示例

```bash
# 运行基础示例
pnpm example:basic

# 运行高级示例
pnpm example:advanced
```

## 📊 监控和调试

### 日志级别

- `ERROR`: 错误信息
- `WARN`: 警告信息
- `INFO`: 一般信息
- `DEBUG`: 调试信息

### 状态监控

通过 `crawl_get_status` 工具可以实时监控：

- 会话状态 (pending/running/completed/failed)
- 当前执行步骤
- 进度百分比
- 执行时长
- 错误信息

## ⚙️ 配置

### 环境变量

```bash
# 日志级别
LOG_LEVEL=info

# 超时配置
DEFAULT_TIMEOUT=30000

# 并发限制
MAX_CONCURRENT_SESSIONS=5

# 数据存储目录
DATA_DIR=./data
```

### 自定义配置

创建 `config/custom.json` 文件：

```json
{
  "crawl": {
    "timeout": 45000,
    "retry_attempts": 5,
    "delay_between_steps": 2000
  },
  "batch": {
    "concurrent_limit": 3,
    "delay_seconds": 2
  }
}
```

## 🚢 部署

### Docker 部署

```bash
# 构建镜像
docker build -t wechat-crawler-mcp .

# 运行容器
docker run -p 3000:3000 wechat-crawler-mcp
```

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start dist/index.js --name "wechat-crawler"

# 查看状态
pm2 status

# 查看日志
pm2 logs wechat-crawler
```

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发指南

- 使用 TypeScript 进行开发
- 遵循 ESLint 代码规范
- 编写单元测试覆盖新功能
- 更新相关文档

## 📝 许可证

本项目使用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Model Context Protocol](https://github.com/modelcontextprotocol) - MCP 协议支持
- [Playwright](https://playwright.dev/) - 浏览器自动化
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Claude](https://claude.ai/) - AI 助手集成

## 📞 支持

如果您遇到任何问题或有疑问，请：

1. 查看 [文档](docs/)
2. 搜索 [Issues](../../issues)
3. 创建新的 [Issue](../../issues/new)

---

**注意**: 本工具仅用于学习和研究目的。请遵守相关网站的服务条款和 robots.txt 规则。 