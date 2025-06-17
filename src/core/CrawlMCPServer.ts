import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { crawlWechatArticle } from '../tools/crawlArticleTool.js';
import { Logger } from '../utils/Logger.js';

// 简化的工具定义
const crawlWechatArticleToolDef = {
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
        required: ['url']
    }
};

/**
 * 微信文章抓取 MCP 服务器
 * 提供指令给Cursor Agent，让Agent调用playwright-mcp执行实际抓取
 */
export class CrawlMCPServer {
    private server: Server;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('CrawlMCPServer');
        
        // 创建MCP服务器
        this.server = new Server(
            {
                name: 'crawl-mcp-server',
                version: '1.0.3'
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        this.setupToolHandlers();
    }

    /**
     * 设置工具处理器
     */
    private setupToolHandlers(): void {
        // 列出可用工具
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            this.logger.debug('收到工具列表请求');
            return {
                tools: [crawlWechatArticleToolDef]
            };
        });

        // 处理工具调用
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            this.logger.info(`收到工具调用请求: ${request.params.name}`);
            
            switch (request.params.name) {
                case 'crawl_wechat_article':
                    return await crawlWechatArticle(request);
                    
                default:
                    throw new Error(`未知的工具: ${request.params.name}`);
            }
        });
    }

    /**
     * 启动服务器
     */
    async start(): Promise<void> {
        this.logger.info('启动微信文章抓取 MCP 服务器...');
        
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        
        this.logger.info('MCP 服务器已启动，等待连接...');
    }

    /**
     * 停止服务器
     */
    async stop(): Promise<void> {
        this.logger.info('停止 MCP 服务器...');
        await this.server.close();
    }
} 