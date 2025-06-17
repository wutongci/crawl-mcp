// 基础 MCP 相关类型
export interface MCPContent {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
}

export interface MCPToolResult {
    content: MCPContent[];
    isError?: boolean;
}

// 基础 MCP 工具接口
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: any;
    zodSchema?: any;
}

// 抓取相关基础类型
export interface CrawlConfig {
    output_format: 'markdown' | 'json';
    save_images: boolean;
    clean_content: boolean;
    strategy: 'basic' | 'conservative' | 'fast';
    timeout: number;
}

export interface CrawlResult {
    success: boolean;
    url: string;
    title: string;
    author: string;
    publish_time: string;
    content: string;
    images: string[];
    file_path: string;
    crawl_time: Date;
    duration: number;
    error?: string;
    session_id?: string;
} 