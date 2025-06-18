import { z } from 'zod';
import { MCPTool } from '../types';
import { CallToolRequest, CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { ArticleProcessor, ArticleData, ProcessingOptions } from '../processors/ArticleProcessor';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * 单篇微信文章抓取工具定义
 */
export const crawlArticleTool: MCPTool = {
    name: 'crawl_wechat_article',
    description: '🕷️ [微信文章抓取器] 智能抓取单篇微信公众号文章 - 支持指令模式和自动模式。指令模式返回操作步骤，自动模式可直接处理HTML内容并下载图片。',
    inputSchema: {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: '微信公众号文章完整URL，支持mp.weixin.qq.com格式'
            },
            mode: {
                type: 'string',
                enum: ['instruction', 'auto'],
                default: 'instruction',
                description: '运行模式：instruction返回操作指令，auto直接处理（需要html_content参数）'
            },
            html_content: {
                type: 'string',
                description: '页面HTML内容（auto模式必需）'
            },
            output_format: {
                type: 'string',
                enum: ['markdown', 'json'],
                default: 'markdown',
                description: '输出格式：markdown为标准文档格式，json为结构化数据格式'
            },
            save_images: {
                type: 'boolean',
                default: true,
                description: '是否下载并本地化图片资源'
            },
            clean_content: {
                type: 'boolean',
                default: true,
                description: '是否自动清理广告和无关内容'
            },
            strategy: {
                type: 'string',
                enum: ['basic', 'conservative', 'fast'],
                default: 'basic',
                description: '抓取策略：basic为平衡模式，conservative为稳定模式，fast为快速模式'
            },
            timeout: {
                type: 'integer',
                default: 30000,
                description: '单步操作超时时间（毫秒，范围5000-120000）'
            },
            output_dir: {
                type: 'string',
                default: './crawled_articles',
                description: '输出目录路径'
            }
            },
    required: []
    },
    zodSchema: z.object({
        url: z.string().url('必须提供有效的微信文章URL').refine(
            (url) => url.includes('mp.weixin.qq.com'),
            '必须是微信公众号文章URL'
        ),
        output_format: z.enum(['markdown', 'json']).default('markdown'),
        save_images: z.boolean().default(true),
        clean_content: z.boolean().default(true),
        strategy: z.enum(['basic', 'conservative', 'fast']).default('basic'),
        timeout: z.number().int().min(5000).max(120000).default(30000)
    })
};

/**
 * 工具参数类型定义
 */
export interface CrawlArticleParams {
    url: string;
    output_format?: 'markdown' | 'json';
    save_images?: boolean;
    clean_content?: boolean;
    strategy?: 'basic' | 'conservative' | 'fast';
    timeout?: number;
}

/**
 * 工具执行结果类型定义
 */
export interface CrawlArticleResult {
    success: boolean;
    url: string;
    title: string;
    author: string;
    publish_time: string;
    content: string;
    images: Array<{
        original_url: string;
        local_path: string;
        filename: string;
        size: number;
        mime_type: string;
    }>;
    file_path: string;
    crawl_time: Date;
    duration: number;
    strategy_used: string;
    steps_completed: number;
    total_steps: number;
    error?: string;
    warnings?: string[];
    metadata?: {
        word_count: number;
        image_count: number;
        has_expand_button: boolean;
        page_load_time: number;
        content_extraction_time: number;
    };
}

/**
 * 验证工具参数
 */
export function validateCrawlArticleParams(params: any): CrawlArticleParams {
    try {
        return crawlArticleTool.zodSchema.parse(params);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
            throw new Error(`参数验证失败: ${messages.join(', ')}`);
        }
        throw error;
    }
}

/**
 * 创建成功结果
 */
