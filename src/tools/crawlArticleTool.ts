import { z } from 'zod';
import { MCPTool } from '../types';

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