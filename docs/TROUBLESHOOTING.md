# 微信文章抓取 MCP 服务器 - 故障排除指南

## 常见问题和解决方案

### 1. 服务器启动问题

#### 问题：服务器无法启动
```
Error: Cannot start MCP server
```

**原因分析**：
- 端口被占用
- 依赖缺失
- 配置文件错误

**解决方案**：
```bash
# 1. 检查端口占用
lsof -i :3000  # 或您配置的端口

# 2. 重新安装依赖
pnpm install

# 3. 检查配置
cat src/config/defaultConfig.ts
```

#### 问题：TypeScript编译错误
```
Error: Cannot find module '@types/node'
```

**解决方案**：
```bash
# 安装缺失的类型定义
pnpm add -D @types/node @types/jest

# 重新构建
pnpm build
```

### 2. 抓取功能问题

#### 问题：URL验证失败
```
❌ 执行失败: 无效的微信文章URL
```

**原因分析**：
- URL格式不正确
- 非微信公众号文章链接
- URL中包含特殊字符

**解决方案**：
```typescript
// 正确的URL格式
const validUrls = [
    'https://mp.weixin.qq.com/s/AbCdEfGhIjKlMnOpQrStUv',
    'https://mp.weixin.qq.com/s?__biz=xxx&mid=xxx&idx=1'
];

// 避免的URL格式
const invalidUrls = [
    'http://mp.weixin.qq.com/s/xxx',  // 使用https
    'https://weixin.qq.com/xxx',      // 缺少mp子域名
    'https://mp.weixin.qq.com/'       // 不是文章链接
];
```

#### 问题：页面加载超时
```
❌ 执行失败: 页面加载超时
```

**原因分析**：
- 网络连接不稳定
- 目标服务器响应慢
- 反爬虫机制限制

**解决方案**：
```typescript
// 1. 使用保守策略
{
    "strategy": "conservative",
    "delay_seconds": 5
}

// 2. 减少并发数
{
    "concurrent_limit": 1,
    "delay_seconds": 10
}

// 3. 手动配置超时
{
    "custom_timeouts": {
        "page_load": 60000,
        "network": 45000
    }
}
```

#### 问题：内容提取失败
```
❌ 执行失败: 无法提取文章内容
```

**原因分析**：
- 页面结构发生变化
- JavaScript渲染问题
- 内容被加密或保护

**解决方案**：
```bash
# 1. 更新选择器配置
# 编辑 src/config/wechatSelectors.ts

# 2. 启用调试模式
export MCP_DEBUG=true
pnpm start

# 3. 检查页面截图
# 截图会保存在 test-output/screenshots/
```

### 3. 文件系统问题

#### 问题：无法创建输出目录
```
❌ 执行失败: Permission denied
```

**解决方案**：
```bash
# 1. 检查目录权限
ls -la ./output

# 2. 修改权限
chmod 755 ./output

# 3. 或使用不同的输出目录
{
    "output_dir": "~/Downloads/articles"
}
```

#### 问题：磁盘空间不足
```
❌ 执行失败: No space left on device
```

**解决方案**：
```bash
# 1. 检查磁盘空间
df -h

# 2. 清理输出目录
rm -rf ./output/old_articles

# 3. 配置自动清理
{
    "auto_cleanup": true,
    "max_files": 1000
}
```

### 4. 性能问题

#### 问题：内存使用过高
```
System memory usage: 95%
```

**原因分析**：
- 并发数过高
- 图片文件过大
- 内存泄漏

**解决方案**：
```typescript
// 1. 降低并发数
{
    "concurrent_limit": 1,
    "batch_size": 5
}

// 2. 禁用图片下载
{
    "save_images": false
}

// 3. 启用内存监控
export MCP_MEMORY_MONITOR=true
```

#### 问题：抓取速度过慢
```
Average crawl time: 45 seconds per article
```

**解决方案**：
```typescript
// 1. 使用快速策略
{
    "strategy": "fast",
    "delay_seconds": 1
}

// 2. 增加并发数（谨慎）
{
    "concurrent_limit": 3
}

// 3. 优化输出格式
{
    "output_format": "markdown",  // 比JSON更快
    "save_images": false          // 跳过图片下载
}
```

### 5. MCP协议问题

#### 问题：工具调用失败
```
Client error: Tool not found
```

**解决方案**：
```bash
# 1. 检查工具注册
pnpm test -- --testNamePattern="工具定义"

# 2. 重启MCP服务器
pnpm start

# 3. 验证工具列表
# 使用MCP客户端调用 list_tools
```

#### 问题：响应格式错误
```
Client error: Invalid response format
```

**解决方案**：
```typescript
// 检查MCPOutputAdapter配置
const adapter = new MCPOutputAdapter();
const result = adapter.validateMCPFormat(response);

if (!result) {
    console.error('响应格式验证失败');
}
```

### 6. 网络和代理问题

#### 问题：连接被拒绝
```
❌ 执行失败: Connection refused
```

**解决方案**：
```bash
# 1. 检查网络连接
ping mp.weixin.qq.com

# 2. 配置代理（如需要）
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# 3. 配置用户代理
{
    "user_agent": "Mozilla/5.0 (compatible; CrawlBot/1.0)"
}
```

#### 问题：IP被限制
```
❌ 执行失败: IP blocked or rate limited
```

**解决方案**：
```typescript
// 1. 增加延迟
{
    "delay_seconds": 30,
    "random_delay": true
}

// 2. 使用代理轮换（高级功能）
{
    "proxy_rotation": true,
    "proxy_list": ["proxy1:8080", "proxy2:8080"]
}

// 3. 暂停抓取
// 等待几小时后重试
```

### 7. 调试和监控

#### 启用详细日志
```bash
# 设置日志级别
export LOG_LEVEL=debug

# 启用MCP调试
export MCP_DEBUG=true

# 启用性能监控
export PERF_MONITOR=true
```

#### 检查系统状态
```typescript
// 使用状态查询工具
const status = await mcpClient.callTool('crawl_get_status', {});
console.log(status.content[0].text);
```

#### 生成诊断报告
```bash
# 运行诊断脚本
pnpm run diagnose

# 输出系统信息
pnpm run system-info
```

### 8. 配置优化建议

#### 稳定性优先配置
```typescript
{
    "strategy": "conservative",
    "concurrent_limit": 1,
    "delay_seconds": 10,
    "retries": 3,
    "timeout_multiplier": 2.0
}
```

#### 速度优先配置
```typescript
{
    "strategy": "fast",
    "concurrent_limit": 5,
    "delay_seconds": 1,
    "save_images": false,
    "output_format": "markdown"
}
```

#### 平衡配置（推荐）
```typescript
{
    "strategy": "basic",
    "concurrent_limit": 3,
    "delay_seconds": 2,
    "save_images": true,
    "output_format": "markdown"
}
```

### 9. 获取帮助

#### 查看日志
```bash
# 服务器日志
tail -f logs/crawl-mcp.log

# 错误日志
tail -f logs/error.log

# 性能日志
tail -f logs/performance.log
```

#### 联系支持
如果问题仍未解决，请：

1. 收集错误信息和日志
2. 记录重现步骤
3. 提供系统环境信息
4. 在项目仓库提交 Issue

#### 应急恢复
```bash
# 完全重置
rm -rf node_modules
rm -rf dist
rm -rf output
pnpm install
pnpm build
pnpm start
```

---

**提示**：大多数问题都可以通过调整抓取策略和降低并发数来解决。如果遇到持续问题，建议先使用保守配置进行测试。 