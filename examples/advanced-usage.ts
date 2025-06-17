/**
 * 高级使用示例
 * 展示微信文章抓取MCP服务器的高级功能和使用模式
 */

import { MCPToolResult } from '../src/types';

// 模拟MCP调用请求
interface MockMCPRequest {
    method: string;
    params: {
        name: string;
        arguments: any;
    };
}

/**
 * 高级使用示例类
 */
class AdvancedUsageExample {
    /**
     * 示例1：自定义抓取配置
     */
    async example1_CustomCrawlOptions() {
        console.log('\n🔥 示例1：自定义抓取配置');
        
        const request: MockMCPRequest = {
            method: 'tools/call',
            params: {
                name: 'crawl_wechat_article',
                arguments: {
                    url: 'https://mp.weixin.qq.com/s/example-article-url',
                    options: {
                        output_format: 'json',           // JSON格式输出
                        save_images: true,               // 保存图片
                        clean_content: true,             // 清理内容
                        timeout: 60000,                  // 60秒超时
                        retry_attempts: 5,               // 重试5次
                        delay_between_steps: 2000        // 步骤间延迟2秒
                    }
                }
            }
        };

        try {
            console.log('📋 请求参数:', JSON.stringify(request.params, null, 2));
            
            const result = await this.mockCall(request);
            console.log('✅ 抓取成功:', result.summary);
            
        } catch (error) {
            console.error('❌ 抓取失败:', error);
        }
    }

    /**
     * 示例2：批量抓取与并发控制
     */
    async example2_BatchCrawlWithConcurrency() {
        console.log('\n🔥 示例2：批量抓取与并发控制');
        
        const urls = [
            'https://mp.weixin.qq.com/s/article1',
            'https://mp.weixin.qq.com/s/article2',
            'https://mp.weixin.qq.com/s/article3',
            'https://mp.weixin.qq.com/s/article4',
            'https://mp.weixin.qq.com/s/article5'
        ];

        const request: MockMCPRequest = {
            method: 'tools/call',
            params: {
                name: 'crawl_wechat_batch',
                arguments: {
                    urls,
                    options: {
                        output_format: 'markdown',
                        concurrent_limit: 3,
                        delay_seconds: 2,
                        stop_on_error: false
                    }
                }
            }
        };

        try {
            console.log(`📋 批量抓取 ${urls.length} 个URL`);
            
            const startTime = Date.now();
            const result = await this.mockCall(request);
            const duration = Date.now() - startTime;
            
            console.log(`✅ 批量抓取完成，耗时: ${duration}ms`);
            console.log('📊 结果:', result.summary);
            
        } catch (error) {
            console.error('❌ 批量抓取失败:', error);
        }
    }

    /**
     * 示例3：状态监控
     */
    async example3_StatusMonitoring() {
        console.log('\n🔥 示例3：状态监控');
        
        const sessionId = 'example-session-' + Date.now();
        
        const request: MockMCPRequest = {
            method: 'tools/call',
            params: {
                name: 'crawl_get_status',
                arguments: {
                    session_id: sessionId
                }
            }
        };

        try {
            console.log('🔍 查询会话状态...');
            const result = await this.mockCall(request);
            console.log('📊 状态信息:', result.summary);
            
        } catch (error) {
            console.error('❌ 状态查询失败:', error);
        }
    }

    /**
     * 示例4：错误处理
     */
    async example4_ErrorHandling() {
        console.log('\n🔥 示例4：错误处理');
        
        const testCases = [
            {
                name: '无效URL',
                request: {
                    method: 'tools/call',
                    params: {
                        name: 'crawl_wechat_article',
                        arguments: {
                            url: 'https://invalid-domain.com/fake'
                        }
                    }
                }
            },
            {
                name: '缺少参数',
                request: {
                    method: 'tools/call',
                    params: {
                        name: 'crawl_wechat_article',
                        arguments: {}
                    }
                }
            },
            {
                name: '未知工具',
                request: {
                    method: 'tools/call',
                    params: {
                        name: 'unknown_tool',
                        arguments: {}
                    }
                }
            }
        ];

        for (const testCase of testCases) {
            try {
                console.log(`\n🧪 测试: ${testCase.name}`);
                const result = await this.mockCall(testCase.request);
                console.log(result.isError ? '❌ 预期错误' : '⚠️ 意外成功', result.summary);
                
            } catch (error) {
                console.log('❌ 捕获异常:', error.message);
            }
        }
    }

