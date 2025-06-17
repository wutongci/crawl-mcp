import { z } from 'zod';
import { MCPTool } from '../types';
import { CrawlArticleResult } from './crawlArticleTool';

/**
 * 批量微信文章抓取工具定义
 */
export const crawlBatchTool: MCPTool = {
    name: 'crawl_wechat_batch',
    description: '🔥 [批量文章抓取器] 高效批量抓取多篇微信公众号文章 - 支持并发控制、智能延时、断点续传。适合大量文章的批量收集和整理。',
    inputSchema: {
        type: 'object',
        properties: {
            urls: {
                type: 'array',
                items: { type: 'string' },
                description: '要抓取的文章URL列表'
            },
            concurrent_limit: {
                type: 'integer',
                default: 2,
                description: '并发抓取数量限制（建议2-3个）'
            },
            delay_seconds: {
                type: 'integer',
                default: 5,
                description: '每次抓取间隔秒数（避免触发反爬虫）'
            },
            output_format: {
                type: 'string',
                enum: ['markdown', 'json'],
                default: 'markdown',
                description: '输出格式'
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
            stop_on_error: {
                type: 'boolean',
                default: false,
                description: '遇到错误时是否停止整个批次'
            },
            create_summary: {
                type: 'boolean',
                default: true,
                description: '是否创建批量抓取摘要报告'
            }
        },
        required: ['urls']
    },
    zodSchema: z.object({
        urls: z.array(z.string().url()).min(1, '至少需要提供一个URL').max(50, '单次最多支持50个URL'),
        concurrent_limit: z.number().int().min(1).max(5).default(2),
        delay_seconds: z.number().int().min(1).max(60).default(5),
        output_format: z.enum(['markdown', 'json']).default('markdown'),
        save_images: z.boolean().default(true),
        clean_content: z.boolean().default(true),
        stop_on_error: z.boolean().default(false),
        create_summary: z.boolean().default(true)
    })
};

/**
 * 批量抓取参数类型定义
 */
export interface CrawlBatchParams {
    urls: string[];
    concurrent_limit?: number;
    delay_seconds?: number;
    output_format?: 'markdown' | 'json';
    save_images?: boolean;
    clean_content?: boolean;
    stop_on_error?: boolean;
    create_summary?: boolean;
}

/**
 * 批量抓取结果类型定义
 */
export interface CrawlBatchResult {
    success: boolean;
    total_count: number;
    success_count: number;
    failed_count: number;
    results: CrawlArticleResult[];
    summary_path?: string;
    batch_start_time: Date;
    batch_end_time: Date;
    total_duration: number;
    average_duration: number;
    concurrent_limit_used: number;
    delay_used: number;
    aggregated_stats: {
        total_articles: number;
        total_images: number;
        total_content_size: number;
        success_rate: number;
        fastest_crawl: number;
        slowest_crawl: number;
    };
    errors?: Array<{
        url: string;
        error: string;
        timestamp: Date;
    }>;
    warnings?: string[];
}

/**
 * 批量抓取进度信息
 */
export interface CrawlBatchProgress {
    session_id: string;
    total_urls: number;
    completed_urls: number;
    successful_urls: number;
    failed_urls: number;
    current_url?: string;
    progress_percentage: number;
    estimated_remaining_time?: number;
    start_time: Date;
    elapsed_time: number;
    average_time_per_url: number;
}

/**
 * 验证批量抓取参数
 */
export function validateCrawlBatchParams(params: any): CrawlBatchParams {
    try {
        const validated = crawlBatchTool.zodSchema.parse(params);
        
        // 额外验证URL格式
        const invalidUrls = validated.urls.filter((url: string) => !url.includes('mp.weixin.qq.com'));
        if (invalidUrls.length > 0) {
            throw new Error(`以下URL不是有效的微信文章URL: ${invalidUrls.join(', ')}`);
        }
        
        return validated;
    } catch (error) {
        if (error instanceof z.ZodError) {
            const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
            throw new Error(`批量抓取参数验证失败: ${messages.join(', ')}`);
        }
        throw error;
    }
}

/**
 * 创建批量成功结果
 */
export function createBatchSuccessResult(
    params: CrawlBatchParams,
    results: CrawlArticleResult[],
    batchInfo: {
        startTime: Date;
        endTime: Date;
        summaryPath?: string;
    }
): CrawlBatchResult {
    const successResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    const totalDuration = batchInfo.endTime.getTime() - batchInfo.startTime.getTime();
    const averageDuration = results.length > 0 ? Math.round(totalDuration / results.length) : 0;
    
    // 计算聚合统计
    const totalImages = successResults.reduce((sum, r) => sum + r.images.length, 0);
    const totalContentSize = successResults.reduce((sum, r) => sum + r.content.length, 0);
    const durations = results.map(r => r.duration).filter(d => d > 0);
    const fastestCrawl = durations.length > 0 ? Math.min(...durations) : 0;
    const slowestCrawl = durations.length > 0 ? Math.max(...durations) : 0;
    const successRate = Math.round((successResults.length / results.length) * 100);

    return {
        success: successResults.length > 0,
        total_count: results.length,
        success_count: successResults.length,
        failed_count: failedResults.length,
        results,
        summary_path: batchInfo.summaryPath,
        batch_start_time: batchInfo.startTime,
        batch_end_time: batchInfo.endTime,
        total_duration: totalDuration,
        average_duration: averageDuration,
        concurrent_limit_used: params.concurrent_limit || 2,
        delay_used: params.delay_seconds || 5,
        aggregated_stats: {
            total_articles: successResults.length,
            total_images: totalImages,
            total_content_size: totalContentSize,
            success_rate: successRate,
            fastest_crawl: fastestCrawl,
            slowest_crawl: slowestCrawl
        },
        errors: failedResults.map(r => ({
            url: r.url,
            error: r.error || '未知错误',
            timestamp: r.crawl_time
        })),
        warnings: []
    };
}

/**
 * 创建批量错误结果
 */
export function createBatchErrorResult(
    params: CrawlBatchParams,
    error: string,
    partialResults: CrawlArticleResult[] = []
): CrawlBatchResult {
    const successResults = partialResults.filter(r => r.success);
    const failedResults = partialResults.filter(r => !r.success);

    return {
        success: false,
        total_count: params.urls.length,
        success_count: successResults.length,
        failed_count: params.urls.length - successResults.length,
        results: partialResults,
        batch_start_time: new Date(),
        batch_end_time: new Date(),
        total_duration: 0,
        average_duration: 0,
        concurrent_limit_used: params.concurrent_limit || 2,
        delay_used: params.delay_seconds || 5,
        aggregated_stats: {
            total_articles: successResults.length,
            total_images: 0,
            total_content_size: 0,
            success_rate: 0,
            fastest_crawl: 0,
            slowest_crawl: 0
        },
        errors: [{
            url: 'batch_operation',
            error,
            timestamp: new Date()
        }],
        warnings: []
    };
}

/**
 * 创建进度信息
 */
export function createProgressInfo(
    sessionId: string,
    params: CrawlBatchParams,
    completed: number,
    successful: number,
    failed: number,
    startTime: Date,
    currentUrl?: string
): CrawlBatchProgress {
    const totalUrls = params.urls.length;
    const elapsedTime = Date.now() - startTime.getTime();
    const averageTimePerUrl = completed > 0 ? Math.round(elapsedTime / completed) : 0;
    const remainingUrls = totalUrls - completed;
    const estimatedRemainingTime = remainingUrls > 0 && averageTimePerUrl > 0 
        ? remainingUrls * averageTimePerUrl 
        : undefined;

    return {
        session_id: sessionId,
        total_urls: totalUrls,
        completed_urls: completed,
        successful_urls: successful,
        failed_urls: failed,
        current_url: currentUrl,
        progress_percentage: Math.round((completed / totalUrls) * 100),
        estimated_remaining_time: estimatedRemainingTime,
        start_time: startTime,
        elapsed_time: elapsedTime,
        average_time_per_url: averageTimePerUrl
    };
} 