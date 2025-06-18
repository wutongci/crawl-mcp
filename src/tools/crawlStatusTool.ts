import { z } from 'zod';
import { MCPTool } from '../types';
import { CrawlBatchProgress } from './crawlBatchTool';
import { Logger } from '../utils/Logger.js';
import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';

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
 * 服务器状态检查工具
 * 提供服务器运行状态、性能指标和健康检查信息
 */
export async function crawlServerStatus(request: any): Promise<CallToolResult> {
    const logger = new Logger('CrawlStatusTool');
    
    try {
        logger.debug('执行服务器状态检查', request);
        
        // 提取参数
        const includeDetails = request?.params?.include_details || 
                              request?.params?.arguments?.include_details || 
                              false;
        
        // 获取系统信息
        const now = Date.now();
        const memUsage = process.memoryUsage();
        const uptime = process.uptime();
        
        // 基本状态信息
        const basicStatus = {
            server: {
                name: 'crawl-mcp-server',
                version: '1.1.6',
                status: 'running',
                pid: process.pid,
                uptime_seconds: Math.round(uptime),
                uptime_formatted: formatUptime(uptime)
            },
            memory: {
                heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
                heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
                rss_mb: Math.round(memUsage.rss / 1024 / 1024),
                external_mb: Math.round(memUsage.external / 1024 / 1024)
            },
            environment: {
                node_version: process.version,
                platform: process.platform,
                arch: process.arch,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            timestamp: new Date().toISOString()
        };
        
        // 健康检查
        const healthCheck = performHealthCheck(memUsage, uptime);
        
        let responseText = `📊 **Crawl MCP Server 状态报告**\n\n`;
        responseText += `🟢 **服务器状态**: ${basicStatus.server.status}\n`;
        responseText += `📦 **版本**: ${basicStatus.server.version}\n`;
        responseText += `🆔 **进程ID**: ${basicStatus.server.pid}\n`;
        responseText += `⏱️ **运行时间**: ${basicStatus.server.uptime_formatted}\n\n`;
        
        responseText += `💾 **内存使用**:\n`;
        responseText += `  - Heap: ${basicStatus.memory.heap_used_mb}MB / ${basicStatus.memory.heap_total_mb}MB\n`;
        responseText += `  - RSS: ${basicStatus.memory.rss_mb}MB\n`;
        responseText += `  - External: ${basicStatus.memory.external_mb}MB\n\n`;
        
        responseText += `🖥️ **运行环境**:\n`;
        responseText += `  - Node.js: ${basicStatus.environment.node_version}\n`;
        responseText += `  - 平台: ${basicStatus.environment.platform} (${basicStatus.environment.arch})\n`;
        responseText += `  - 时区: ${basicStatus.environment.timezone}\n\n`;
        
        responseText += `💚 **健康状态**: ${healthCheck.status}\n`;
        if (healthCheck.warnings.length > 0) {
            responseText += `⚠️ **警告**:\n`;
            healthCheck.warnings.forEach(warning => {
                responseText += `  - ${warning}\n`;
            });
            responseText += '\n';
        }
        
        // 详细信息
        if (includeDetails) {
            responseText += `🔍 **详细诊断信息**:\n\n`;
            
            // 环境变量
            const relevantEnvVars = [
                'MCP_DEBUG', 'MCP_MEMORY_MONITOR', 'NODE_ENV',
                'CRAWL_LOG_LEVEL', 'CRAWL_OUTPUT_DIR', 'CRAWL_MAX_CONCURRENT'
            ];
            
            responseText += `🔧 **环境配置**:\n`;
            relevantEnvVars.forEach(envVar => {
                const value = process.env[envVar];
                responseText += `  - ${envVar}: ${value || '(未设置)'}\n`;
            });
            responseText += '\n';
            
            // CPU 信息
            try {
                const cpuUsage = process.cpuUsage();
                responseText += `⚡ **CPU 使用**:\n`;
                responseText += `  - User: ${Math.round(cpuUsage.user / 1000)}ms\n`;
                responseText += `  - System: ${Math.round(cpuUsage.system / 1000)}ms\n\n`;
            } catch (error) {
                logger.debug('获取CPU信息失败', error);
            }
            
            // 磁盘空间检查
            try {
                const outputDir = process.env.CRAWL_OUTPUT_DIR || './crawled_articles';
                responseText += `💿 **存储信息**:\n`;
                responseText += `  - 输出目录: ${outputDir}\n`;
                responseText += `  - 工作目录: ${process.cwd()}\n\n`;
            } catch (error) {
                logger.debug('获取磁盘信息失败', error);
            }
            
            // 系统资源限制
            responseText += `📋 **系统限制**:\n`;
            try {
                const nodeOptions = process.env.NODE_OPTIONS || '(默认)';
                responseText += `  - Node选项: ${nodeOptions}\n`;
                responseText += `  - 最大内存: ${getMemoryLimit()}MB\n`;
            } catch (error) {
                responseText += `  - 无法获取资源限制信息\n`;
            }
        }
        
        responseText += `\n🕐 **报告时间**: ${basicStatus.timestamp}`;
        
        logger.info('服务器状态检查完成');
        
        return {
            content: [{
                type: 'text',
                text: responseText
            } as TextContent]
        };
        
    } catch (error) {
        logger.error('服务器状态检查失败:', error);
        
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        return {
            content: [{
                type: 'text',
                text: `❌ 服务器状态检查失败: ${errorMessage}`
            } as TextContent],
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