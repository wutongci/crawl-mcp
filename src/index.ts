#!/usr/bin/env node

import { CrawlMCPServer } from './core/CrawlMCPServer';
import { Logger } from './utils/Logger';

/**
 * 主程序入口
 */
async function main(): Promise<void> {
    const logger = new Logger('Main');
    
    try {
        logger.info('启动 Crawl MCP 服务器...');
        
        // 创建服务器实例
        const server = new CrawlMCPServer();
        
        // 设置进程退出处理
        const cleanup = async () => {
            logger.info('接收到退出信号，正在关闭服务器...');
            try {
                await server.stop();
                process.exit(0);
            } catch (error) {
                logger.error('关闭服务器时发生错误', error);
                process.exit(1);
            }
        };
        
        // 监听退出信号
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('SIGQUIT', cleanup);
        
        // 监听未捕获的异常
        process.on('uncaughtException', (error) => {
            logger.error('未捕获的异常', error);
            cleanup();
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('未处理的Promise拒绝', { reason, promise });
            cleanup();
        });
        
        // 启动服务器
        await server.start();
        
        logger.info('Crawl MCP 服务器已启动，等待请求...');
        
    } catch (error) {
        logger.error('服务器启动失败', error);
        process.exit(1);
    }
}

// 运行主程序
if (require.main === module) {
    main().catch((error) => {
        console.error('主程序执行失败:', error);
        process.exit(1);
    });
} 