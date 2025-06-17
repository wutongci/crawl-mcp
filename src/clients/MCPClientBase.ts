import { Logger } from '../utils/Logger';

/**
 * MCP调用结果接口
 */
export interface MCPCallResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: Record<string, any>;
}

/**
 * MCP客户端配置接口
 */
export interface MCPClientConfig {
    serverName: string;
    serverUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    debug?: boolean;
}

/**
 * MCP工具调用参数接口
 */
export interface MCPToolCall {
    toolName: string;
    arguments: Record<string, any>;
    timeout?: number;
}

/**
 * MCP客户端基类
 * 为所有MCP客户端提供通用功能和接口
 */
export abstract class MCPClientBase {
    protected logger: Logger;
    protected config: MCPClientConfig;
    protected isConnected: boolean = false;
    protected lastCallTime: number = 0;
    protected callStats: {
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        averageResponseTime: number;
    } = {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0
    };

    constructor(config: MCPClientConfig) {
        this.config = {
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            debug: false,
            ...config
        };
        this.logger = new Logger(`MCPClient:${this.config.serverName}`);
    }

    /**
     * 初始化客户端连接
     */
    abstract initialize(): Promise<void>;

    /**
     * 调用MCP工具
     */
    abstract callTool<T = any>(toolCall: MCPToolCall): Promise<MCPCallResult<T>>;

    /**
     * 获取可用工具列表
     */
    abstract getAvailableTools(): Promise<string[]>;

    /**
     * 关闭客户端连接
     */
    abstract close(): Promise<void>;

    /**
     * 检查连接状态
     */
    isReady(): boolean {
        return this.isConnected;
    }

    /**
     * 获取客户端配置
     */
    getConfig(): MCPClientConfig {
        return { ...this.config };
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<MCPClientConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('客户端配置已更新');
    }

    /**
     * 获取调用统计信息
     */
    getCallStats(): {
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        successRate: number;
        averageResponseTime: number;
    } {
        const successRate = this.callStats.totalCalls > 0 
            ? Math.round((this.callStats.successfulCalls / this.callStats.totalCalls) * 100)
            : 0;

        return {
            ...this.callStats,
            successRate
        };
    }

