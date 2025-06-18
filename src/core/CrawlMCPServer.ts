import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    CallToolRequest,
    CallToolResult,
    ListToolsResult,
    Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { crawlWechatArticle } from '../tools/crawlArticleTool.js';
import { crawlServerStatus } from '../tools/crawlStatusTool.js';

/**
 * 微信文章抓取 MCP 服务器
 * 遵循官方MCP服务器标准实现
 */
export class CrawlMCPServer {
    private server: Server;
    private transport: StdioServerTransport | null = null;

    constructor() {
        this.server = new Server(
            {
                name: 'crawl-mcp-server',
                version: '1.1.7'
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        this.setupHandlers();
    }

    private setupHandlers(): void {
        // 列出工具
        this.server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
            return {
                tools: [
                    {
                        name: 'crawl_wechat_article',
                        description: '抓取微信公众号文章内容，支持自动图片下载和Markdown转换',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                url: {
                                    type: 'string',
                                    description: '微信文章URL'
                                }
                            },
                            required: ['url']
                        }
                    },
                    {
                        name: 'crawl_server_status',
                        description: '获取服务器状态信息',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                            additionalProperties: false
                        }
                    }
                ] as Tool[]
            };
        });

        // 处理工具调用
        this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
            try {
                switch (request.params.name) {
                    case 'crawl_wechat_article':
                        return await crawlWechatArticle(request);
                        
                    case 'crawl_server_status':
                        return await crawlServerStatus(request);
                        
                    default:
                        throw new Error(`未知的工具: ${request.params.name}`);
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
    }

    async start(): Promise<void> {
        this.transport = new StdioServerTransport();
        await this.server.connect(this.transport);
    }

    async stop(): Promise<void> {
        if (this.transport) {
            await this.transport.close();
            this.transport = null;
        }
    }
} 