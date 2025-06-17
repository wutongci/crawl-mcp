import { PlaywrightMCPClient } from '../clients/PlaywrightMCPClient';
import { StateManager } from './StateManager';
import { Logger } from '../utils/Logger';
import { 
    CrawlStep, 
    CrawlContext, 
    CrawlResult, 
    CrawlOptions, 
    CrawlError,
    DEFAULT_CRAWL_OPTIONS 
} from '../types';
import { 
    NavigateStep, 
    WaitStep, 
    SnapshotStep, 
    ClickStep, 
    ScreenshotStep 
} from '../steps';

/**
 * 调用编排器
 * 负责编排 Playwright MCP 工具调用序列，实现智能抓取流程
 */
export class CallOrchestrator {
    private playwrightClient: PlaywrightMCPClient;
    private stateManager: StateManager;
    private logger: Logger;

    constructor() {
        this.playwrightClient = new PlaywrightMCPClient();
        this.stateManager = new StateManager();
        this.logger = new Logger('CallOrchestrator');
    }

    /**
     * 初始化编排器
     */
    async initialize(): Promise<void> {
        try {
            this.logger.info('初始化调用编排器');
            await this.playwrightClient.initialize();
            this.logger.info('调用编排器初始化完成');
        } catch (error) {
            this.logger.error('调用编排器初始化失败', error);
            throw error;
        }
    }

    /**
     * 编排微信文章抓取流程
     */
    async orchestrateWechatCrawl(url: string, options: Partial<CrawlOptions> = {}): Promise<CrawlResult> {
        const finalOptions = { ...DEFAULT_CRAWL_OPTIONS, ...options };
        const sessionId = this.stateManager.createCrawlSession(url);
        
        this.logger.info(`开始抓取会话 ${sessionId}: ${url}`);

        try {
            // 创建抓取上下文
            const context = this.createCrawlContext(sessionId, url, finalOptions);
            
            // 规划抓取步骤序列
            const steps = this.planCrawlSequence(url, finalOptions);
            
            // 执行步骤序列
            await this.executeStepSequence(steps, context);
            
            // 生成最终结果
            const result = this.generateCrawlResult(context);
            
            // 标记会话完成
            this.stateManager.completeSession(sessionId, result.success);
            
            this.logger.info(`抓取会话 ${sessionId} 完成，成功: ${result.success}`);
            return result;
            
        } catch (error) {
            this.logger.error(`抓取会话 ${sessionId} 失败`, error);
            
            // 记录错误
            const crawlError = new CrawlError(
                error instanceof Error ? error.message : String(error),
                'orchestrator',
                sessionId,
                false
            );
            this.stateManager.addError(sessionId, crawlError);
            this.stateManager.completeSession(sessionId, false);
            
            return this.createErrorResult(url, error, sessionId);
        }
    }

    /**
     * 规划抓取步骤序列
     */
    private planCrawlSequence(url: string, options: CrawlOptions): CrawlStep[] {
        const steps: CrawlStep[] = [];
        
        // 1. 页面导航
        steps.push(new NavigateStep(url, this.playwrightClient));
        
        // 2. 等待页面加载
        steps.push(WaitStep.forPageLoad(this.playwrightClient));
        
        // 3. 获取初始内容快照
        steps.push(SnapshotStep.initial(this.playwrightClient));
        
        // 4. 尝试点击展开按钮（可选）
        steps.push(ClickStep.forExpandButton(this.playwrightClient));
        
        // 5. 等待内容展开（如果有展开按钮）
        steps.push(WaitStep.forContentLoad(this.playwrightClient));
        
        // 6. 获取最终内容快照
        steps.push(SnapshotStep.final(this.playwrightClient));
        
        // 7. 截图保存
        steps.push(ScreenshotStep.fullPage(this.playwrightClient));
        
        this.logger.debug(`规划抓取步骤序列，共 ${steps.length} 个步骤`);
        return steps;
    }

