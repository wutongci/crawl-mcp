import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { crawlWechatArticle } from '../tools/crawlArticleTool.js';
import { crawlServerStatus } from '../tools/crawlStatusTool.js';
import { allToolDefinitions } from '../tools/toolDefinitions.js';
import { Logger } from '../utils/Logger.js';

/**
 * 微信文章抓取 MCP 服务器
 * 提供指令给Cursor Agent，让Agent调用playwright-mcp执行实际抓取
 * 
 * 严格遵循 Cursor MCP 协议规范
 */
export class CrawlMCPServer {
    private server: Server;
    private logger: Logger;
    private transport: StdioServerTransport | null = null;
    private isRunning: boolean = false;
    private startTime: number = 0;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private requestCount: number = 0;
    private errorCount: number = 0;
    private lastActivityTime: number = 0;

    constructor() {
        this.logger = new Logger('CrawlMCPServer');
        
        // 创建MCP服务器 - 严格按照Cursor要求
        this.server = new Server(
            {
                name: 'crawl-mcp-server',
                version: '1.1.6'
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        this.setupToolHandlers();
        this.setupConnectionHandlers();
        this.setupProcessHandlers();
    }

    /**
     * 设置连接处理器 - 专门针对Cursor的stdio传输
     */
    private setupConnectionHandlers(): void {
        // 监听服务器错误 - 避免自动重启影响Cursor连接
        this.server.onerror = (error) => {
            this.logger.error('MCP服务器错误:', error);
            this.errorCount++;
            
            // 不要自动重启，让Cursor管理连接生命周期
            if (this.errorCount > 50) { // 提高阈值
                this.logger.error('错误过多，将停止服务器');
                this.stop().catch(() => {
                    process.exit(1);
                });
            }
        };

        // 监听连接关闭
        this.server.onclose = () => {
            this.logger.info('MCP连接已关闭');
            this.isRunning = false;
            this.cleanup();
        };
    }

    /**
     * 设置进程处理器 - 优化用于Cursor环境
     */
    private setupProcessHandlers(): void {
        // 简化的优雅关闭处理
        const gracefulShutdown = async (signal: string) => {
            this.logger.info(`收到${signal}信号，开始关闭...`);
            try {
                await this.stop();
                process.exit(0);
            } catch (error) {
                this.logger.error('关闭失败:', error);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        // 简化异常处理 - 避免干扰stdio通信
        process.on('uncaughtException', (error) => {
            this.logger.error('未捕获的异常:', error);
            this.errorCount++;
            
            // 只在严重错误时退出
            if (error.name === 'OutOfMemoryError') {
                this.stop().finally(() => process.exit(1));
            }
        });

        process.on('unhandledRejection', (reason) => {
            this.logger.error('未处理的Promise拒绝:', reason);
            this.errorCount++;
        });

        // 简化内存监控 - 减少日志输出
        if (process.env.MCP_MEMORY_MONITOR === 'true') {
            setInterval(() => {
                const memUsage = process.memoryUsage();
                const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
                
                // 只在内存过高时记录
                if (heapUsedMB > 1000) {
                    this.logger.warn(`内存使用过高: ${heapUsedMB}MB`);
                    
                    if (global.gc) {
                        global.gc();
                        this.logger.info('已执行垃圾回收');
                    }
                }
            }, 120000); // 降低频率到2分钟
        }
    }

    /**
     * 设置工具处理器 - 确保与Cursor完全兼容
     */
    private setupToolHandlers(): void {
        // 列出可用工具
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            this.logger.debug('收到工具列表请求');
            this.updateActivity();
            
            return {
                tools: allToolDefinitions
            };
        });

        // 处理工具调用 - 严格按照MCP协议
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            this.requestCount++;
            this.updateActivity();
            
            this.logger.info(`收到工具调用请求 #${this.requestCount}: ${request.params.name}`);
            
            try {
                let result;
                
                switch (request.params.name) {
                    case 'crawl_wechat_article':
                        // 确保参数正确传递
                        const modifiedRequest = {
                            ...request,
                            params: {
                                ...request.params,
                                ...(request.params.arguments || {})
                            }
                        };
                        result = await crawlWechatArticle(modifiedRequest);
                        break;
                        
                    case 'crawl_server_status':
                        result = await crawlServerStatus(request);
                        break;
                        
                    default:
                        // 返回标准MCP错误格式
                        return {
                            content: [{
                                type: 'text',
                                text: `❌ 未知的工具: ${request.params.name}`
                            }],
                            isError: true
                        };
                }
                
                this.logger.info(`工具调用完成 #${this.requestCount}`);
                return result;
                
            } catch (error) {
                this.errorCount++;
                this.logger.error(`工具调用失败 #${this.requestCount}:`, error);
                
                // 确保错误响应符合MCP格式
                const errorMessage = error instanceof Error ? error.message : '未知错误';
                return {
                    content: [{
                        type: 'text',
                        text: `❌ 工具调用失败: ${errorMessage}`
                    }],
                    isError: true
                };
            }
        });
    }

