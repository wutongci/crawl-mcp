# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/yourusername/crawl-mcp-server/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/crawl-mcp-server/releases/tag/v1.0.0 