export function createSuccessResult(
    params: CrawlArticleParams,
    result: Partial<CrawlArticleResult>
): CrawlArticleResult {
    return {
        success: true,
        url: params.url,
        title: result.title || '未知标题',
        author: result.author || '未知作者',
        publish_time: result.publish_time || new Date().toISOString(),
        content: result.content || '',
        images: result.images || [],
        file_path: result.file_path || '',
        crawl_time: result.crawl_time || new Date(),
        duration: result.duration || 0,
        strategy_used: params.strategy || 'basic',
        steps_completed: result.steps_completed || 0,
        total_steps: result.total_steps || 0,
        warnings: result.warnings || [],
        metadata: result.metadata || {
            word_count: (result.content || '').length,
            image_count: (result.images || []).length,
            has_expand_button: false,
            page_load_time: 0,
            content_extraction_time: 0
        }
    };
}

/**
 * 创建错误结果
 */
export function createErrorResult(
    params: CrawlArticleParams,
    error: string,
    partialResult?: Partial<CrawlArticleResult>
): CrawlArticleResult {
    return {
        success: false,
        url: params.url,
        title: partialResult?.title || '',
        author: partialResult?.author || '',
        publish_time: partialResult?.publish_time || '',
        content: partialResult?.content || '',
        images: partialResult?.images || [],
        file_path: partialResult?.file_path || '',
        crawl_time: partialResult?.crawl_time || new Date(),
        duration: partialResult?.duration || 0,
        strategy_used: params.strategy || 'basic',
        steps_completed: partialResult?.steps_completed || 0,
        total_steps: partialResult?.total_steps || 0,
        error,
        warnings: partialResult?.warnings || []
    };
}

/**
 * 抓取微信公众号文章工具
 */
export async function crawlWechatArticle(request: CallToolRequest): Promise<CallToolResult> {
    try {
        // 提取URL参数
        const args = request.params.arguments as { url?: string };
        const url = args?.url;

        if (!url) {
            return {
                content: [{
                    type: 'text',
                    text: '❌ 错误：缺少必需的参数 "url"'
                }],
                isError: true
            };
        }

        // 验证URL
        if (!url.includes('mp.weixin.qq.com')) {
            return {
                content: [{
                    type: 'text',
                    text: '❌ 错误：请提供有效的微信公众号文章URL'
                }],
                isError: true
            };
        }

        // 返回抓取指令
        return {
            content: [{
                type: 'text',
                text: `🔄 正在准备抓取微信文章...

📋 **抓取任务:**
- URL: ${url}
- 任务: 微信公众号文章抓取
- 输出: Markdown格式 + 图片下载

🤖 **请使用playwright-mcp执行以下操作:**

1. 打开页面: ${url}
2. 等待页面加载完成
3. 提取文章标题、内容、图片
4. 下载所有图片到本地
5. 生成Markdown文档

✅ 抓取任务已准备就绪，请agent继续执行`
            }]
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        return {
            content: [{
                type: 'text',
                text: `❌ 工具执行失败: ${errorMessage}`
            }],
            isError: true
        };
    }
}

/**
 * 自动处理文章（包括图片下载）
 */
async function processArticleAutomatically(
    url: string,
    htmlContent: string,
    options: {
        save_images: boolean;
        clean_content: boolean;
        output_format: string;
        strategy: string;
        timeout: number;
        output_dir: string;
    }
): Promise<CallToolResult> {
    try {
        const processor = new ArticleProcessor();
        
        // 从HTML中提取文章数据
        const articleData: ArticleData = processor.extractArticleDataFromSnapshot(htmlContent);
        articleData.url = url;
        
        // 准备处理选项
        const processingOptions: ProcessingOptions = {
            output_dir: options.output_dir,
            save_images: options.save_images,
            clean_content: options.clean_content,
            create_markdown: options.output_format === 'markdown',
            create_json: options.output_format === 'json'
        };

        // 处理参数
        const crawlParams: CrawlArticleParams = {
            url,
            save_images: options.save_images,
            clean_content: options.clean_content,
            output_format: options.output_format as 'markdown' | 'json',
            strategy: options.strategy as 'basic' | 'conservative' | 'fast',
            timeout: options.timeout
        };

        // 执行完整的文章处理
        const result = await processor.processArticle(articleData, crawlParams, processingOptions);

        if (result.success) {
            const successMessage = `✅ **文章抓取成功！**

📄 **文章信息**
- 标题: ${result.title}
- 作者: ${result.author}
- 发布时间: ${result.publish_time}
- 字数: ${result.metadata?.word_count || 0}

🖼️ **图片处理**
- 发现图片: ${result.metadata?.image_count || 0} 张
- 下载成功: ${result.images.filter(img => img.local_path).length} 张
- 下载失败: ${result.images.length - result.images.filter(img => img.local_path).length} 张

📁 **输出文件**
- 保存位置: ${result.file_path}
- 处理时间: ${result.duration}ms

${result.images.length > 0 ? `
🔗 **图片清单**
${result.images.map((img, idx) => 
    `${idx + 1}. ${img.filename} (${(img.size / 1024).toFixed(1)}KB) ${img.local_path ? '✅' : '❌'}`
).join('\n')}
` : ''}

${result.warnings && result.warnings.length > 0 ? `
⚠️ **警告信息**
${result.warnings.join('\n')}
` : ''}

🎉 处理完成！你现在可以在 "${result.file_path}" 查看抓取的文章内容。`;

            return {
                content: [{
                    type: "text",
                    text: successMessage
                }]
            };
        } else {
            return {
                content: [{
                    type: "text",
                    text: `❌ **文章处理失败**

错误信息: ${result.error}

**已完成步骤**: ${result.steps_completed}/${result.total_steps}

请检查：
1. URL是否有效
2. 页面HTML是否完整
3. 网络连接是否正常
4. 输出目录是否有写入权限

建议使用指令模式获取详细的手动操作步骤。`
                }],
                isError: true
            };
        }

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
            content: [{
                type: "text",
                text: `❌ **自动处理过程出错**

错误信息: ${errorMsg}

建议：
1. 检查HTML内容是否完整
2. 确保有足够的磁盘空间
3. 检查网络连接
4. 尝试使用指令模式进行手动操作

如需详细操作步骤，请使用 \`mode: "instruction"\``
            }],
            isError: true
        };
    }
}

