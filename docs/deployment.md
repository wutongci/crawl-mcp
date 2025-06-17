# Crawl MCP 部署指南

## 🚀 快速部署

### 1. 构建项目

```bash
npm run build
```

### 2. 配置 Cursor

将以下配置添加到 Cursor 的 MCP 配置文件中：

#### macOS/Linux
编辑 `~/.cursor/mcp_config.json`:

```json
{
  "mcpServers": {
    "crawl-mcp": {
      "command": "node",
      "args": ["/path/to/crawl-mcp/dist/index.js"],
      "env": {
        "MCP_DEBUG": "true",
        "CRAWL_LOG_LEVEL": "info",
        "CRAWL_OUTPUT_DIR": "./crawled_articles",
        "CRAWL_MAX_CONCURRENT": "3",
        "CRAWL_DEFAULT_TIMEOUT": "30000",
        "CRAWL_RETRY_ATTEMPTS": "3"
      }
    }
  }
}
```

#### Windows
编辑 `%APPDATA%\Cursor\mcp_config.json`:

```json
{
  "mcpServers": {
    "crawl-mcp": {
      "command": "node",
      "args": ["C:\\path\\to\\crawl-mcp\\dist\\index.js"],
      "env": {
        "MCP_DEBUG": "true",
        "CRAWL_LOG_LEVEL": "info",
        "CRAWL_OUTPUT_DIR": ".\\crawled_articles",
        "CRAWL_MAX_CONCURRENT": "3",
        "CRAWL_DEFAULT_TIMEOUT": "30000",
        "CRAWL_RETRY_ATTEMPTS": "3"
      }
    }
  }
}
```

### 3. 重启 Cursor

配置完成后重启 Cursor，MCP 服务器将自动启动。

## 🔧 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `MCP_DEBUG` | `false` | 是否启用调试模式 |
| `CRAWL_LOG_LEVEL` | `info` | 日志级别 (debug/info/warn/error) |
| `CRAWL_OUTPUT_DIR` | `./crawled_articles` | 抓取结果输出目录 |
| `CRAWL_IMAGES_DIR` | `./crawled_articles/images` | 图片保存目录 |
| `CRAWL_MAX_CONCURRENT` | `3` | 最大并发抓取数 |
| `CRAWL_DEFAULT_TIMEOUT` | `30000` | 默认超时时间(ms) |
| `CRAWL_RETRY_ATTEMPTS` | `3` | 重试次数 |
| `CRAWL_USER_AGENT` | Chrome UA | 浏览器用户代理 |
| `CRAWL_MIN_DELAY` | `2000` | 最小延迟时间(ms) |
| `CRAWL_MAX_DELAY` | `5000` | 最大延迟时间(ms) |

## 🐳 Docker 部署

### 1. 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装 pnpm 和依赖
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN pnpm run build

# 暴露端口（如果需要）
EXPOSE 3000

# 启动命令
CMD ["node", "dist/index.js"]
```

### 2. 构建镜像

```bash
docker build -t crawl-mcp-server .
```

### 3. 运行容器

```bash
docker run -d \
  --name crawl-mcp \
  -e MCP_DEBUG=true \
  -e CRAWL_LOG_LEVEL=info \
  -v ./crawled_articles:/app/crawled_articles \
  crawl-mcp-server
```

## 📦 NPM 包发布

### 1. 更新版本

```bash
npm version patch  # 或 minor, major
```

### 2. 发布到 NPM

```bash
npm publish
```

### 3. 全局安装

```bash
npm install -g crawl-mcp-server
```

### 4. 全局使用

```json
{
  "mcpServers": {
    "crawl-mcp": {
      "command": "crawl-mcp-server",
      "env": {
        "MCP_DEBUG": "true"
      }
    }
  }
}
```

## 🔍 故障排除

### 1. 检查日志

```bash
# 查看 MCP 服务器日志
tail -f ./logs/crawl.log

# 或在 Cursor 中查看开发者工具的控制台
```

### 2. 常见问题

#### 服务器启动失败
- 检查 Node.js 版本 (需要 18+)
- 确认所有依赖已安装
- 检查文件路径是否正确

#### 抓取失败
- 检查网络连接
- 确认微信文章 URL 格式正确
- 检查是否触发了反爬虫机制

#### 权限问题
- 确保输出目录有写权限
- 检查日志文件路径权限

### 3. 调试模式

启用调试模式获取更多信息：

```bash
export MCP_DEBUG=true
export CRAWL_LOG_LEVEL=debug
```

## 🔄 更新升级

### 1. 更新代码

```bash
git pull origin main
npm install
npm run build
```

### 2. 重启服务

重启 Cursor 或重新启动 Docker 容器。

## 📊 监控和维护

### 1. 日志管理

定期清理日志文件：

```bash
# 清理超过 7 天的日志
find ./logs -name "*.log" -mtime +7 -delete
```

### 2. 存储管理

定期清理抓取结果：

```bash
# 清理超过 30 天的抓取结果
find ./crawled_articles -mtime +30 -delete
```

### 3. 性能监控

监控系统资源使用情况：

```bash
# 查看进程资源使用
ps aux | grep crawl-mcp
top -p $(pgrep -f crawl-mcp)
```

## 🛡️ 安全建议

1. **网络安全**：在生产环境中使用 HTTPS
2. **访问控制**：限制 MCP 服务器的访问权限
3. **数据保护**：定期备份抓取结果
4. **更新维护**：定期更新依赖包和系统

## 📞 技术支持

如果遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查项目的 GitHub Issues
3. 提交新的 Issue 并提供详细的错误信息和日志 