import { z } from 'zod';
import { crawlArticleTool } from './crawlArticleTool';
import { crawlBatchTool } from './crawlBatchTool';
import { crawlStatusTool } from './crawlStatusTool';
import { MCPTool } from '../types';

/**
 * 微信文章抓取工具
 */
const crawlWechatArticleTool: MCPTool = {
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
            }
        },
        required: ['url']
    },
    zodSchema: z.object({
        url: z.string().url('必须提供有效的微信文章URL'),
        output_format: z.enum(['markdown', 'json']).default('markdown'),
        save_images: z.boolean().default(true),
        clean_content: z.boolean().default(true)
    })
};

/**
 * 批量文章抓取工具
 */
const crawlWechatBatchTool: MCPTool = {
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
                default: 'markdown'
            },
            save_images: {
                type: 'boolean',
                default: true
            },
            stop_on_error: {
                type: 'boolean',
                default: false,
                description: '遇到错误时是否停止批量任务'
            }
        },
        required: ['urls']
    },
    zodSchema: z.object({
        urls: z.array(z.string().url()).min(1, '至少需要提供一个URL'),
        concurrent_limit: z.number().int().min(1).max(5).default(2),
        delay_seconds: z.number().int().min(1).max(60).default(5),
        output_format: z.enum(['markdown', 'json']).default('markdown'),
        save_images: z.boolean().default(true),
        stop_on_error: z.boolean().default(false)
    })
};

/**
 * 抓取状态查询工具
 */
const crawlGetStatusTool: MCPTool = {
    name: 'crawl_get_status',
    description: '📊 [抓取状态查询器] 查询当前抓取任务的进度和状态 - 实时监控抓取进度、查看成功失败统计、获取详细错误信息。',
    inputSchema: {
        type: 'object',
        properties: {
            session_id: {
                type: 'string', 
                description: '抓取会话ID，可选，不提供则返回所有活跃会话状态'
            }
        }
    },
    zodSchema: z.object({
        session_id: z.string().optional()
    })
};

/**
 * MCP 工具定义
 * 统一管理所有工具的定义和配置
 */

export const crawlWechatArticleToolDef = {
    name: 'crawl_wechat_article',
    description: '🕷️ [微信文章抓取器] 智能抓取单篇微信公众号文章 - 返回抓取指令给Cursor Agent，让Agent调用playwright-mcp执行实际抓取。',
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
        required: []
    }
};

export const crawlServerStatusToolDef = {
    name: 'crawl_server_status',
    description: '📊 [服务器状态] 获取Crawl MCP服务器的运行状态、性能指标和健康检查信息。',
    inputSchema: {
        type: 'object',
        properties: {
            include_details: {
                type: 'boolean',
                default: false,
                description: '是否包含详细的诊断信息'
            }
        },
        required: []
    }
};

/**
 * 可用的爬取工具数组
 */
export const CRAWL_TOOLS: MCPTool[] = [
    crawlArticleTool,
    crawlBatchTool,
    crawlStatusTool
];

/**
 * 根据名称获取工具定义
 */
export function getToolDefinition(name: string): MCPTool | undefined {
    return CRAWL_TOOLS.find(tool => tool.name === name);
}

/**
 * 获取所有工具名称
 */
export function getToolNames(): string[] {
    return CRAWL_TOOLS.map(tool => tool.name);
}

/**
 * 验证工具参数
 */
export function validateToolArguments(toolName: string, args: any): any {
    const tool = getToolDefinition(toolName);
    if (!tool) {
        throw new Error(`未知的工具: ${toolName}`);
    }
    
    try {
        return tool.zodSchema.parse(args);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
            throw new Error(`参数验证失败: ${messages.join(', ')}`);
        }
        throw error;
    }
}

/**
 * 获取工具的输入Schema
 */
export function getToolInputSchema(toolName: string): any {
    const tool = getToolDefinition(toolName);
    if (!tool) {
        throw new Error(`未知的工具: ${toolName}`);
    }
    return tool.inputSchema;
}

/**
 * 检查工具是否存在
 */
export function hasToolDefinition(name: string): boolean {
    return CRAWL_TOOLS.some(tool => tool.name === name);
}

/**
 * 获取工具的描述信息
 */
export function getToolDescription(name: string): string {
    const tool = getToolDefinition(name);
    return tool?.description || '未知工具';
}

/**
 * 获取所有工具的简要信息
 */
export function getToolsSummary(): Array<{
    name: string;
    description: string;
    requiredParams: string[];
}> {
    return CRAWL_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        requiredParams: tool.inputSchema.required || []
    }));
}

// 导出所有工具定义
export const allToolDefinitions = [
    crawlWechatArticleToolDef,
    crawlServerStatusToolDef
]; 