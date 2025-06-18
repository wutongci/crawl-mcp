#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    CallToolRequest,
    CallToolResult,
    ListToolsResult,
    ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { crawlWechatArticle } from './tools/crawlArticleTool.js';
import { crawlServerStatus } from './tools/crawlStatusTool.js';

// 输入参数 Schema
const CrawlWechatArticleArgsSchema = z.object({
    url: z.string().describe('微信文章完整URL，支持mp.weixin.qq.com格式'),
    clean_content: z.boolean().default(true).describe('是否自动清理广告和无关内容'),
    save_images: z.boolean().default(true).describe('是否下载并本地化图片资源'),
    output_format: z.enum(['markdown', 'json']).default('markdown').describe('输出格式：markdown为标准文档格式，json为结构化数据格式'),
    strategy: z.enum(['basic', 'conservative', 'fast']).default('basic').describe('抓取策略：basic为平衡模式，conservative为稳定模式，fast为快速模式'),
    timeout: z.number().default(30000).describe('单步操作超时时间（毫秒，范围5000-120000）')
});

const CrawlServerStatusArgsSchema = z.object({});

type ToolInput = z.infer<typeof ToolSchema.shape.inputSchema>;

// 服务器设置
const server = new Server(
    {
        name: 'crawl-mcp-server',
        version: '1.1.8'
    },
    {
        capabilities: {
            tools: {}
        }
    }
);

// 工具定义处理器
server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
    return {
        tools: [
            {
                name: 'crawl_wechat_article',
                description: '🕷️ [微信文章抓取器] 智能抓取单篇微信公众号文章 - 返回抓取指令给Cursor Agent，让Agent调用playwright-mcp执行实际抓取。',
                inputSchema: zodToJsonSchema(CrawlWechatArticleArgsSchema) as ToolInput
            },
            {
                name: 'crawl_server_status',
                description: '📊 获取抓取服务器状态信息和运行统计',
                inputSchema: zodToJsonSchema(CrawlServerStatusArgsSchema) as ToolInput
            }
        ]
    };
});

// 工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
    try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
            case 'crawl_wechat_article':
                return await crawlWechatArticle(request);
                
            case 'crawl_server_status':
                return await crawlServerStatus(request);
                
            default:
                throw new Error(`未知的工具: ${name}`);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        return {
            content: [{
                type: 'text',
                text: `错误: ${errorMessage}`
            }],
            isError: true
        };
    }
});

// 启动服务器
async function runServer(): Promise<void> {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // 向 stderr 输出启动信息（MCP 协议要求）
    console.error('Crawl MCP Server started');
    console.error('Version: 1.1.7');
    console.error('Tools: crawl_wechat_article, crawl_server_status');
}

// 主程序
runServer().catch((error) => {
    console.error('Fatal error running server:', error);
    process.exit(1);
}); 