/**
 * 生成操作指令
 */
function generateInstructions(url: string, options: {
    save_images: boolean;
    clean_content: boolean;
    output_format: string;
    strategy: string;
    timeout: number;
}): string {
    return `🕷️ **微信文章抓取指令** - 请按以下步骤操作：

## 🎯 抓取目标
**URL**: ${url}
**配置**: 图片下载=${options.save_images ? '✅' : '❌'}, 内容清理=${options.clean_content ? '✅' : '❌'}, 格式=${options.output_format}

## 📋 执行步骤

### 第一步：打开浏览器并导航
使用 \`mcp_playwright_browser_navigate\` 导航到：
\`\`\`
${url}
\`\`\`

### 第二步：等待页面完全加载
使用 \`mcp_playwright_browser_wait_for\` 等待 3 秒，确保页面加载完成：
\`\`\`json
{ "time": 3000 }
\`\`\`

### 第三步：检查并展开全文
1. 使用 \`mcp_playwright_browser_snapshot\` 获取页面快照
2. 查找"展开全文"、"阅读全文"等按钮
3. 如果找到，使用 \`mcp_playwright_browser_click\` 点击展开

### 第四步：获取完整页面内容
再次使用 \`mcp_playwright_browser_snapshot\` 获取完整的页面HTML内容

### 第五步：提取核心信息
从HTML中提取：
- **标题**: \`#activity-name\` 或 \`.rich_media_title\`
- **作者**: \`.account_nickname_inner\` 或 \`#js_name\`  
- **时间**: \`#publish_time\` 或 \`.publish_time\`
- **正文**: \`#js_content\` 或 \`.rich_media_content\`
- **图片**: 所有 \`<img>\` 标签的 \`src\` 和 \`data-src\` 属性

${options.save_images ? `
### 🖼️ 第六步：图片处理（已启用）

**重要提示**：crawl-mcp 内置了完整的图片下载功能

#### 6.1 自动模式（推荐）
获取到页面HTML后，使用自动模式：
\`\`\`json
{
  "url": "${url}",
  "mode": "auto", 
  "html_content": "[第四步获取的HTML内容]",
  "save_images": true,
  "clean_content": ${options.clean_content},
  "output_format": "${options.output_format}",
  "output_dir": "./crawled_articles"
}
\`\`\`

#### 6.2 手动模式（备选方案）
如果自动模式失败，可手动执行：

**创建目录结构**
\`\`\`bash
mkdir -p "文章标题/images"
\`\`\`

**使用内置图片下载器**
\`\`\`javascript
const { ImageDownloader } = require('./crawl-mcp/src/utils/ImageDownloader');
const downloader = new ImageDownloader();

// 从HTML提取图片
const imageUrls = downloader.extractImageUrlsFromHtml(htmlContent);

// 批量下载
const results = await downloader.downloadImages(imageUrls, {
  output_dir: './文章标题/images',
  max_file_size: 10 * 1024 * 1024, // 10MB
  timeout: 15000,
  retries: 3
});
\`\`\`

**微信图片特殊处理**
- 验证域名：\`mmbiz.qpic.cn\`, \`mmbiz.qlogo.cn\`
- 添加正确的 Headers：
  - \`Referer: https://mp.weixin.qq.com/\`
  - \`User-Agent: Mozilla/5.0...\`
- 处理格式参数：\`wx_fmt=jpeg|png|gif\`
` : `
### 第六步：跳过图片处理
图片下载已禁用，将保留原始URL引用
`}

