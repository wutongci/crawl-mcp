import { Logger } from '../utils/Logger';
import { CrawlResult } from '../types/crawl.types';

/**
 * MCP输出适配器
 * 负责将抓取结果转换为MCP标准格式的输出
 * 
 * 设计原则：
 * - 保留所有emoji、markdown、中文字符
 * - 转换为MCP标准的content数组格式
 * - 提供统一的错误处理机制
 */
export class MCPOutputAdapter {
    private logger: Logger;
    private version: string = '1.0.0';

    constructor() {
        this.logger = new Logger('MCPOutputAdapter');
    }

    /**
     * 将爬取结果转换为MCP标准格式
     */
    convertToMCPFormat(input: any): MCPResponse {
        try {
            const text = this.normalizeInput(input);
            const sanitizedText = this.sanitizeText(text);
            
            return {
                content: [
                    {
                        type: 'text',
                        text: sanitizedText
                    }
                ]
            };
        } catch (error) {
            return this.handleError(error as Error);
        }
    }

    /**
     * 将爬取结果转换为富文本格式
     */
    convertCrawlResultToMCP(result: CrawlResult): MCPResponse {
        try {
            if (!result.success) {
                return this.handleError(result.error || '抓取失败');
            }

            const content = this.formatCrawlResultAsText(result);
            return {
                content: [
                    {
                        type: 'text',
                        text: content
                    }
                ]
            };
        } catch (error) {
            return this.handleError(error as Error);
        }
    }

    /**
     * 格式化抓取结果为富文本
     */
    private formatCrawlResultAsText(result: CrawlResult): string {
        const lines: string[] = [];
        
        // 标题部分
        lines.push('# 📄 微信文章抓取完成');
        lines.push('');
        
        // 基本信息
        lines.push('## 📊 基本信息');
        lines.push(`- **标题**: ${result.title}`);
        lines.push(`- **作者**: ${result.author}`);
        lines.push(`- **发布时间**: ${result.publish_time}`);
        lines.push(`- **抓取时间**: ${result.crawl_time.toLocaleString()}`);
        lines.push(`- **耗时**: ${Math.round(result.duration / 1000)}秒`);
        lines.push('');

        // 统计信息
        lines.push('## 📈 内容统计');
        lines.push(`- **内容长度**: ${result.content.length} 字符`);
        lines.push(`- **图片数量**: ${result.images.length} 张`);
        lines.push(`- **文件路径**: ${result.file_path}`);
        lines.push('');

        // 图片信息
        if (result.images.length > 0) {
            lines.push('## 🖼️ 图片信息');
            result.images.forEach((img, index) => {
                lines.push(`${index + 1}. **${img.filename}**`);
                lines.push(`   - 原始URL: ${img.original_url}`);
                lines.push(`   - 本地路径: ${img.local_path}`);
                lines.push(`   - 文件大小: ${Math.round(img.size / 1024)}KB`);
                lines.push(`   - 类型: ${img.mime_type}`);
            });
            lines.push('');
        }

        // 内容预览
        lines.push('## 📝 内容预览');
        const contentPreview = result.content.length > 500 
            ? result.content.substring(0, 500) + '...(内容已截断，完整内容已保存到文件)'
            : result.content;
        lines.push(contentPreview);

        // 操作提示
        lines.push('');
        lines.push('## ✅ 操作完成');
        lines.push(`文章已成功保存到: \`${result.file_path}\``);
        
        if (result.images.length > 0) {
            lines.push(`图片已下载到同目录下`);
        }

        return lines.join('\n');
    }

    /**
     * 将批量抓取结果转换为MCP格式
     */
    convertBatchResultToMCP(results: CrawlResult[]): MCPResponse {
        try {
            const content = this.formatBatchResultAsText(results);
            return {
                content: [
                    {
                        type: 'text',
                        text: content
                    }
                ]
            };
        } catch (error) {
            return this.handleError(error as Error);
        }
    }

    /**
     * 格式化批量抓取结果
     */
    private formatBatchResultAsText(results: CrawlResult[]): string {
        const lines: string[] = [];
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        // 标题
        lines.push('# 🔥 批量抓取完成');
        lines.push('');
        
        // 概览统计
        lines.push('## 📊 抓取概览');
        lines.push(`- **总计**: ${results.length} 篇文章`);
        lines.push(`- **成功**: ${successful.length} 篇`);
        lines.push(`- **失败**: ${failed.length} 篇`);
        lines.push(`- **成功率**: ${Math.round((successful.length / results.length) * 100)}%`);
        lines.push('');

        // 成功列表
        if (successful.length > 0) {
            lines.push('## ✅ 抓取成功');
            successful.forEach((result, index) => {
                lines.push(`${index + 1}. **${result.title}**`);
                lines.push(`   - 作者: ${result.author}`);
                lines.push(`   - 文件: ${result.file_path}`);
                lines.push(`   - 耗时: ${Math.round(result.duration / 1000)}秒`);
            });
            lines.push('');
        }

        // 失败列表
        if (failed.length > 0) {
            lines.push('## ❌ 抓取失败');
            failed.forEach((result, index) => {
                lines.push(`${index + 1}. ${result.url}`);
                lines.push(`   - 错误: ${result.error}`);
            });
            lines.push('');
        }

        // 汇总信息
        if (successful.length > 0) {
            const totalImages = successful.reduce((sum, r) => sum + r.images.length, 0);
            const totalContent = successful.reduce((sum, r) => sum + r.content.length, 0);
            
            lines.push('## 📈 汇总统计');
            lines.push(`- **总图片数**: ${totalImages} 张`);
            lines.push(`- **总内容量**: ${Math.round(totalContent / 1024)}KB`);
            lines.push(`- **平均文章长度**: ${Math.round(totalContent / successful.length)} 字符`);
        }

        return lines.join('\n');
    }

