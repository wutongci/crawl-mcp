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
        
        // 创建MCP服务器
        this.server = new Server(
            {
                name: 'crawl-mcp-server',
                version: '1.1.5'
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        this.setupToolHandlers();
        this.setupErrorHandlers();
        this.setupProcessHandlers();
    }

    /**
     * 设置错误处理器
     */
    private setupErrorHandlers(): void {
        // 监听服务器错误
        this.server.onerror = (error) => {
            this.logger.error('MCP服务器错误:', error);
            this.errorCount++;
            
            // 如果错误过多，尝试重启
            if (this.errorCount > 10) {
                this.logger.warn('错误过多，准备重启服务器...');
                this.restart().catch(err => {
                    this.logger.error('重启失败:', err);
                });
            }
        };

        // 监听连接错误
        this.server.onclose = () => {
            this.logger.info('MCP连接已关闭');
            this.isRunning = false;
            this.cleanup();
        };
    }

    /**
     * 设置进程处理器
     */
    private setupProcessHandlers(): void {
        // 优雅关闭处理
        const gracefulShutdown = async (signal: string) => {
            this.logger.info(`收到${signal}信号，开始优雅关闭...`);
            try {
                await this.stop();
                process.exit(0);
            } catch (error) {
                this.logger.error('优雅关闭失败:', error);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

        // 未捕获异常处理
        process.on('uncaughtException', (error) => {
            this.logger.error('未捕获的异常:', error);
            this.errorCount++;
            
            // 严重错误时退出
            if (error.name === 'OutOfMemoryError' || this.errorCount > 20) {
                this.logger.error('严重错误，准备退出进程');
                this.stop().finally(() => process.exit(1));
            }
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('未处理的Promise拒绝:', { reason, promise });
            this.errorCount++;
        });

        // 内存监控
        if (process.env.MCP_MEMORY_MONITOR === 'true') {
            setInterval(() => {
                const memUsage = process.memoryUsage();
                const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
                
                if (heapUsedMB > 500) { // 超过500MB警告
                    this.logger.warn(`内存使用过高: ${heapUsedMB}MB`);
                    
                    if (heapUsedMB > 1000) { // 超过1GB强制GC
                        if (global.gc) {
                            global.gc();
                            this.logger.info('已执行垃圾回收');
                        }
                    }
                }
            }, 30000); // 每30秒检查一次
        }
    }

    /**
     * 设置工具处理器
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

        // 处理工具调用
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            this.requestCount++;
            this.updateActivity();
            
            this.logger.info(`收到工具调用请求 #${this.requestCount}: ${request.params.name}`);
            this.logger.debug(`请求参数: ${JSON.stringify(request.params, null, 2)}`);
            
            try {
                switch (request.params.name) {
                    case 'crawl_wechat_article':
                        // 重新构造request，确保参数在正确的位置
                        const modifiedRequest = {
                            ...request,
                            params: {
                                ...request.params,
                                ...(request.params.arguments || {})
                            }
                        };
                        const result = await crawlWechatArticle(modifiedRequest);
                        this.logger.info(`工具调用完成 #${this.requestCount}`);
                        return result;
                        
                    case 'crawl_server_status':
                        const statusResult = await crawlServerStatus(request);
                        this.logger.info(`状态检查完成 #${this.requestCount}`);
                        return statusResult;
                        
                    default:
                        throw new Error(`未知的工具: ${request.params.name}`);
                }
            } catch (error) {
                this.errorCount++;
                this.logger.error(`工具调用失败 #${this.requestCount}:`, error);
                
                // 返回标准错误格式
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
     * 启动心跳监控
     */
    private startHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceActivity = now - this.lastActivityTime;
            const uptimeMinutes = Math.round((now - this.startTime) / 60000);
            
            // 记录心跳日志（仅在调试模式下）
            if (process.env.MCP_DEBUG === 'true') {
                this.logger.debug(`心跳检查 - 运行时间: ${uptimeMinutes}分钟, 请求数: ${this.requestCount}, 错误数: ${this.errorCount}`);
            }
            
            // 检查空闲时间（超过30分钟无活动时记录）
            if (timeSinceActivity > 30 * 60 * 1000) { // 30分钟
                this.logger.info(`服务器空闲 ${Math.round(timeSinceActivity / 60000)} 分钟`);
            }
            
            // 重置错误计数（每小时）
            if (uptimeMinutes % 60 === 0 && uptimeMinutes > 0) {
                this.errorCount = Math.max(0, this.errorCount - 5); // 逐渐减少错误计数
            }
            
        }, 60000); // 每分钟检查一次
    }

    /**
     * 启动服务器
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
            
            this.transport = new StdioServerTransport();
            await this.server.connect(this.transport);
            
            this.isRunning = true;
            this.startHeartbeat();
            
            this.logger.info('MCP 服务器已启动，等待连接...');
            this.logger.info(`进程 PID: ${process.pid}`);
            
        } catch (error) {
            this.logger.error('服务器启动失败:', error);
            this.cleanup();
            throw error;
        }
    }

    /**
     * 重启服务器
     */
    async restart(): Promise<void> {
        this.logger.info('重启MCP服务器...');
        
        try {
            await this.stop();
            // 等待一段时间后重启
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.start();
            
            this.logger.info('服务器重启成功');
        } catch (error) {
            this.logger.error('服务器重启失败:', error);
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
            this.logger.debug('服务器未在运行');
            return;
        }

        this.logger.info('停止 MCP 服务器...');
        
        try {
            this.cleanup();
            
            if (this.server) {
                await this.server.close();
            }
            
            const uptimeMinutes = Math.round((Date.now() - this.startTime) / 60000);
            this.logger.info(`服务器已停止 - 运行时间: ${uptimeMinutes}分钟, 处理请求: ${this.requestCount}个`);
            
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