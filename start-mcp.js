#!/usr/bin/env node

/**
 * Crawl MCP Server 启动脚本
 * 专门为Cursor MCP环境优化的启动脚本
 * 严格遵循stdio传输协议
 */

const path = require('path');
const { CrawlMCPServer } = require('./dist/core/CrawlMCPServer.js');

// 设置进程标题
process.title = 'crawl-mcp-server';

// 简化的全局错误处理 - 避免干扰stdio
process.on('uncaughtException', (error) => {
    // 只记录严重错误，不要过度输出
    if (error.name === 'OutOfMemoryError' || error.code === 'ECONNRESET') {
        console.error('[致命错误]', error.message);
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    // 简化Promise拒绝处理
    if (process.env.MCP_DEBUG === 'true') {
        console.error('[Promise拒绝]', reason);
    }
    // 不要因为Promise拒绝就退出进程
});

async function startMCPServer() {
    let server = null;
    
    try {
        // 最小化启动日志 - 只输出必要信息
        if (process.env.MCP_DEBUG === 'true') {
            console.error('[启动] Crawl MCP Server v1.1.6');
            console.error(`[信息] PID: ${process.pid}, Node: ${process.version}`);
        }
        
        server = new CrawlMCPServer();
        
        // 简化的信号处理
        const gracefulShutdown = async (signal) => {
            if (process.env.MCP_DEBUG === 'true') {
                console.error(`[关闭] 收到${signal}信号`);
            }
            
            if (server) {
                try {
                    await server.stop();
                } catch (error) {
                    // 静默处理关闭错误
                }
            }
            
            process.exit(0);
        };
        
        // 只监听主要信号
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        
        // 移除复杂的内存监控 - 避免干扰Cursor
        // Cursor会管理MCP服务器的生命周期
        
        // 启动服务器
        await server.start();
        
        // 最小化成功日志
        if (process.env.MCP_DEBUG === 'true') {
            console.error('[就绪] MCP服务器已连接到Cursor');
        }
        
        // 保持进程运行 - 等待Cursor的stdio通信
        // 不要调用 process.stdin.resume() - 这可能干扰MCP的stdio传输
        
    } catch (error) {
        // 简化错误处理
        console.error('[启动失败]', error.message);
        
        if (server) {
            try {
                await server.stop();
            } catch (cleanupError) {
                // 静默处理清理错误
            }
        }
        
        process.exit(1);
    }
}

// 立即启动，移除延迟
startMCPServer().catch(error => {
    console.error('[致命]', error.message);
    process.exit(1);
}); 