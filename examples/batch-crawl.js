/**
 * 微信文章批量抓取示例
 * 演示如何使用MCP客户端进行批量文章抓取
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');

/**
 * 批量抓取示例类
 */
class BatchCrawlExample {
    constructor() {
        this.client = null;
        this.transport = null;
    }

    /**
     * 初始化MCP连接
     */
    async initialize() {
        try {
            console.log('🚀 启动MCP服务器...');
            
            // 启动crawl-mcp服务器
            const serverProcess = spawn('node', ['dist/index.js'], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // 创建客户端传输
            this.transport = new StdioClientTransport({
                stdin: serverProcess.stdin,
                stdout: serverProcess.stdout
            });

            // 创建MCP客户端
            this.client = new Client(
                {
                    name: 'batch-crawl-example',
                    version: '1.0.0'
                },
                {
                    capabilities: {}
                }
            );

            // 连接到服务器
            await this.client.connect(this.transport);
            console.log('✅ MCP客户端连接成功');

            return true;
        } catch (error) {
            console.error('❌ 初始化失败:', error.message);
            return false;
        }
    }

    /**
     * 执行批量抓取示例
     */
    async runBatchCrawlExample() {
        console.log('\n📚 开始批量抓取示例...');

        // 示例微信文章URL列表
        const articleUrls = [
            'https://mp.weixin.qq.com/s/example-article-1',
            'https://mp.weixin.qq.com/s/example-article-2',
            'https://mp.weixin.qq.com/s/example-article-3',
            'https://mp.weixin.qq.com/s/example-article-4',
            'https://mp.weixin.qq.com/s/example-article-5'
        ];

        try {
            // 调用批量抓取工具
            const result = await this.client.callTool('crawl_wechat_batch', {
                urls: articleUrls,
                output_format: 'markdown',
                save_images: true,
                output_dir: './batch_output',
                concurrent_limit: 2,
                delay_seconds: 3,
                strategy: 'basic'
            });

            console.log('📊 批量抓取结果:');
            console.log(result.content[0].text);

            return result;
        } catch (error) {
            console.error('❌ 批量抓取失败:', error.message);
            throw error;
        }
    }

    /**
     * 监控抓取进度
     */
    async monitorProgress(sessionId = null) {
        console.log('\n📈 监控抓取进度...');

        try {
            const statusResult = await this.client.callTool('crawl_get_status', {
                session_id: sessionId
            });

            console.log('📊 当前状态:');
            console.log(statusResult.content[0].text);

            return statusResult;
        } catch (error) {
            console.error('❌ 状态查询失败:', error.message);
            throw error;
        }
    }

    /**
     * 演示不同的抓取策略
     */
    async demonstrateStrategies() {
        console.log('\n🎯 演示不同抓取策略...');

        const testUrl = 'https://mp.weixin.qq.com/s/test-article';
        const strategies = ['basic', 'conservative', 'fast'];

        for (const strategy of strategies) {
            console.log(`\n📋 测试 ${strategy} 策略:`);

            try {
                const startTime = Date.now();
                
                const result = await this.client.callTool('crawl_wechat_article', {
                    url: testUrl,
                    strategy: strategy,
                    output_format: 'markdown',
                    save_images: false,
                    output_dir: `./strategy_test/${strategy}`
                });

                const duration = Date.now() - startTime;
                console.log(`⏱️  ${strategy} 策略耗时: ${duration}ms`);
                console.log(`📄 结果摘要: ${result.content[0].text.substring(0, 200)}...`);

            } catch (error) {
                console.error(`❌ ${strategy} 策略失败:`, error.message);
            }
        }
    }

    /**
     * 演示错误处理
     */
    async demonstrateErrorHandling() {
        console.log('\n🛡️ 演示错误处理...');

        const invalidUrls = [
            'https://invalid-url.com',
            'https://mp.weixin.qq.com/invalid',
            'not-a-url'
        ];

        for (const url of invalidUrls) {
            try {
                console.log(`\n🔍 测试无效URL: ${url}`);
                
                const result = await this.client.callTool('crawl_wechat_article', {
                    url: url
                });

                console.log('📄 响应:', result.content[0].text);

            } catch (error) {
                console.error('❌ 预期的错误:', error.message);
            }
        }
    }

    /**
     * 演示高级配置
     */
    async demonstrateAdvancedConfig() {
        console.log('\n⚙️ 演示高级配置...');

        const advancedConfig = {
            urls: [
                'https://mp.weixin.qq.com/s/advanced-test-1',
                'https://mp.weixin.qq.com/s/advanced-test-2'
            ],
            output_format: 'json',
            save_images: true,
            output_dir: './advanced_output',
            concurrent_limit: 1,
            delay_seconds: 5,
            strategy: 'conservative'
        };

        try {
            console.log('📋 配置参数:');
            console.log(JSON.stringify(advancedConfig, null, 2));

            const result = await this.client.callTool('crawl_wechat_batch', advancedConfig);

            console.log('\n📊 高级配置结果:');
            console.log(result.content[0].text);

        } catch (error) {
            console.error('❌ 高级配置测试失败:', error.message);
        }
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            if (this.client) {
                await this.client.close();
                console.log('🧹 MCP客户端已关闭');
            }
        } catch (error) {
            console.error('❌ 清理失败:', error.message);
        }
    }

    /**
     * 运行完整示例
     */
    async runFullExample() {
        try {
            // 1. 初始化
            const initialized = await this.initialize();
            if (!initialized) {
                throw new Error('初始化失败');
            }

            // 2. 基础批量抓取
            await this.runBatchCrawlExample();

            // 3. 进度监控
            await this.monitorProgress();

            // 4. 策略演示
            await this.demonstrateStrategies();

            // 5. 错误处理演示
            await this.demonstrateErrorHandling();

            // 6. 高级配置演示
            await this.demonstrateAdvancedConfig();

            console.log('\n🎉 所有示例完成!');

        } catch (error) {
            console.error('❌ 示例执行失败:', error);
        } finally {
            // 7. 清理
            await this.cleanup();
        }
    }
}

/**
 * 辅助函数：格式化输出
 */
function formatOutput(result) {
    if (result && result.content && result.content[0]) {
        return result.content[0].text;
    }
    return '无输出内容';
}

/**
 * 主函数
 */
async function main() {
    console.log('🎯 微信文章批量抓取示例');
    console.log('================================');

    const example = new BatchCrawlExample();
    await example.runFullExample();
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的Promise拒绝:', reason);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n🛑 接收到中断信号，正在退出...');
    process.exit(0);
});

// 如果直接运行此文件，执行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 主函数执行失败:', error);
        process.exit(1);
    });
}

module.exports = { BatchCrawlExample, formatOutput }; 