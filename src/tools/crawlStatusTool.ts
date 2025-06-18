import { z } from 'zod';
import { MCPTool } from '../types';
import { CrawlBatchProgress } from './crawlBatchTool';
import { Logger } from '../utils/Logger.js';
import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

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

/**
 * 获取服务器状态工具
 */
export async function crawlServerStatus(request: CallToolRequest): Promise<CallToolResult> {
    try {
        const status = {
            server: {
                name: 'crawl-mcp-server',
                version: '1.1.6',
                status: 'running',
                pid: process.pid,
                node_version: process.version,
                platform: process.platform,
                arch: process.arch
            },
            memory: {
                used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024)
            },
            environment: {
                node_env: process.env.NODE_ENV || 'production',
                debug_mode: process.env.MCP_DEBUG === 'true'
            }
        };

        return {
            content: [{
                type: 'text',
                text: `✅ **Crawl MCP Server 状态报告**

🏠 **服务器信息:**
- 名称: ${status.server.name}
- 版本: ${status.server.version}
- 状态: ${status.server.status}
- 进程ID: ${status.server.pid}

💻 **运行环境:**
- Node.js: ${status.server.node_version}
- 平台: ${status.server.platform}
- 架构: ${status.server.arch}

📊 **内存使用:**
- 已用: ${status.memory.used_mb}MB
- 总计: ${status.memory.total_mb}MB  
- RSS: ${status.memory.rss_mb}MB

⚙️ **配置:**
- 环境: ${status.environment.node_env}
- 调试模式: ${status.environment.debug_mode ? '✅ 开启' : '❌ 关闭'}

🔧 **可用功能:**
- ✅ 微信文章抓取 (crawl_wechat_article)
- ✅ 服务器状态查询 (crawl_server_status)

📝 **使用说明:**
使用 crawl_wechat_article 工具抓取微信公众号文章，支持图片下载和Markdown转换。`
            }]
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        return {
            content: [{
                type: 'text',
                text: `❌ 获取状态失败: ${errorMessage}`
            }],
            isError: true
        };
    }
}

/**
 * 格式化运行时间
 */
function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (days > 0) {
        return `${days}天 ${hours}小时 ${minutes}分钟`;
    } else if (hours > 0) {
        return `${hours}小时 ${minutes}分钟`;
    } else if (minutes > 0) {
        return `${minutes}分钟 ${secs}秒`;
    } else {
        return `${secs}秒`;
    }
}

/**
 * 执行健康检查
 */
function performHealthCheck(memUsage: NodeJS.MemoryUsage, uptime: number): {
    status: string;
    warnings: string[];
} {
    const warnings: string[] = [];
    
    // 内存检查
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    
    if (heapUsedMB > 800) {
        warnings.push(`Heap内存使用过高: ${heapUsedMB}MB`);
    }
    
    if (rssMB > 1000) {
        warnings.push(`RSS内存使用过高: ${rssMB}MB`);
    }
    
    // 运行时间检查
    if (uptime > 24 * 3600) { // 超过24小时
        warnings.push(`服务器运行时间较长: ${formatUptime(uptime)}`);
    }
    
    // 环境检查
    if (!process.env.MCP_DEBUG) {
        warnings.push('调试模式未启用，可能影响问题诊断');
    }
    
    const status = warnings.length === 0 ? '健康' : 
                   warnings.length <= 2 ? '良好' : '需要关注';
    
    return { status, warnings };
}

/**
 * 获取内存限制
 */
function getMemoryLimit(): number {
    const nodeOptions = process.env.NODE_OPTIONS || '';
    const match = nodeOptions.match(/--max-old-space-size=(\d+)/);
    
    if (match) {
        return parseInt(match[1], 10);
    }
    
    // 默认内存限制（Node.js 默认值）
    return process.arch === 'x64' ? 1400 : 700;
} 