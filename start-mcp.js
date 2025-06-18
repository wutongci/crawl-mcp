#!/usr/bin/env node

/**
 * Crawl MCP Server 启动脚本
 * 用于在Cursor中启动MCP服务器
 * 
 * 参考 Microsoft playwright-mcp 项目的最佳实践
 */

const path = require('path');
const { CrawlMCPServer } = require('./dist/core/CrawlMCPServer.js');

// 全局错误处理
process.on('uncaughtException', (error) => {
    console.error('[错误] 未捕获的异常:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[错误] 未处理的Promise拒绝:', reason);
    console.error('[Promise]:', promise);
    process.exit(1);
});

// 设置进程标题
process.title = 'crawl-mcp-server';

async function startMCPServer() {
    let server = null;
    
    try {
        console.error('[启动] 初始化 Crawl MCP Server...');
        console.error(`[信息] 进程 PID: ${process.pid}`);
        console.error(`[信息] Node.js 版本: ${process.version}`);
        console.error(`[信息] 工作目录: ${process.cwd()}`);
        
        // 检查内存限制
        const memLimit = process.env.NODE_OPTIONS;
        if (memLimit && memLimit.includes('--max-old-space-size')) {
            console.error(`[信息] 内存限制: ${memLimit}`);
        }
        
        server = new CrawlMCPServer();
        
        // 设置优雅关闭处理
        const gracefulShutdown = async (signal) => {
            console.error(`[关闭] 收到${signal}信号，正在关闭服务器...`);
            
            if (server) {
                try {
                    await server.stop();
                    console.error('[关闭] 服务器已成功关闭');
                } catch (error) {
                    console.error('[错误] 关闭服务器时发生错误:', error);
                }
            }
            
            // 强制退出（防止挂起）
            setTimeout(() => {
                console.error('[强制] 强制退出进程');
                process.exit(1);
            }, 5000);
            
            process.exit(0);
        };
        
        // 监听各种退出信号
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));
        
        // Windows 支持
        if (process.platform === 'win32') {
            process.on('SIGBREAK', () => gracefulShutdown('SIGBREAK'));
        }
        
        // 内存监控（如果启用）
        if (process.env.MCP_MEMORY_MONITOR === 'true') {
            console.error('[监控] 启用内存监控');
            
            const startMemory = process.memoryUsage();
            console.error(`[监控] 启动时内存使用: ${Math.round(startMemory.heapUsed / 1024 / 1024)}MB`);
            
            // 每5分钟报告一次内存使用
            setInterval(() => {
                const memUsage = process.memoryUsage();
                const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
                const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
                const rssMB = Math.round(memUsage.rss / 1024 / 1024);
                
                console.error(`[监控] 内存使用 - RSS: ${rssMB}MB, Heap: ${heapUsedMB}/${heapTotalMB}MB`);
                
                // 内存使用过高警告
                if (heapUsedMB > 800) {
                    console.error(`[警告] 内存使用过高: ${heapUsedMB}MB`);
                }
                
                // 检查服务器状态
                if (server && typeof server.getStatus === 'function') {
                    const status = server.getStatus();
                    console.error(`[状态] 运行时间: ${status.uptimeMinutes}分钟, 请求数: ${status.requestCount}, 错误数: ${status.errorCount}`);
                }
            }, 5 * 60 * 1000); // 5分钟
        }
        
        // 启动服务器
        console.error('[启动] 正在启动 MCP 服务器...');
        await server.start();
        
        console.error('[成功] Crawl MCP Server 已启动并等待连接');
        console.error('[提示] 服务器正在运行，使用 Ctrl+C 停止');
        
        // 保持进程运行
        process.stdin.resume();
        
    } catch (error) {
        console.error('[错误] MCP服务器启动失败:', error);
        
        // 详细错误信息
        if (error.stack) {
            console.error('[堆栈]', error.stack);
        }
        
        // 尝试清理
        if (server) {
            try {
                await server.stop();
            } catch (cleanupError) {
                console.error('[错误] 清理失败:', cleanupError);
            }
        }
        
        process.exit(1);
    }
}

// 启动延迟，确保环境准备就绪
setTimeout(() => {
    startMCPServer().catch(error => {
        console.error('[致命] 启动脚本执行失败:', error);
        process.exit(1);
    });
}, 100); 