    /**
     * 标准化输入，将各种类型转换为字符串
     */
    private normalizeInput(input: any): string {
        // 处理null和undefined
        if (input === null) return 'null';
        if (input === undefined) return 'undefined';
        
        // 处理字符串
        if (typeof input === 'string') {
            return input;
        }
        
        // 处理抓取结果对象
        if (this.isCrawlResult(input)) {
            return this.formatCrawlResultAsText(input);
        }

        // 处理批量结果数组
        if (Array.isArray(input) && input.length > 0 && this.isCrawlResult(input[0])) {
            return this.formatBatchResultAsText(input);
        }
        
        // 处理有toString方法的对象
        if (input && typeof input.toString === 'function' && input.toString !== Object.prototype.toString) {
            return input.toString();
        }
        
        // 处理数组和普通对象
        if (typeof input === 'object') {
            return JSON.stringify(input, null, 2);
        }
        
        // 其他类型直接转换
        return String(input);
    }

    /**
     * 检查是否为爬取结果对象
     */
    private isCrawlResult(obj: any): obj is CrawlResult {
        return obj && 
               typeof obj === 'object' && 
               'success' in obj &&
               'url' in obj &&
               'title' in obj &&
               'content' in obj;
    }

    /**
     * 清理文本，确保JSON兼容性但保留所有格式
     */
    private sanitizeText(text: string): string {
        // 对于MCP协议，我们实际上不需要做任何转义
        // emoji、中文字符、markdown都应该保留
        // MCP的content格式本身就支持UTF-8字符
        return text;
    }

    /**
     * 统一的错误处理
     */
    private handleError(error: Error | string): MCPErrorResponse {
        const errorMessage = error instanceof Error 
            ? error.message 
            : String(error);
        
        this.logger.error(`MCP输出适配器错误: ${errorMessage}`);

        return {
            content: [
                {
                    type: 'text',
                    text: `❌ 执行失败: ${errorMessage}`
                }
            ],
            isError: true
        };
    }

    /**
     * 验证输出格式是否符合MCP标准
     */
    validateMCPFormat(output: any): boolean {
        if (!output || typeof output !== 'object') {
            return false;
        }
        
        if (!Array.isArray(output.content)) {
            return false;
        }
        
        return output.content.every((item: any) => 
            item && 
            typeof item === 'object' && 
            item.type === 'text' && 
            typeof item.text === 'string'
        );
    }

    /**
     * 创建成功响应的快捷方法
     */
    createSuccessResponse(text: string): MCPResponse {
        return this.convertToMCPFormat(text);
    }

    /**
     * 创建错误响应的快捷方法
     */
    createErrorResponse(message: string): MCPErrorResponse {
        return this.handleError(message);
    }

    /**
     * 创建状态响应
     */
    createStatusResponse(status: any): MCPResponse {
        const statusText = this.formatStatusAsText(status);
        return {
            content: [
                {
                    type: 'text',
                    text: statusText
                }
            ]
        };
    }

    /**
     * 格式化状态信息
     */
    private formatStatusAsText(status: any): string {
        if (!status) {
            return '❌ 无状态信息';
        }

        const lines: string[] = [];
        lines.push('# 📊 抓取状态查询');
        lines.push('');

        if (status.success === false) {
            lines.push(`❌ 查询失败: ${status.error}`);
            return lines.join('\n');
        }

        // 全局状态
        if (status.global_status) {
            const global = status.global_status;
            lines.push('## 🌐 系统状态');
            lines.push(`- **活跃会话**: ${global.active_sessions}`);
            lines.push(`- **今日会话**: ${global.total_sessions_today}`);
            lines.push(`- **今日抓取**: ${global.total_articles_crawled_today}`);
            lines.push(`- **运行时间**: ${Math.round(global.system_uptime / 60000)} 分钟`);
            
            if (global.memory_usage) {
                lines.push(`- **内存使用**: ${global.memory_usage.percentage}%`);
            }
            
            lines.push('');
            lines.push('## 📈 性能统计');
            lines.push(`- **平均耗时**: ${Math.round(global.performance_stats.average_crawl_time / 1000)}秒`);
            lines.push(`- **成功率**: ${global.performance_stats.success_rate}%`);
            lines.push(`- **总抓取数**: ${global.performance_stats.total_crawls}`);
            lines.push('');
        }

        // 会话状态
        if (status.sessions && status.sessions.length > 0) {
            lines.push('## 🔄 活跃会话');
            status.sessions.forEach((session: any, index: number) => {
                            const statusIconMap = {
                'running': '🟡',
                'completed': '✅',
                'failed': '❌',
                'cancelled': '⏹️'
            } as const;
            const statusIcon = statusIconMap[session.status as keyof typeof statusIconMap] || '❓';

                lines.push(`${index + 1}. ${statusIcon} **${session.session_id}** (${session.type})`);
                lines.push(`   - 状态: ${session.status}`);
                lines.push(`   - 进度: ${session.result_summary.completed_urls}/${session.result_summary.total_urls}`);
                lines.push(`   - 成功率: ${session.result_summary.success_rate}%`);
                
                if (session.current_operation) {
                    lines.push(`   - 当前操作: ${session.current_operation}`);
                }
            });
        } else {
            lines.push('## 🔄 当前无活跃会话');
        }

        return lines.join('\n');
    }

    /**
     * 获取适配器版本
     */
    getVersion(): string {
        return this.version;
    }
}

/**
 * MCP响应接口
 */
export interface MCPResponse {
    content: Array<{
        type: 'text';
        text: string;
    }>;
}

/**
 * MCP错误响应接口
 */
export interface MCPErrorResponse extends MCPResponse {
    isError: true;
} 