import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CallOrchestrator } from './CallOrchestrator';
import { CRAWL_TOOLS, validateToolArguments } from '../tools/toolDefinitions';
import { Logger } from '../utils/Logger';
import { MCPToolResult, MCPContent, CrawlResult, BatchCrawlResult } from '../types';
import { DEFAULT_CONFIG } from '../config/defaultConfig';

/**
 * Crawl MCP 服务器主类
 * 负责处理 MCP 协议请求和工具调用
 */
export class CrawlMCPServer {
    private server: Server;
    private orchestrator: CallOrchestrator;
    private logger: Logger;
    private isRunning: boolean = false;

    constructor() {
        this.logger = new Logger('CrawlMCPServer');
        
        // 创建 MCP 服务器实例
        this.server = new Server(
            {
                name: DEFAULT_CONFIG.server.name,
                version: DEFAULT_CONFIG.server.version,
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        // 创建调用编排器
        this.orchestrator = new CallOrchestrator();

        // 设置请求处理程序
        this.setupHandlers();
    }

    /**
     * 设置 MCP 请求处理程序
     */
    private setupHandlers(): void {
        // 处理工具列表请求
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            this.logger.debug('收到工具列表请求');
            
            return {
                tools: CRAWL_TOOLS.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                })),
            };
        });

        // 处理工具调用请求
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            this.logger.info(`收到工具调用请求: ${name}`, args);

            try {
                // 验证工具参数
                const validatedArgs = validateToolArguments(name, args);
                
                // 调用相应的工具处理方法
                const result = await this.callTool(name, validatedArgs);
                
                this.logger.info(`工具调用完成: ${name}`, { success: !result.isError });
                return {
                    content: result.content,
                    isError: result.isError
                };
                
            } catch (error) {
                this.logger.error(`工具调用失败: ${name}`, error);
                
                const errorResult = this.createErrorResult(
                    error instanceof Error ? error.message : String(error)
                );
                return {
                    content: errorResult.content,
                    isError: errorResult.isError
                };
            }
        });
    }

    /**
     * 调用工具
     */
    private async callTool(name: string, args: any): Promise<MCPToolResult> {
        switch (name) {
            case 'crawl_wechat_article':
                return await this.handleCrawlWechatArticle(args);
                
            case 'crawl_wechat_batch':
                return await this.handleCrawlWechatBatch(args);
                
            case 'crawl_get_status':
                return await this.handleCrawlGetStatus(args);
                
            default:
                throw new Error(`未知的工具: ${name}`);
        }
    }

    /**
     * 处理单篇文章抓取
     */
    private async handleCrawlWechatArticle(args: {
        url: string;
        output_format?: 'markdown' | 'json';
        save_images?: boolean;
        clean_content?: boolean;
    }): Promise<MCPToolResult> {
        
        const result = await this.orchestrator.orchestrateWechatCrawl(args.url, {
            output_format: args.output_format || 'markdown',
            save_images: args.save_images !== false,
            clean_content: args.clean_content !== false,
            timeout: 30000,
            retry_attempts: 3,
            delay_between_steps: 1000
        });

        if (result.success) {
            return this.createSuccessResult(
                `✅ 微信文章抓取成功！\n\n` +
                `📄 **标题**: ${result.title}\n` +
                `👤 **作者**: ${result.author}\n` +
                `📅 **发布时间**: ${result.publish_time}\n` +
                `🔗 **原始链接**: ${result.url}\n` +
                `⏱️ **抓取耗时**: ${result.duration}ms\n` +
                `🆔 **会话ID**: ${result.session_id}\n\n` +
                `📝 **内容预览**:\n` +
                `${this.getContentPreview(result.content)}\n\n` +
                `💾 **保存路径**: ${result.file_path || '待实现'}`
            );
        } else {
            return this.createErrorResult(
                `❌ 微信文章抓取失败\n\n` +
                `🔗 **目标链接**: ${args.url}\n` +
                `❗ **错误信息**: ${result.error}\n` +
                `🆔 **会话ID**: ${result.session_id}`
            );
        }
    }

    /**
     * 处理批量文章抓取
     */
    private async handleCrawlWechatBatch(args: {
        urls: string[];
        concurrent_limit?: number;
        delay_seconds?: number;
        output_format?: 'markdown' | 'json';
        save_images?: boolean;
        stop_on_error?: boolean;
    }): Promise<MCPToolResult> {
        
        // TODO: 实现批量抓取逻辑
        // 这里先返回一个占位实现
        
        const results: CrawlResult[] = [];
        const concurrentLimit = args.concurrent_limit || 2;
        const delaySeconds = args.delay_seconds || 5;
        
        this.logger.info(`开始批量抓取 ${args.urls.length} 篇文章，并发限制: ${concurrentLimit}`);
        
        // 简单的顺序抓取实现（后续可以优化为真正的并发控制）
        for (let i = 0; i < args.urls.length; i++) {
            const url = args.urls[i];
            
            try {
                this.logger.info(`抓取进度: ${i + 1}/${args.urls.length} - ${url}`);
                
                const result = await this.orchestrator.orchestrateWechatCrawl(url, {
                    output_format: args.output_format || 'markdown',
                    save_images: args.save_images !== false,
                    clean_content: true,
                    timeout: 30000,
                    retry_attempts: 2, // 批量模式减少重试次数
                    delay_between_steps: 1000
                });
                
                results.push(result);
                
                if (!result.success && args.stop_on_error) {
                    this.logger.warn(`遇到错误且设置了停止模式，终止批量抓取`);
                    break;
                }
                
                // 添加延迟避免触发反爬虫
                if (i < args.urls.length - 1) {
                    await this.delay(delaySeconds * 1000);
                }
                
            } catch (error) {
                this.logger.error(`批量抓取单个URL失败: ${url}`, error);
                
                results.push({
                    success: false,
                    url,
                    title: '',
                    author: '',
                    publish_time: '',
                    content: '',
                    images: [],
                    file_path: '',
                    crawl_time: new Date(),
                    duration: 0,
                    error: error instanceof Error ? error.message : String(error)
                });
                
                if (args.stop_on_error) {
                    break;
                }
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.length - successCount;
        
        return this.createSuccessResult(
            `🔥 批量抓取完成！\n\n` +
            `📊 **统计信息**:\n` +
            `- 总数量: ${results.length}\n` +
            `- 成功: ${successCount}\n` +
            `- 失败: ${failedCount}\n` +
            `- 成功率: ${Math.round((successCount / results.length) * 100)}%\n\n` +
            `📝 **详细结果**:\n` +
            results.map((r, i) => 
                `${i + 1}. ${r.success ? '✅' : '❌'} ${r.title || r.url} ${r.success ? '' : `(${r.error})`}`
            ).join('\n')
        );
    }

    /**
     * 处理状态查询
     */
    private async handleCrawlGetStatus(args: {
        session_id?: string;
    }): Promise<MCPToolResult> {
        
        const stateManager = this.orchestrator.getStateManager();
        
        if (args.session_id) {
            // 查询特定会话状态
            const status = stateManager.getSessionStatus(args.session_id);
            
            if (!status) {
                return this.createErrorResult(`会话不存在: ${args.session_id}`);
            }
            
            return this.createSuccessResult(
                `📊 会话状态查询\n\n` +
                `🆔 **会话ID**: ${status.session_id}\n` +
                `🔗 **URL**: ${status.url}\n` +
                `📈 **状态**: ${this.getStatusEmoji(status.status)} ${status.status}\n` +
                `🔄 **当前步骤**: ${status.current_step}\n` +
                `📊 **进度**: ${status.progress}%\n` +
                `⏰ **开始时间**: ${status.start_time.toLocaleString()}\n` +
                `⏱️ **运行时长**: ${Math.round((status.duration || 0) / 1000)}秒\n` +
                `${status.error ? `❗ **错误**: ${status.error}` : ''}`
            );
        } else {
            // 查询所有会话状态
            const allStatuses = stateManager.getAllSessionStatus();
            const statistics = stateManager.getStatistics();
            
            return this.createSuccessResult(
                `📊 系统状态总览\n\n` +
                `📈 **统计信息**:\n` +
                `- 总会话数: ${statistics.totalSessions}\n` +
                `- 活跃会话: ${statistics.activeSessions}\n` +
                `- 已完成: ${statistics.completedSessions}\n` +
                `- 失败: ${statistics.failedSessions}\n\n` +
                `📋 **最近会话** (最多显示10个):\n` +
                allStatuses.slice(0, 10).map(status => 
                    `${this.getStatusEmoji(status.status)} ${status.session_id.substring(0, 8)} - ` +
                    `${status.current_step} (${status.progress}%)`
                ).join('\n') +
                (allStatuses.length > 10 ? `\n... 还有 ${allStatuses.length - 10} 个会话` : '')
            );
        }
    }

    /**
     * 获取状态表情符号
     */
    private getStatusEmoji(status: string): string {
        switch (status) {
            case 'pending': return '⏳';
            case 'running': return '🔄';
            case 'completed': return '✅';
            case 'failed': return '❌';
            case 'cancelled': return '⏹️';
            default: return '❓';
        }
    }

    /**
     * 获取内容预览
     */
    private getContentPreview(content: string, maxLength: number = 200): string {
        if (!content) return '(无内容)';
        
        // 移除HTML标签
        const textContent = content.replace(/<[^>]*>/g, '').trim();
        
        if (textContent.length <= maxLength) {
            return textContent;
        }
        
        return textContent.substring(0, maxLength) + '...';
    }

    /**
     * 创建成功结果
     */
    private createSuccessResult(text: string): MCPToolResult {
        const content: MCPContent[] = [
            {
                type: 'text',
                text: text
            }
        ];
        
        return { content };
    }

    /**
     * 创建错误结果
     */
    private createErrorResult(error: string): MCPToolResult {
        const content: MCPContent[] = [
            {
                type: 'text',
                text: `❌ 错误: ${error}`
            }
        ];
        
        return { content, isError: true };
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 启动服务器
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('服务器已在运行');
            return;
        }

        try {
            this.logger.info('启动 Crawl MCP 服务器...');
            
            // 初始化调用编排器
            await this.orchestrator.initialize();
            
            // 使用标准输入/输出传输
            const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
            const transport = new StdioServerTransport();
            await this.server.connect(transport);

            this.isRunning = true;
            this.logger.info('Crawl MCP 服务器启动成功');
            
        } catch (error) {
            this.logger.error('服务器启动失败', error);
            throw error;
        }
    }

    /**
     * 停止服务器
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        try {
            this.logger.info('停止 Crawl MCP 服务器...');
            
            await this.orchestrator.close();
            await this.server.close();
            
            this.isRunning = false;
            this.logger.info('Crawl MCP 服务器已停止');
            
        } catch (error) {
            this.logger.error('服务器停止时发生错误', error);
            throw error;
        }
    }

    /**
     * 获取工具定义
     */
    getToolDefinitions(): typeof CRAWL_TOOLS {
        return CRAWL_TOOLS;
    }

    /**
     * 获取特定工具定义
     */
    getToolDefinition(name: string): (typeof CRAWL_TOOLS)[0] | undefined {
        return CRAWL_TOOLS.find(tool => tool.name === name);
    }

    /**
     * 检查服务器是否运行
     */
    isServerRunning(): boolean {
        return this.isRunning;
    }
} 