    /**
     * 执行步骤序列
     */
    private async executeStepSequence(steps: CrawlStep[], context: CrawlContext): Promise<void> {
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            
            try {
                await this.executeStepWithRetry(step, context);
                
                // 检查是否需要调整后续步骤
                if (await this.shouldAdjustSequence(step, context)) {
                    const adjustedSteps = await this.adjustSequence(steps.slice(i + 1), context);
                    steps.splice(i + 1, steps.length, ...adjustedSteps);
                    this.logger.info(`步骤序列已调整，剩余 ${adjustedSteps.length} 个步骤`);
                }
                
                // 添加步骤间延迟
                if (i < steps.length - 1) {
                    await this.delay(context.options.delay_between_steps);
                }
                
            } catch (error) {
                // 如果是关键步骤失败，则抛出错误
                if (!step.retryable) {
                    throw error;
                }
                
                this.logger.warn(`非关键步骤失败，继续执行: ${step.name}`, error);
            }
        }
    }

    /**
     * 带重试的步骤执行
     */
    private async executeStepWithRetry(step: CrawlStep, context: CrawlContext): Promise<void> {
        const maxRetries = step.retryable ? context.options.retry_attempts : 1;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.debug(`执行步骤 ${step.name} (尝试 ${attempt}/${maxRetries})`);
                
                // 更新当前步骤
                this.stateManager.updateCurrentStep(context.sessionId, step.name);
                context.currentStep = step.name;
                
                // 执行步骤
                const result = await step.execute(context);
                
                // 更新步骤结果
                context.stepResults.set(step.name, result);
                this.stateManager.updateStepResult(context.sessionId, step.name, result);
                
                if (result.success) {
                    this.logger.debug(`步骤 ${step.name} 执行成功`);
                    return;
                } else {
                    throw new Error(result.error || '步骤执行失败');
                }
                
            } catch (error) {
                lastError = error as Error;
                this.logger.warn(`步骤 ${step.name} 执行失败 (尝试 ${attempt}/${maxRetries})`, error);
                
                if (attempt < maxRetries) {
                    // 等待一段时间再重试
                    await this.delay(2000 * attempt);
                }
            }
        }
        
        // 所有重试都失败了
        if (!step.retryable) {
            throw lastError || new Error(`关键步骤 ${step.name} 执行失败`);
        } else {
            this.logger.warn(`步骤 ${step.name} 跳过，继续执行后续步骤`);
        }
    }

    /**
     * 检查是否需要调整步骤序列
     */
    private async shouldAdjustSequence(completedStep: CrawlStep, context: CrawlContext): Promise<boolean> {
        // 检查初始快照是否发现了展开按钮
        if (completedStep.name === 'initial_snapshot') {
            const result = context.stepResults.get('initial_snapshot');
            if (result?.success && typeof result.data === 'string') {
                const hasExpandButton = this.hasExpandButton(result.data);
                
                // 更新元数据
                this.stateManager.updateMetadata(context.sessionId, { hasExpandButton });
                
                // 如果没有展开按钮，可以跳过相关步骤
                return !hasExpandButton;
            }
        }
        
        return false;
    }

    /**
     * 调整步骤序列
     */
    private async adjustSequence(remainingSteps: CrawlStep[], context: CrawlContext): Promise<CrawlStep[]> {
        // 如果没有展开按钮，移除点击和等待步骤
        return remainingSteps.filter(step => 
            !step.name.includes('click') && 
            !step.name.includes('expand') &&
            step.name !== 'wait_content_load'
        );
    }

    /**
     * 检测页面中是否存在展开按钮
     */
    private hasExpandButton(htmlContent: string): boolean {
        return htmlContent.includes('展开全文') || 
               htmlContent.includes('rich_media_js') ||
               htmlContent.includes('show more') ||
               htmlContent.includes('data-action="expand"');
    }

    /**
     * 创建抓取上下文
     */
    private createCrawlContext(sessionId: string, url: string, options: CrawlOptions): CrawlContext {
        const state = this.stateManager.getSessionState(sessionId);
        if (!state) {
            throw new Error(`会话状态不存在: ${sessionId}`);
        }

        return {
            sessionId,
            url,
            options,
            state,
            stepResults: new Map(),
            startTime: new Date(),
            currentStep: ''
        };
    }

    /**
     * 生成抓取结果
     */
    private generateCrawlResult(context: CrawlContext): CrawlResult {
        const finalSnapshot = context.stepResults.get('final_snapshot');
        const screenshot = context.stepResults.get('screenshot');
        
        // 基础结果结构
        const result: CrawlResult = {
            success: false,
            url: context.url,
            title: '',
            author: '',
            publish_time: '',
            content: '',
            images: [],
            file_path: '',
            crawl_time: new Date(),
            duration: Date.now() - context.startTime.getTime(),
            session_id: context.sessionId
        };

        try {
            // 检查是否有有效的内容快照
            if (finalSnapshot?.success && finalSnapshot.data) {
                result.success = true;
                result.content = finalSnapshot.data;
                
                // 提取基本信息（简化版本，后续会有专门的处理器）
                result.title = this.extractTitle(finalSnapshot.data);
                result.author = this.extractAuthor(finalSnapshot.data);
                result.publish_time = this.extractPublishTime(finalSnapshot.data);
                
                this.logger.info(`内容提取成功: 标题="${result.title}", 作者="${result.author}"`);
            } else {
                result.error = '无法获取有效的页面内容';
            }
            
        } catch (error) {
            result.success = false;
            result.error = error instanceof Error ? error.message : String(error);
            this.logger.error('生成抓取结果时发生错误', error);
        }

        return result;
    }

    /**
     * 简单的标题提取
     */
    private extractTitle(htmlContent: string): string {
        const titleMatch = htmlContent.match(/<h1[^>]*id="activity-name"[^>]*>([^<]+)<\/h1>/) ||
                          htmlContent.match(/<h1[^>]*class="[^"]*rich_media_title[^"]*"[^>]*>([^<]+)<\/h1>/) ||
                          htmlContent.match(/<title>([^<]+)<\/title>/);
        
        return titleMatch ? titleMatch[1].trim() : '未知标题';
    }

    /**
     * 简单的作者提取
     */
    private extractAuthor(htmlContent: string): string {
        const authorMatch = htmlContent.match(/<span[^>]*class="[^"]*account_nickname_inner[^"]*"[^>]*>([^<]+)<\/span>/) ||
                           htmlContent.match(/<span[^>]*class="[^"]*rich_media_meta_text[^"]*"[^>]*>([^<]+)<\/span>/);
        
        return authorMatch ? authorMatch[1].trim() : '未知作者';
    }

    /**
     * 简单的发布时间提取
     */
    private extractPublishTime(htmlContent: string): string {
        const timeMatch = htmlContent.match(/<span[^>]*id="publish_time"[^>]*>([^<]+)<\/span>/) ||
                         htmlContent.match(/(\d{4}-\d{2}-\d{2})/);
        
        return timeMatch ? timeMatch[1].trim() : '';
    }

    /**
     * 创建错误结果
     */
    private createErrorResult(url: string, error: any, sessionId?: string): CrawlResult {
        return {
            success: false,
            url,
            title: '',
            author: '',
            publish_time: '',
            content: '',
            images: [],
            file_path: '',
            crawl_time: new Date(),
            duration: 0,
            error: error instanceof Error ? error.message : String(error),
            session_id: sessionId
        };
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取状态管理器
     */
    getStateManager(): StateManager {
        return this.stateManager;
    }

    /**
     * 关闭编排器
     */
    async close(): Promise<void> {
        this.logger.info('关闭调用编排器');
        await this.playwrightClient.close();
        this.stateManager.destroy();
    }
} 