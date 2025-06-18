#!/usr/bin/env node

/**
 * Crawl MCP Server 启动脚本
 * 标准MCP服务器启动模式
 */

const { CrawlMCPServer } = require('./dist/core/CrawlMCPServer.js');

async function main() {
    const server = new CrawlMCPServer();
    
    // 启动服务器
    await server.start();
    
    // 优雅关闭处理
    process.on('SIGINT', async () => {
        await server.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        await server.stop();
        process.exit(0);
    });
}

main().catch(error => {
    console.error('启动失败:', error);
    process.exit(1);
}); 