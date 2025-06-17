import { CallOrchestrator } from '../../../src/core/CallOrchestrator';
import { PlaywrightMCPClient } from '../../../src/clients/PlaywrightMCPClient';
import { StateManager } from '../../../src/core/StateManager';

// Mock 依赖
jest.mock('../../../src/clients/PlaywrightMCPClient');
jest.mock('../../../src/core/StateManager');

describe('CallOrchestrator', () => {
    let orchestrator: CallOrchestrator;
    let mockPlaywrightClient: jest.Mocked<PlaywrightMCPClient>;
    let mockStateManager: jest.Mocked<StateManager>;

    beforeEach(() => {
        // 清除之前的 mock
        jest.clearAllMocks();
        
        // 创建新的编排器实例
        orchestrator = new CallOrchestrator();
        
        // 获取 mock 实例
        mockPlaywrightClient = (PlaywrightMCPClient as jest.MockedClass<typeof PlaywrightMCPClient>).mock.instances[0] as jest.Mocked<PlaywrightMCPClient>;
        mockStateManager = (StateManager as jest.MockedClass<typeof StateManager>).mock.instances[0] as jest.Mocked<StateManager>;
    });

    afterEach(async () => {
        await orchestrator.close();
    });

    describe('初始化', () => {
        it('应该成功初始化', async () => {
            mockPlaywrightClient.initialize.mockResolvedValue();
            
            await expect(orchestrator.initialize()).resolves.not.toThrow();
            expect(mockPlaywrightClient.initialize).toHaveBeenCalledTimes(1);
        });

        it('当 Playwright 客户端初始化失败时应该抛出错误', async () => {
            const error = new Error('初始化失败');
            mockPlaywrightClient.initialize.mockRejectedValue(error);
            
            await expect(orchestrator.initialize()).rejects.toThrow();
        });
    });

    describe('微信文章抓取', () => {
        beforeEach(async () => {
            mockPlaywrightClient.initialize.mockResolvedValue();
            await orchestrator.initialize();
        });

        it('应该成功抓取微信文章', async () => {
            const testUrl = 'https://mp.weixin.qq.com/s/test-article';
            const sessionId = 'test-session-id';
            
            // Mock 状态管理器
            mockStateManager.createCrawlSession.mockReturnValue(sessionId);
            mockStateManager.getSessionState.mockReturnValue({
                sessionId,
                url: testUrl,
                startTime: new Date(),
                currentStep: 'initializing',
                stepResults: new Map(),
                stepTimestamps: new Map(),
                errors: [],
                metadata: { wordCount: 0, imageCount: 0, hasExpandButton: false }
            });
            
            // Mock Playwright 客户端调用
            mockPlaywrightClient.navigate.mockResolvedValue({
                success: true,
                data: { url: testUrl, status: 'loaded' }
            });
            
            mockPlaywrightClient.waitFor.mockResolvedValue({
                success: true,
                data: { found: true }
            });
            
            mockPlaywrightClient.snapshot.mockResolvedValue({
                success: true,
                data: '<html><body><h1 id="activity-name">测试标题</h1><span class="account_nickname_inner">测试作者</span></body></html>'
            });
            
            mockPlaywrightClient.click.mockResolvedValue({
                success: true,
                data: { clicked: true }
            });
            
            mockPlaywrightClient.takeScreenshot.mockResolvedValue({
                success: true,
                data: { screenshot: 'base64-data', path: '/tmp/screenshot.png' }
            });
            
            const result = await orchestrator.orchestrateWechatCrawl(testUrl);
            
            expect(result.success).toBe(true);
            expect(result.url).toBe(testUrl);
            expect(result.title).toBe('测试标题');
            expect(result.author).toBe('测试作者');
            expect(result.session_id).toBe(sessionId);
            
            // 验证状态管理器调用
            expect(mockStateManager.createCrawlSession).toHaveBeenCalledWith(testUrl);
            expect(mockStateManager.completeSession).toHaveBeenCalledWith(sessionId, true);
        });

        it('当导航失败时应该返回错误结果', async () => {
            const testUrl = 'https://mp.weixin.qq.com/s/test-article';
            const sessionId = 'test-session-id';
            
            mockStateManager.createCrawlSession.mockReturnValue(sessionId);
            mockStateManager.getSessionState.mockReturnValue({
                sessionId,
                url: testUrl,
                startTime: new Date(),
                currentStep: 'initializing',
                stepResults: new Map(),
                stepTimestamps: new Map(),
                errors: [],
                metadata: { wordCount: 0, imageCount: 0, hasExpandButton: false }
            });
            
            // Mock 导航失败
            mockPlaywrightClient.navigate.mockRejectedValue(new Error('页面加载失败'));
            
            const result = await orchestrator.orchestrateWechatCrawl(testUrl);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('页面加载失败');
            expect(mockStateManager.completeSession).toHaveBeenCalledWith(sessionId, false);
        });

        it('应该正确处理抓取选项', async () => {
            const testUrl = 'https://mp.weixin.qq.com/s/test-article';
            const options = {
                output_format: 'json' as const,
                save_images: false,
                clean_content: false,
                timeout: 60000,
                retry_attempts: 5,
                delay_between_steps: 2000
            };
            
            mockStateManager.createCrawlSession.mockReturnValue('test-session');
            mockStateManager.getSessionState.mockReturnValue({
                sessionId: 'test-session',
                url: testUrl,
                startTime: new Date(),
                currentStep: 'initializing',
                stepResults: new Map(),
                stepTimestamps: new Map(),
                errors: [],
                metadata: { wordCount: 0, imageCount: 0, hasExpandButton: false }
            });
            
            // Mock 成功的调用
            mockPlaywrightClient.navigate.mockResolvedValue({ success: true, data: {} });
            mockPlaywrightClient.waitFor.mockResolvedValue({ success: true, data: {} });
            mockPlaywrightClient.snapshot.mockResolvedValue({ 
                success: true, 
                data: '<html><body>test</body></html>' 
            });
            mockPlaywrightClient.click.mockResolvedValue({ success: true, data: {} });
            mockPlaywrightClient.takeScreenshot.mockResolvedValue({ success: true, data: {} });
            
            const result = await orchestrator.orchestrateWechatCrawl(testUrl, options);
            
            expect(result.success).toBe(true);
            // 验证选项被正确传递和使用
            // 这里可以添加更多具体的验证逻辑
        });
    });

    describe('状态管理', () => {
        it('应该返回状态管理器实例', () => {
            const stateManager = orchestrator.getStateManager();
            expect(stateManager).toBe(mockStateManager);
        });
    });

    describe('关闭', () => {
        it('应该正确关闭所有资源', async () => {
            mockPlaywrightClient.close.mockResolvedValue();
            mockStateManager.destroy.mockReturnValue();
            
            await orchestrator.close();
            
            expect(mockPlaywrightClient.close).toHaveBeenCalledTimes(1);
            expect(mockStateManager.destroy).toHaveBeenCalledTimes(1);
        });
    });
}); 