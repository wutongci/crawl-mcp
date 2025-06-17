import { z } from 'zod';

/**
 * MCP 工具定义接口
 */
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: MCPInputSchema;
    zodSchema: z.ZodSchema;
}

/**
 * MCP 输入模式
 */
export interface MCPInputSchema {
    type: 'object';
    properties: Record<string, MCPProperty>;
    required?: string[];
}

/**
 * MCP 属性定义
 */
export interface MCPProperty {
    type: string;
    description?: string;
    enum?: string[];
    default?: any;
    items?: MCPProperty;
}

/**
 * MCP 工具调用结果
 */
export interface MCPToolResult {
    content: MCPContent[];
    isError?: boolean;
}

/**
 * MCP 内容格式
 */
export interface MCPContent {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
}

/**
 * MCP 工具调用请求
 */
export interface MCPToolCallRequest {
    name: string;
    arguments: Record<string, any>;
}

/**
 * MCP 客户端配置
 */
export interface MCPClientConfig {
    serverPath: string;
    serverArgs: string[];
    env?: Record<string, string>;
    timeout?: number;
}

/**
 * MCP 服务器信息
 */
export interface MCPServerInfo {
    name: string;
    version: string;
    capabilities: MCPServerCapabilities;
}

/**
 * MCP 服务器能力
 */
export interface MCPServerCapabilities {
    tools?: {
        listChanged?: boolean;
    };
    resources?: {
        subscribe?: boolean;
        listChanged?: boolean;
    };
    prompts?: {
        listChanged?: boolean;
    };
}

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 健康检查状态
 */
export interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    checks: HealthCheck[];
    timestamp: Date;
}

/**
 * 健康检查项
 */
export interface HealthCheck {
    name: string;
    healthy: boolean;
    error?: string;
    metadata?: Record<string, any>;
} 