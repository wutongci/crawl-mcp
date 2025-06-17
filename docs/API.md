# 微信文章抓取 MCP 服务器 API 文档

## 概述

微信文章抓取 MCP 服务器提供了一套完整的 Model Context Protocol (MCP) 工具，用于抓取和处理微信公众号文章。本文档详细描述了所有可用的工具、参数和响应格式。

## 工具列表

### 1. crawl_wechat_article - 单篇文章抓取

抓取指定微信文章的内容，包括正文、图片和元数据。

#### 参数

```typescript
{
    url: string;                // 必需：微信文章URL
    output_format?: 'markdown' | 'json' | 'html';  // 可选：输出格式，默认 markdown
    save_images?: boolean;      // 可选：是否下载图片，默认 true
    output_dir?: string;        // 可选：输出目录，默认 ./output
    strategy?: 'basic' | 'conservative' | 'fast';  // 可选：抓取策略，默认 basic
}
```

#### 响应格式

```typescript
{
    content: [{
        type: 'text',
        text: string;  // 包含抓取结果的富文本格式
    }]
}
```

#### 示例

```json
{
    "url": "https://mp.weixin.qq.com/s/AbCdEfGhIjKlMnOpQrStUv",
    "output_format": "markdown",
    "save_images": true,
    "output_dir": "./articles"
}
```

### 2. crawl_wechat_batch - 批量文章抓取

批量抓取多篇微信文章，支持并发控制和进度跟踪。

#### 参数

```typescript
{
    urls: string[];             // 必需：微信文章URL数组
    output_format?: 'markdown' | 'json' | 'html';  // 可选：输出格式，默认 markdown
    save_images?: boolean;      // 可选：是否下载图片，默认 true
    output_dir?: string;        // 可选：输出目录，默认 ./output
    concurrent_limit?: number;  // 可选：并发限制，默认 3
    delay_seconds?: number;     // 可选：请求间隔秒数，默认 2
    strategy?: 'basic' | 'conservative' | 'fast';  // 可选：抓取策略，默认 basic
}
```

#### 响应格式

```typescript
{
    content: [{
        type: 'text',
        text: string;  // 包含批量抓取结果的统计信息和详情
    }]
}
```

#### 示例

```json
{
    "urls": [
        "https://mp.weixin.qq.com/s/Article1",
        "https://mp.weixin.qq.com/s/Article2",
        "https://mp.weixin.qq.com/s/Article3"
    ],
    "concurrent_limit": 2,
    "delay_seconds": 3,
    "save_images": false
}
```

### 3. crawl_get_status - 状态查询

查询抓取会话的状态和系统性能信息。

#### 参数

```typescript
{
    session_id?: string;        // 可选：会话ID，不提供则返回全局状态
}
```

#### 响应格式

```typescript
{
    content: [{
        type: 'text',
        text: string;  // 包含状态信息的格式化文本
    }]
}
```

#### 示例

```json
{
    "session_id": "batch_20241201_143022"
}
```

## 抓取策略

系统提供三种预定义的抓取策略：

### 1. basic (基础策略)
- **适用场景**：日常使用，平衡速度和稳定性
- **页面加载超时**：30秒
- **网络超时**：20秒
- **重试次数**：2次
- **请求间隔**：2秒

### 2. conservative (保守策略)
- **适用场景**：网络不稳定或目标站点响应慢
- **页面加载超时**：60秒
- **网络超时**：45秒
- **重试次数**：3次
- **请求间隔**：5秒

### 3. fast (快速策略)
- **适用场景**：网络良好，追求速度
- **页面加载超时**：15秒
- **网络超时**：10秒
- **重试次数**：1次
- **请求间隔**：1秒

## 输出格式

### Markdown 格式
默认输出格式，包含：
- Front Matter 元数据
- 格式化的文章内容
- 图片引用链接
- 清洁的文本格式

### JSON 格式
结构化数据格式，包含：
- 完整的元数据对象
- 原始HTML内容
- 图片信息数组
- 抓取统计信息

### HTML 格式
保留原始格式的HTML：
- 清洁后的HTML内容
- 内联样式
- 图片本地路径替换

## 错误处理

所有工具都提供统一的错误处理机制：

### 错误响应格式

```typescript
{
    content: [{
        type: 'text',
        text: string;  // 以 ❌ 开头的错误信息
    }],
    isError: true
}
```

### 常见错误类型

1. **URL验证错误**
   - 无效的微信文章URL
   - URL格式不正确

2. **网络错误**
   - 连接超时
   - 页面加载失败
   - 反爬虫限制

3. **内容提取错误**
   - 页面结构变化
   - 关键元素缺失

4. **文件系统错误**
   - 输出目录无权限
   - 磁盘空间不足

## 性能和限制

### 并发限制
- 默认最大并发数：3
- 推荐范围：1-5
- 过高的并发可能触发反爬虫机制

### 请求频率
- 默认请求间隔：2秒
- 推荐最小间隔：1秒
- 频率过高可能被临时封禁

### 内存使用
- 单篇文章：平均 10-50MB
- 批量抓取：根据并发数线性增长
- 系统会自动进行内存优化

### 文件大小
- Markdown文件：通常 10-500KB
- 图片文件：根据原始大小
- JSON文件：通常比Markdown大2-3倍

## 最佳实践

### 1. URL验证
```typescript
// 确保URL是有效的微信文章链接
const validUrl = 'https://mp.weixin.qq.com/s/AbCdEfGhIjKlMnOpQrStUv';
```

### 2. 批量抓取配置
```typescript
{
    "concurrent_limit": 2,      // 保守的并发数
    "delay_seconds": 3,         // 较长的间隔
    "strategy": "conservative"  // 保守策略
}
```

### 3. 错误重试
- 系统自动处理重试逻辑
- 用户无需手动重试
- 检查状态接口了解失败原因

### 4. 输出目录管理
```typescript
{
    "output_dir": "./articles/2024-12"  // 按月份组织
}
```

### 5. 图片处理
```typescript
{
    "save_images": true,        // 推荐保存图片
    "output_format": "markdown" // Markdown格式便于阅读
}
```

## 状态代码

### 会话状态
- `running`: 正在执行
- `completed`: 执行完成
- `failed`: 执行失败
- `cancelled`: 已取消

### 系统状态
- 活跃会话数
- 今日抓取统计
- 内存使用情况
- 性能指标

## 集成示例

### 单篇文章抓取
```javascript
const result = await mcpClient.callTool('crawl_wechat_article', {
    url: 'https://mp.weixin.qq.com/s/example',
    output_format: 'markdown',
    save_images: true
});
```

### 批量抓取监控
```javascript
// 开始批量抓取
const batchResult = await mcpClient.callTool('crawl_wechat_batch', {
    urls: articleUrls,
    concurrent_limit: 2
});

// 监控进度
const status = await mcpClient.callTool('crawl_get_status', {});
```

## 技术支持

如需技术支持或报告问题，请访问项目仓库或联系开发团队。

---

**注意**：本API遵循MCP协议标准，所有响应都采用统一的content数组格式。使用时请确保微信文章URL的有效性，并遵守相关网站的使用条款。 