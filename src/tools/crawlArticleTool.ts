import { z } from 'zod';
import { MCPTool } from '../types';
import { CallToolRequest, CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';

/**
 * 单篇微信文章抓取工具定义
 */
export const crawlArticleTool: MCPTool = {
    name: 'crawl_wechat_article',
    description: '🕷️ [微信文章抓取器] 智能抓取单篇微信公众号文章 - 自动处理页面导航、内容展开、图片下载，输出标准Markdown格式。支持反爬虫检测和智能重试机制。',
    inputSchema: {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: '微信公众号文章完整URL，支持mp.weixin.qq.com格式'
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
            }
        },
        required: ['url']
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
 * 抓取单篇微信文章工具
 * 这个工具会返回操作指令，让Cursor的Agent调用playwright-mcp进行实际抓取
 */
export async function crawlWechatArticle(request: CallToolRequest): Promise<CallToolResult> {
    try {
        const { url, clean_content = true, save_images = true, output_format = 'markdown', strategy = 'basic', timeout = 30000 } = request.params as any;

        if (!url) {
            return {
                content: [{
                    type: "text",
                    text: "错误：缺少必需的参数 'url'"
                }],
                isError: true
            };
        }

        // 验证URL格式
        if (!url.includes('mp.weixin.qq.com')) {
            return {
                content: [{
                    type: "text", 
                    text: "错误：URL必须是微信公众号文章链接（包含mp.weixin.qq.com）"
                }],
                isError: true
            };
        }

        // 返回操作指令，让Cursor Agent去执行
        const instructions = `
我需要抓取这篇微信文章的内容。请按照以下步骤操作：

## 第一步：打开浏览器并导航
请使用 mcp_playwright_browser_navigate 工具导航到：
${url}

## 第二步：等待页面加载
使用 mcp_playwright_browser_wait_for 工具等待3秒，确保页面完全加载。

## 第三步：尝试展开全文
使用 mcp_playwright_browser_snapshot 获取页面快照，然后查找"展开全文"或类似的按钮。
如果找到，使用 mcp_playwright_browser_click 点击展开。

## 第四步：获取页面内容
使用 mcp_playwright_browser_snapshot 获取完整的页面HTML内容。

## 第五步：提取文章信息
从HTML中提取以下信息：
- 文章标题（通常在 #activity-name 或 .rich_media_title 中）
- 发布时间（通常在 #publish_time 中） 
- 作者/公众号（通常在 .account_nickname_inner 中）
- 文章正文（通常在 #js_content 或 .rich_media_content 中）
- 图片链接（data-src 属性）

## 第六步：处理图片资源${save_images ? ' (已启用图片下载)' : ' (跳过图片下载)'}
${save_images ? `
**重要：需要下载所有图片并创建本地引用**

1. **创建文件夹结构**：
   - 创建文章文件夹（以文章标题命名，去除特殊字符）
   - 在文章文件夹内创建 images 子文件夹

2. **识别和下载图片**：
   - 从HTML中找到所有 <img> 标签的 data-src 或 src 属性
   - 对每个图片URL，使用 mcp_playwright_browser_navigate 访问图片链接
   - 使用 mcp_playwright_browser_take_screenshot 或保存方式下载图片
   - 图片命名：image_001.jpg, image_002.png 等（保持原格式）

3. **更新markdown中的图片引用**：
   - 将原始图片URL替换为本地路径：![图片描述](./images/image_001.jpg)
   - 确保所有图片都能在本地正常显示
` : '跳过图片下载（save_images=false）'}

## 第七步：生成最终文件
创建包含以下内容的markdown文件：
\`\`\`markdown
# [文章标题]

**作者：** [公众号名称]  
**发布时间：** [发布时间]  
**原文链接：** ${url}

---

[文章正文内容${save_images ? '，图片使用本地路径引用' : ''}]

---

*抓取时间：[当前时间]*
\`\`\`

## 处理配置：
- 清理内容：${clean_content ? '是' : '否'}
- 保存图片：${save_images ? '是' : '否'}  
- 输出格式：${output_format}
- 抓取策略：${strategy}
- 超时时间：${timeout}ms

请按顺序执行这些步骤，并在每一步完成后告诉我结果。${save_images ? '特别注意图片的下载和本地化处理！' : ''}
`;

        return {
            content: [{
                type: "text",
                text: instructions
            }]
        };

    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `抓取工具出错：${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
        };
    }
} 