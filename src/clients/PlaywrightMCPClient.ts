import { 
    PlaywrightResult, 
    PlaywrightToolName, 
    NavigateOptions, 
    WaitOptions, 
    ClickOptions, 
    ScreenshotOptions,
    SnapshotOptions,
    ScrollOptions,
    TypeOptions 
} from '../types';
import { Logger } from '../utils/Logger';

/**
 * Playwright MCP 客户端
 * 通过Cursor的MCP环境调用playwright工具
 */
export class PlaywrightMCPClient {
    private logger: Logger;
    private isConnected: boolean = false;

    constructor() {
        this.logger = new Logger('PlaywrightMCPClient');
    }

    /**
     * 初始化客户端
     * 在Cursor环境中，playwright工具已经可用，无需额外初始化
     */
    async initialize(): Promise<void> {
        try {
            this.logger.info('初始化 Playwright MCP 客户端...');
            
            // 在Cursor MCP环境中，playwright工具应该已经可用
            // 我们只需要标记为已连接
            this.isConnected = true;
            this.logger.info('Playwright MCP 客户端初始化成功');
            
        } catch (error) {
            this.logger.error('Playwright MCP 客户端初始化失败', error);
            throw error;
        }
    }

    /**
     * 检查连接状态
     */
    private ensureConnected(): void {
        if (!this.isConnected) {
            throw new Error('Playwright MCP 客户端未初始化，请先调用 initialize()');
        }
    }

    /**
     * 调用MCP工具 - 通过Cursor环境
     */
    private async callTool(toolName: string, args: any): Promise<PlaywrightResult> {
        this.ensureConnected();
        
        try {
            this.logger.debug(`调用 Playwright MCP 工具: ${toolName}`, args);
            
            // 在Cursor环境中，我们需要通过某种方式调用playwright工具
            // 由于我们在MCP服务器内部，需要找到正确的调用方式
            
            // 尝试通过process.env或global对象访问MCP工具
            const result = await this.callCursorMCPTool(toolName, args);
            
            this.logger.debug(`工具调用成功: ${toolName}`, result);
            return result;
            
        } catch (error) {
            this.logger.error(`工具调用失败: ${toolName}`, error);
            
            // 如果调用失败，使用fallback实现
            return await this.fallbackImplementation(toolName, args);
        }
    }

    /**
     * 调用Cursor环境中的MCP工具
     */
    private async callCursorMCPTool(toolName: string, args: any): Promise<PlaywrightResult> {
        // 这里是关键：我们需要找到正确的方式来调用Cursor中的playwright工具
        
        // 方法1: 尝试通过环境变量或全局对象
        if (typeof (global as any).mcpTools !== 'undefined') {
            const mcpTools = (global as any).mcpTools;
            if (mcpTools.playwright && typeof mcpTools.playwright[toolName] === 'function') {
                const result = await mcpTools.playwright[toolName](args);
                return {
                    success: true,
                    data: result,
                    metadata: { timestamp: Date.now() }
                };
            }
        }

                 // 方法2: 尝试通过Node.js进程间通信
         if (process.send && typeof process.send === 'function') {
            return new Promise((resolve) => {
                const requestId = `playwright_${Date.now()}_${Math.random()}`;
                
                const timeout = setTimeout(() => {
                    resolve({
                        success: false,
                        error: '调用playwright工具超时'
                    });
                }, 30000);

                const messageHandler = (message: any) => {
                    if (message.requestId === requestId) {
                        clearTimeout(timeout);
                        process.off('message', messageHandler);
                        resolve({
                            success: message.success,
                            data: message.data,
                            error: message.error,
                            metadata: message.metadata || {}
                        });
                    }
                };

                                 process.on('message', messageHandler);
                 process.send!({
                     type: 'mcp_tool_call',
                     requestId,
                     toolName,
                     args
                 });
            });
        }

        // 方法3: 直接使用实际的playwright操作
        return await this.directPlaywrightImplementation(toolName, args);
    }

