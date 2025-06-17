#!/usr/bin/env node

/**
 * Crawl MCP Server 启动脚本
 * 用于在Cursor中启动MCP服务器
 */

const path = require('path');
const { CrawlMCPServer } = require('./dist/core/CrawlMCPServer.js');

async function startMCPServer() {
    try {
        console.error('[启动] 初始化 Crawl MCP Server...');
        
        const server = new CrawlMCPServer();
        
        // 监听进程信号
        process.on('SIGINT', async () => {
            console.error('[关闭] 收到SIGINT信号，正在关闭服务器...');
            await server.close();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.error('[关闭] 收到SIGTERM信号，正在关闭服务器...');
            await server.close();
            process.exit(0);
        });
        
        // 启动服务器
        await server.run();
        
    } catch (error) {
        console.error('[错误] MCP服务器启动失败:', error);
        process.exit(1);
    }
}

// 立即启动
startMCPServer(); 