### 第七步：生成最终文件
创建包含以下内容的markdown文件：

\`\`\`markdown
# [文章标题]

**作者**: [公众号名称]  
**发布时间**: [发布时间]  
**原文链接**: ${url}

${options.save_images ? '**图片统计**: 共 X 张图片，成功下载 Y 张' : ''}

---

[文章正文内容]

---

*本文由 crawl-mcp 自动抓取于 [当前时间]*
\`\`\`

## ⚙️ 处理配置
- **清理内容**: ${options.clean_content ? '✅ 启用（移除广告推广）' : '❌ 关闭'}
- **保存图片**: ${options.save_images ? '✅ 启用（下载到本地）' : '❌ 关闭'}  
- **输出格式**: ${options.output_format}
- **抓取策略**: ${options.strategy}
- **超时时间**: ${options.timeout}ms

## 💡 使用提示
1. **图片下载**：${options.save_images ? '必须手动执行上述第6步的图片下载流程' : '已跳过，节省时间'}
2. **内容清理**：${options.clean_content ? '手动移除广告和推广内容' : '保留原始内容'}
3. **文件保存**：建议保存到 \`./crawled_articles/\` 目录下

${options.save_images ? `
## 🔧 **关键代码示例**

### 图片下载脚本
\`\`\`bash
# 创建目录
mkdir -p "文章标题/images"

# 下载图片（示例）
curl -H "Referer: https://mp.weixin.qq.com/" \\
     -H "User-Agent: Mozilla/5.0..." \\
     "https://mmbiz.qpic.cn/..." \\
     -o "images/image_001.jpg"
\`\`\`

### URL替换正则
\`\`\`javascript
content.replace(/https:\\/\\/mmbiz\\.qpic\\.cn\\/[^\\s)]+/g, './images/image_XXX.jpg')
\`\`\`
` : ''}

请按步骤执行，${options.save_images ? '特别注意图片下载和本地化处理！' : ''}每完成一步请告知结果。`;
} 