    /**
     * 直接实现playwright操作
     */
    private async directPlaywrightImplementation(toolName: string, args: any): Promise<PlaywrightResult> {
        const { chromium } = require('playwright');
        
        try {
            switch (toolName) {
                case 'mcp_playwright_browser_navigate':
                    return await this.handleNavigate(args.url);
                    
                case 'mcp_playwright_browser_snapshot':
                    return await this.handleSnapshot();
                    
                case 'mcp_playwright_browser_wait_for':
                    return await this.handleWaitFor(args);
                    
                case 'mcp_playwright_browser_click':
                    return await this.handleClick(args);
                    
                default:
                    throw new Error(`不支持的工具: ${toolName}`);
            }
        } catch (error) {
            throw new Error(`Playwright操作失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 处理页面导航
     */
    private async handleNavigate(url: string): Promise<PlaywrightResult> {
        const { chromium } = require('playwright');
        
        let browser = null;
        let context = null;
        let page = null;
        
        try {
            this.logger.info(`正在导航到: ${url}`);
            
            browser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ]
            });

            context = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                locale: 'zh-CN',
                timezoneId: 'Asia/Shanghai'
            });

            // 添加反检测脚本
            await context.addInitScript(`
                delete window.navigator.webdriver;
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5]
                });
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['zh-CN', 'zh', 'en-US', 'en']
                });
            `);

            page = await context.newPage();
            
            // 导航到页面
            await page.goto(url, { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
            });

            // 等待页面稳定
            await page.waitForTimeout(2000);

            // 存储页面引用供后续使用
            this.storeBrowserSession(browser, context, page);

            return {
                success: true,
                data: { 
                    url, 
                    title: await page.title(),
                    status: 'loaded' 
                },
                metadata: { 
                    loadTime: Date.now(),
                    viewport: await page.viewportSize()
                }
            };

        } catch (error) {
            // 清理资源
            if (page) await page.close().catch(() => {});
            if (context) await context.close().catch(() => {});
            if (browser) await browser.close().catch(() => {});

            throw error;
        }
    }

    /**
     * 处理页面快照
     */
    private async handleSnapshot(): Promise<PlaywrightResult> {
        const session = this.getBrowserSession();
        if (!session || !session.page) {
            return {
                success: false,
                error: '没有活动的浏览器会话，请先导航到页面'
            };
        }

        try {
            // 尝试点击"展开全文"按钮
            try {
                const expandButtons = await session.page.$$('.rich_media_js:visible');
                for (const button of expandButtons) {
                    await button.click();
                    await session.page.waitForTimeout(1000);
                }
            } catch (e) {
                this.logger.debug('没有找到展开按钮或点击失败', e);
            }

            // 获取页面HTML内容
            const content = await session.page.content();

            return {
                success: true,
                data: content,
                metadata: {
                    timestamp: Date.now(),
                    contentLength: content.length,
                    url: session.page.url()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `获取页面快照失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 处理等待操作
     */
    private async handleWaitFor(args: any): Promise<PlaywrightResult> {
        const session = this.getBrowserSession();
        if (!session || !session.page) {
            return {
                success: false,
                error: '没有活动的浏览器会话'
            };
        }

        try {
            if (args.text) {
                // 等待文本出现
                await session.page.waitForSelector(`text=${args.text}`, {
                    timeout: (args.time || 30) * 1000
                });
            } else {
                // 简单等待
                await session.page.waitForTimeout((args.time || 3) * 1000);
            }

            return {
                success: true,
                data: { waited: true },
                metadata: { waitTime: args.time * 1000 }
            };

        } catch (error) {
            return {
                success: false,
                error: `等待操作失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 处理点击操作
     */
    private async handleClick(args: any): Promise<PlaywrightResult> {
        const session = this.getBrowserSession();
        if (!session || !session.page) {
            return {
                success: false,
                error: '没有活动的浏览器会话'
            };
        }

        try {
            await session.page.click(args.element);
            await session.page.waitForTimeout(1000);

            return {
                success: true,
                data: { clicked: true, element: args.element },
                metadata: { clickTime: Date.now() }
            };

        } catch (error) {
            return {
                success: false,
                error: `点击操作失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 存储浏览器会话
     */
    private storeBrowserSession(browser: any, context: any, page: any): void {
        (global as any)._crawlMCPBrowserSession = { browser, context, page };
    }

    /**
     * 获取浏览器会话
     */
    private getBrowserSession(): any {
        return (global as any)._crawlMCPBrowserSession || null;
    }

    /**
     * Fallback实现（如果无法调用真正的playwright）
     */
    private async fallbackImplementation(toolName: string, args: any): Promise<PlaywrightResult> {
        this.logger.warn(`使用fallback实现: ${toolName}`);
        
        // 尝试直接调用实现
        return await this.directPlaywrightImplementation(toolName, args);
    }

    /**
     * 页面导航
     */
    async navigate(url: string, options?: Partial<NavigateOptions>): Promise<PlaywrightResult> {
        return this.callTool('mcp_playwright_browser_navigate', { url });
    }

    /**
     * 等待页面加载或元素出现
     */
    async waitFor(selector?: string, options?: Partial<WaitOptions>): Promise<PlaywrightResult> {
        return this.callTool('mcp_playwright_browser_wait_for', {
            text: selector,
            time: options?.timeout ? options.timeout / 1000 : 3
        });
    }

    /**
     * 获取页面快照
     */
    async snapshot(options?: Partial<SnapshotOptions>): Promise<PlaywrightResult> {
        return this.callTool('mcp_playwright_browser_snapshot', {});
    }

    /**
     * 点击元素
     */
    async click(selector: string, options?: Partial<ClickOptions>): Promise<PlaywrightResult> {
        return this.callTool('mcp_playwright_browser_click', {
            element: selector
        });
    }

    /**
     * 截图
     */
    async takeScreenshot(options?: Partial<ScreenshotOptions>): Promise<PlaywrightResult> {
        const session = this.getBrowserSession();
        if (!session || !session.page) {
            return {
                success: false,
                error: '没有活动的浏览器会话'
            };
        }

        try {
            const screenshot = await session.page.screenshot({
                fullPage: options?.fullPage || true,
                type: 'png'
            });

            return {
                success: true,
                data: { 
                    screenshot: screenshot.toString('base64'),
                    filename: options?.path 
                },
                metadata: { 
                    size: screenshot.length,
                    timestamp: Date.now()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `截图失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 滚动页面
     */
    async scroll(options?: Partial<ScrollOptions>): Promise<PlaywrightResult> {
        const session = this.getBrowserSession();
        if (!session || !session.page) {
            return {
                success: false,
                error: '没有活动的浏览器会话'
            };
        }

                 try {
             const scrollX = (options && options.x) || 0;
             const scrollY = (options && options.y) || 500;
             await session.page.evaluate(`window.scrollBy(${scrollX}, ${scrollY})`);

            return {
                success: true,
                data: { scrolled: true },
                metadata: { x: options?.x || 0, y: options?.y || 500 }
            };

        } catch (error) {
            return {
                success: false,
                error: `滚动失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 输入文本
     */
    async type(selector: string, text: string, options?: Partial<TypeOptions>): Promise<PlaywrightResult> {
        const session = this.getBrowserSession();
        if (!session || !session.page) {
            return {
                success: false,
                error: '没有活动的浏览器会话'
            };
        }

        try {
            await session.page.fill(selector, text);

            return {
                success: true,
                data: { typed: true, text },
                metadata: { selector, timestamp: Date.now() }
            };

        } catch (error) {
            return {
                success: false,
                error: `输入文本失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 刷新页面
     */
    async reload(): Promise<PlaywrightResult> {
        const session = this.getBrowserSession();
        if (!session || !session.page) {
            return {
                success: false,
                error: '没有活动的浏览器会话'
            };
        }

        try {
            await session.page.reload();
            return {
                success: true,
                data: { reloaded: true },
                metadata: { timestamp: Date.now() }
            };
        } catch (error) {
            return {
                success: false,
                error: `刷新失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 后退
     */
    async back(): Promise<PlaywrightResult> {
        const session = this.getBrowserSession();
        if (!session || !session.page) {
            return {
                success: false,
                error: '没有活动的浏览器会话'
            };
        }

        try {
            await session.page.goBack();
            return {
                success: true,
                data: { navigated: 'back' },
                metadata: { timestamp: Date.now() }
            };
        } catch (error) {
            return {
                success: false,
                error: `后退失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 前进
     */
    async forward(): Promise<PlaywrightResult> {
        const session = this.getBrowserSession();
        if (!session || !session.page) {
            return {
                success: false,
                error: '没有活动的浏览器会话'
            };
        }

        try {
            await session.page.goForward();
            return {
                success: true,
                data: { navigated: 'forward' },
                metadata: { timestamp: Date.now() }
            };
        } catch (error) {
            return {
                success: false,
                error: `前进失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * 测试连接
     */
    async ping(): Promise<PlaywrightResult> {
        this.ensureConnected();
        return {
            success: true,
            data: { ping: 'pong', timestamp: Date.now() },
            metadata: { connected: this.isConnected }
        };
    }

    /**
     * 关闭客户端
     */
    async close(): Promise<void> {
        this.logger.info('关闭 Playwright MCP 客户端');
        
        // 清理浏览器会话
        const session = this.getBrowserSession();
        if (session) {
            try {
                if (session.page) await session.page.close();
                if (session.context) await session.context.close(); 
                if (session.browser) await session.browser.close();
            } catch (error) {
                this.logger.warn('清理浏览器会话时出错', error);
            }
            delete (global as any)._crawlMCPBrowserSession;
        }
        
        this.isConnected = false;
    }
} 