    /**
     * 模拟MCP调用
     */
    private async mockCall(request: MockMCPRequest): Promise<{
        isError: boolean;
        summary: string;
        content: Array<{ type: string; text: string; }>;
    }> {
        // 模拟处理延迟
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        const toolName = request.params.name;
        const args = request.params.arguments;
        
        switch (toolName) {
            case 'crawl_wechat_article':
                return this.mockArticleResult(args);
                
            case 'crawl_wechat_batch':
                return this.mockBatchResult(args);
                
            case 'crawl_get_status':
                return this.mockStatusResult(args);
                
            default:
                return {
                    isError: true,
                    summary: `未知工具: ${toolName}`,
                    content: [{ type: 'text', text: `❌ 未知的工具: ${toolName}` }]
                };
        }
    }

    /**
     * 模拟文章抓取结果
     */
    private mockArticleResult(args: any) {
        if (!args.url) {
            return {
                isError: true,
                summary: '缺少URL参数',
                content: [{ type: 'text', text: '❌ 缺少必需参数: url' }]
            };
        }

        if (!args.url.includes('mp.weixin.qq.com')) {
            return {
                isError: true,
                summary: '无效的微信文章URL',
                content: [{ type: 'text', text: '❌ 不是有效的微信文章链接' }]
            };
        }

        const sessionId = 'session-' + Date.now();
        const duration = Math.round(3000 + Math.random() * 5000);

        return {
            isError: false,
            summary: `抓取成功 - 会话ID: ${sessionId}, 耗时: ${duration}ms`,
            content: [{
                type: 'text',
                text: `✅ 微信文章抓取成功\n🆔 会话ID: ${sessionId}\n⏱️ 耗时: ${duration}ms`
            }]
        };
    }

    /**
     * 模拟批量抓取结果
     */
    private mockBatchResult(args: any) {
        if (!args.urls || !Array.isArray(args.urls) || args.urls.length === 0) {
            return {
                isError: true,
                summary: 'URL列表为空',
                content: [{ type: 'text', text: '❌ URL列表不能为空' }]
            };
        }

        const invalidUrls = args.urls.filter((url: string) => !url.includes('mp.weixin.qq.com'));
        if (invalidUrls.length > 0) {
            return {
                isError: true,
                summary: `包含 ${invalidUrls.length} 个无效URL`,
                content: [{ type: 'text', text: `❌ 包含无效的微信文章链接: ${invalidUrls.length} 个` }]
            };
        }

        const total = args.urls.length;
        const success = Math.floor(total * (0.8 + Math.random() * 0.2));
        const failed = total - success;
        const duration = Math.round(total * 2000 + Math.random() * 5000);

        return {
            isError: false,
            summary: `批量抓取完成 - 成功: ${success}/${total}, 耗时: ${duration}ms`,
            content: [{
                type: 'text',
                text: `🔥 批量抓取完成\n📊 成功: ${success}, 失败: ${failed}\n⏱️ 耗时: ${duration}ms`
            }]
        };
    }

    /**
     * 模拟状态查询结果
     */
    private mockStatusResult(args: any) {
        if (!args.session_id) {
            return {
                isError: true,
                summary: '缺少会话ID',
                content: [{ type: 'text', text: '❌ 缺少必需参数: session_id' }]
            };
        }

        const statuses = ['running', 'completed', 'failed'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const progress = Math.floor(Math.random() * 100);

        return {
            isError: false,
            summary: `会话状态: ${status}, 进度: ${progress}%`,
            content: [{
                type: 'text',
                text: `📊 会话状态查询\n🆔 会话ID: ${args.session_id}\n📈 状态: ${status}\n📊 进度: ${progress}%`
            }]
        };
    }

    /**
     * 运行所有示例
     */
    async runAllExamples() {
        console.log('🚀 微信文章抓取MCP服务器 - 高级使用示例');
        console.log('=' .repeat(60));

        try {
            await this.example1_CustomCrawlOptions();
            await new Promise(resolve => setTimeout(resolve, 1000));

            await this.example2_BatchCrawlWithConcurrency();
            await new Promise(resolve => setTimeout(resolve, 1000));

            await this.example3_StatusMonitoring();
            await new Promise(resolve => setTimeout(resolve, 1000));

            await this.example4_ErrorHandling();

            console.log('\n🎉 所有示例运行完成！');
            console.log('💡 提示: 这些示例使用模拟数据，实际使用时需要连接真实的服务器');

        } catch (error) {
            console.error('❌ 示例运行失败:', error);
        }
    }
}

// 运行示例
if (require.main === module) {
    const example = new AdvancedUsageExample();
    example.runAllExamples().catch(console.error);
} 