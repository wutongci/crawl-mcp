import { z } from 'zod';
import { MCPTool } from '../types';
import { CrawlBatchProgress } from './crawlBatchTool';

/**
 * 抓取状态查询工具定义
 */
export const crawlStatusTool: MCPTool = {
    name: 'crawl_get_status',
    description: '📊 [抓取状态查询器] 查询当前抓取任务的进度和状态 - 实时监控抓取进度、查看成功失败统计、获取详细错误信息。',
    inputSchema: {
        type: 'object',
        properties: {
            session_id: {
                type: 'string',
                description: '抓取会话ID，可选，不提供则返回所有活跃会话状态'
            },
            detailed: {
                type: 'boolean',
                default: false,
                description: '是否返回详细信息（包含错误详情和警告）'
            }
        }
    },
    zodSchema: z.object({
        session_id: z.string().optional(),
        detailed: z.boolean().default(false)
    })
};

/**
 * 状态查询参数类型定义
 */
export interface CrawlStatusParams {
    session_id?: string;
    detailed?: boolean;
}

/**
 * 单个会话状态信息
 */
export interface SessionStatus {
    session_id: string;
    type: 'single' | 'batch';
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    start_time: Date;
    end_time?: Date;
    duration?: number;
    progress?: CrawlBatchProgress;
    result_summary: {
        total_urls: number;
        completed_urls: number;
        successful_urls: number;
        failed_urls: number;
        success_rate: number;
    };
    current_operation?: string;
    last_update: Date;
    errors?: Array<{
        timestamp: Date;
        error: string;
        url?: string;
    }>;
    warnings?: Array<{
        timestamp: Date;
        warning: string;
        url?: string;
    }>;
    metadata?: {
        concurrent_limit?: number;
        delay_seconds?: number;
        output_format?: string;
        save_images?: boolean;
        clean_content?: boolean;
    };
}

/**
 * 全局状态信息
 */
export interface GlobalStatus {
    active_sessions: number;
    total_sessions_today: number;
    total_articles_crawled_today: number;
    system_uptime: number;
    memory_usage?: {
        used: number;
        total: number;
        percentage: number;
    };
    performance_stats: {
        average_crawl_time: number;
        success_rate: number;
        fastest_crawl: number;
        slowest_crawl: number;
        total_crawls: number;
    };
    current_load: {
        active_crawlers: number;
        queue_size: number;
        cpu_usage?: number;
    };
}

/**
 * 状态查询结果类型定义
 */
export interface CrawlStatusResult {
    success: boolean;
    timestamp: Date;
    global_status: GlobalStatus;
    sessions: SessionStatus[];
    query_duration: number;
    error?: string;
} 