    /**
     * 重置统计信息
     */
    resetStats(): void {
        this.callStats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageResponseTime: 0
        };
        this.logger.info('统计信息已重置');
    }

    /**
     * 带重试的工具调用
     */
    protected async callWithRetry<T = any>(
        toolCall: MCPToolCall,
        retryAttempts: number = this.config.retryAttempts || 3,
        retryDelay: number = this.config.retryDelay || 1000
    ): Promise<MCPCallResult<T>> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
                this.logger.debug(`调用工具 ${toolCall.toolName}，第 ${attempt}/${retryAttempts} 次尝试`);
                
                const startTime = Date.now();
                const result = await this.callTool<T>(toolCall);
                const responseTime = Date.now() - startTime;
                
                // 更新统计信息
                this.updateCallStats(result.success, responseTime);
                
                if (result.success) {
                    this.logger.debug(`工具调用成功: ${toolCall.toolName} (${responseTime}ms)`);
                    return result;
                }
                
                lastError = new Error(result.error || '工具调用失败');
                this.logger.warn(`工具调用第 ${attempt} 次失败: ${toolCall.toolName}`, lastError);

            } catch (error) {
                lastError = error instanceof Error ? error : new Error('未知错误');
                this.logger.warn(`工具调用第 ${attempt} 次异常: ${toolCall.toolName}`, lastError);
            }

            // 如果不是最后一次尝试，等待重试延迟
            if (attempt < retryAttempts && retryDelay > 0) {
                await this.delay(retryDelay);
            }
        }

        // 所有重试都失败了
        this.updateCallStats(false, 0);
        this.logger.error(`工具调用最终失败: ${toolCall.toolName}，尝试次数: ${retryAttempts}`, lastError);
        
        return {
            success: false,
            error: lastError?.message || '工具调用失败'
        };
    }

    /**
     * 带超时的工具调用
     */
    protected async callWithTimeout<T = any>(
        toolCall: MCPToolCall,
        timeout: number = this.config.timeout || 30000
    ): Promise<MCPCallResult<T>> {
        const timeoutPromise = new Promise<MCPCallResult<T>>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`工具调用超时: ${toolCall.toolName} (${timeout}ms)`));
            }, timeout);
        });

        try {
            const callPromise = this.callTool<T>(toolCall);
            return await Promise.race([callPromise, timeoutPromise]);
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '工具调用超时'
            };
        }
    }

    /**
     * 验证工具调用参数
     */
    protected validateToolCall(toolCall: MCPToolCall): boolean {
        if (!toolCall.toolName || typeof toolCall.toolName !== 'string') {
            this.logger.error('工具名称无效');
            return false;
        }

        if (!toolCall.arguments || typeof toolCall.arguments !== 'object') {
            this.logger.error('工具参数无效');
            return false;
        }

        return true;
    }

    /**
     * 更新调用统计
     */
    protected updateCallStats(success: boolean, responseTime: number): void {
        this.callStats.totalCalls++;
        
        if (success) {
            this.callStats.successfulCalls++;
        } else {
            this.callStats.failedCalls++;
        }

        // 计算平均响应时间
        if (responseTime > 0) {
            const totalResponseTime = this.callStats.averageResponseTime * (this.callStats.totalCalls - 1) + responseTime;
            this.callStats.averageResponseTime = Math.round(totalResponseTime / this.callStats.totalCalls);
        }
    }

    /**
     * 获取客户端状态信息
     */
    getStatus(): {
        clientName: string;
        isConnected: boolean;
        lastCallTime: Date | null;
        stats: {
            totalCalls: number;
            successfulCalls: number;
            failedCalls: number;
            successRate: number;
            averageResponseTime: number;
        };
        config: MCPClientConfig;
    } {
        return {
            clientName: this.config.serverName,
            isConnected: this.isConnected,
            lastCallTime: this.lastCallTime > 0 ? new Date(this.lastCallTime) : null,
            stats: this.getCallStats(),
            config: this.getConfig()
        };
    }

    /**
     * 健康检查
     */
    async healthCheck(): Promise<{
        healthy: boolean;
        responseTime?: number;
        error?: string;
    }> {
        try {
            const startTime = Date.now();
            
            // 尝试获取可用工具列表作为健康检查
            await this.getAvailableTools();
            
            const responseTime = Date.now() - startTime;
            
            return {
                healthy: true,
                responseTime
            };

        } catch (error) {
            return {
                healthy: false,
                error: error instanceof Error ? error.message : '健康检查失败'
            };
        }
    }

    /**
     * 延迟函数
     */
    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 格式化错误信息
     */
    protected formatError(error: any): string {
        if (error instanceof Error) {
            return error.message;
        }
        
        if (typeof error === 'string') {
            return error;
        }
        
        if (typeof error === 'object' && error !== null) {
            return JSON.stringify(error);
        }
        
        return '未知错误';
    }

    /**
     * 记录工具调用
     */
    protected logToolCall(toolCall: MCPToolCall, result: MCPCallResult, duration: number): void {
        const level = result.success ? 'info' : 'error';
        const message = `工具调用 ${toolCall.toolName} ${result.success ? '成功' : '失败'} (${duration}ms)`;
        
        if (this.config.debug) {
            if (level === 'error') {
                this.logger.error(message, {
                    toolName: toolCall.toolName,
                    arguments: toolCall.arguments,
                    result: result.success ? '成功' : result.error,
                    duration
                });
            } else {
                this.logger.info(message, {
                    toolName: toolCall.toolName,
                    arguments: toolCall.arguments,
                    result: result.success ? '成功' : result.error,
                    duration
                });
            }
        } else {
            if (level === 'error') {
                this.logger.error(message);
            } else {
                this.logger.info(message);
            }
        }
    }

    /**
     * 清理资源
     */
    protected async cleanup(): Promise<void> {
        this.isConnected = false;
        this.logger.info(`MCP客户端 ${this.config.serverName} 清理完成`);
    }
} 