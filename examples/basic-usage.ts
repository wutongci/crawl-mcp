/**
 * Crawl MCP 基本使用示例
 * 
 * 本示例展示如何在代码中直接使用 CallOrchestrator 进行抓取
 * （实际使用中，通常通过 MCP 协议调用）
 */

import { CallOrchestrator } from '../src/core/CallOrchestrator';
import { Logger } from '../src/utils/Logger';

async function basicUsageExample() {
    const logger = new Logger('Example');
    
    try {
        logger.info('开始基本使用示例');
        
        // 创建调用编排器
        const orchestrator = new CallOrchestrator();
        
        // 初始化
        await orchestrator.initialize();
        
        // 示例微信文章URL（这里使用一个示例URL）
        const testUrl = 'https://mp.weixin.qq.com/s/example-article-id';
        
        logger.info(`开始抓取文章: ${testUrl}`);
        
        // 执行抓取
        const result = await orchestrator.orchestrateWechatCrawl(testUrl, {
            output_format: 'markdown',
            save_images: true,
            clean_content: true,
            timeout: 30000,
            retry_attempts: 3,
            delay_between_steps: 1000
        });
        
        // 输出结果
        if (result.success) {
            logger.info('抓取成功！');
            console.log('=== 抓取结果 ===');
            console.log(`标题: ${result.title}`);
            console.log(`作者: ${result.author}`);
            console.log(`发布时间: ${result.publish_time}`);
            console.log(`内容长度: ${result.content.length} 字符`);
            console.log(`图片数量: ${result.images.length}`);
            console.log(`抓取耗时: ${result.duration}ms`);
            console.log(`会话ID: ${result.session_id}`);
        } else {
            logger.error('抓取失败:', result.error);
        }
        
        // 获取状态管理器统计信息
        const stateManager = orchestrator.getStateManager();
        const statistics = stateManager.getStatistics();
        
        console.log('=== 系统统计 ===');
        console.log(`总会话数: ${statistics.totalSessions}`);
        console.log(`活跃会话: ${statistics.activeSessions}`);
        console.log(`已完成: ${statistics.completedSessions}`);
        console.log(`失败: ${statistics.failedSessions}`);
        
        // 关闭编排器
        await orchestrator.close();
        
        logger.info('示例执行完成');
        
    } catch (error) {
        logger.error('示例执行失败', error);
    }
}

// 运行示例
if (require.main === module) {
    basicUsageExample().catch(console.error);
} 