    /**
     * 更新活动时间
     */
    private updateActivity(): void {
        this.lastActivityTime = Date.now();
    }

    /**
     * 启动心跳监控 - 优化用于Cursor环境
     */
    private startHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // 大幅降低心跳频率，避免干扰Cursor
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const uptimeMinutes = Math.round((now - this.startTime) / 60000);
            
            // 只在调试模式下输出详细信息
            if (process.env.MCP_DEBUG === 'true' && uptimeMinutes % 10 === 0) {
                this.logger.debug(`服务器运行正常 - ${uptimeMinutes}分钟, 请求: ${this.requestCount}, 错误: ${this.errorCount}`);
            }
            
            // 重置错误计数（每2小时）
            if (uptimeMinutes % 120 === 0 && uptimeMinutes > 0) {
                this.errorCount = Math.max(0, this.errorCount - 10);
            }
            
        }, 300000); // 5分钟一次，大幅降低频率
    }

    /**
     * 启动服务器 - 严格按照Cursor MCP规范
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('服务器已在运行中');
            return;
        }

        try {
            this.logger.info('启动微信文章抓取 MCP 服务器...');
            this.startTime = Date.now();
            this.updateActivity();
            
            // 创建stdio传输 - Cursor默认使用stdio
            this.transport = new StdioServerTransport();
            
            // 连接到传输层
            await this.server.connect(this.transport);
            
            this.isRunning = true;
            this.startHeartbeat();
            
            this.logger.info('MCP 服务器已启动并连接到Cursor');
            
        } catch (error) {
            this.logger.error('服务器启动失败:', error);
            this.cleanup();
            throw error;
        }
    }

    /**
     * 清理资源
     */
    private cleanup(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        this.transport = null;
        this.isRunning = false;
    }

    /**
     * 停止服务器
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        this.logger.info('停止 MCP 服务器...');
        
        try {
            this.cleanup();
            
            if (this.server) {
                await this.server.close();
            }
            
            const uptimeMinutes = Math.round((Date.now() - this.startTime) / 60000);
            this.logger.info(`服务器已停止 - 运行: ${uptimeMinutes}分钟, 请求: ${this.requestCount}个`);
            
        } catch (error) {
            this.logger.error('停止服务器时发生错误:', error);
            throw error;
        }
    }

    /**
     * 获取服务器状态
     */
    getStatus(): {
        isRunning: boolean;
        startTime: number;
        requestCount: number;
        errorCount: number;
        lastActivityTime: number;
        uptimeMinutes: number;
    } {
        return {
            isRunning: this.isRunning,
            startTime: this.startTime,
            requestCount: this.requestCount,
            errorCount: this.errorCount,
            lastActivityTime: this.lastActivityTime,
            uptimeMinutes: Math.round((Date.now() - this.startTime) / 60000)
        };
    }
} 