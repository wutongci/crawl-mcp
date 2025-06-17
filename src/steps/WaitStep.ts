import { BaseStep } from './BaseStep';
import { CrawlContext, StepResult } from '../types';
import { PlaywrightMCPClient } from '../clients/PlaywrightMCPClient';

/**
 * 等待步骤
 */
export class WaitStep extends BaseStep {
    private selector: string;
    private waitTimeout: number;
    private state: 'visible' | 'hidden' | 'attached' | 'detached';
    private playwrightClient: PlaywrightMCPClient;

    constructor(
        selector: string, 
        playwrightClient: PlaywrightMCPClient,
        waitTimeout: number = 15000,
        state: 'visible' | 'hidden' | 'attached' | 'detached' = 'visible'
    ) {
        super('wait', `等待元素: ${selector}`, true, waitTimeout);
        this.selector = selector;
        this.waitTimeout = waitTimeout;
        this.state = state;
        this.playwrightClient = playwrightClient;
    }

    async execute(context: CrawlContext): Promise<StepResult> {
        try {
            this.logger.info(`等待元素出现: ${this.selector} (状态: ${this.state})`);
            
            const startTime = Date.now();
            
            // 执行等待操作
            const result = await this.playwrightClient.waitFor(this.selector, {
                timeout: this.waitTimeout,
                state: this.state
            });
            
            const waitTime = Date.now() - startTime;
            
            if (result.success) {
                this.logger.info(`元素等待成功: ${this.selector} (耗时: ${waitTime}ms)`);
                
                return this.createSuccessResult(result.data, {
                    selector: this.selector,
                    state: this.state,
                    waitTime: waitTime,
                    found: result.data?.found || true
                });
            } else {
                this.logger.warn(`元素等待失败: ${this.selector} (耗时: ${waitTime}ms)`, result.error);
                
                // 对于等待步骤，我们可能希望继续执行而不是完全失败
                return this.createErrorResult(
                    result.error || '元素等待超时',
                    { found: false },
                    { 
                        selector: this.selector, 
                        state: this.state,
                        waitTime: waitTime,
                        failureReason: 'timeout' 
                    }
                );
            }
            
        } catch (error) {
            this.logger.error(`等待步骤异常: ${this.selector}`, error);
            
            return this.createErrorResult(
                error as Error,
                { found: false },
                { 
                    selector: this.selector, 
                    state: this.state,
                    failureReason: 'exception' 
                }
            );
        }
    }

    /**
     * 创建带有特定选择器的等待步骤
     */
    static forSelector(
        selector: string, 
        playwrightClient: PlaywrightMCPClient,
        timeout?: number
    ): WaitStep {
        return new WaitStep(selector, playwrightClient, timeout);
    }

    /**
     * 创建等待页面加载完成的步骤
     */
    static forPageLoad(playwrightClient: PlaywrightMCPClient): WaitStep {
        return new WaitStep('.rich_media_content', playwrightClient, 15000, 'visible');
    }

    /**
     * 创建等待内容加载完成的步骤
     */
    static forContentLoad(playwrightClient: PlaywrightMCPClient): WaitStep {
        return new WaitStep('#js_content', playwrightClient, 10000, 'visible');
    }

    /**
     * 创建等待展开按钮出现的步骤
     */
    static forExpandButton(playwrightClient: PlaywrightMCPClient): WaitStep {
        return new WaitStep('.rich_media_js', playwrightClient, 5000, 'visible');
    }

    /**
     * 获取选择器
     */
    getSelector(): string {
        return this.selector;
    }

    /**
     * 获取等待状态
     */
    getState(): string {
        return this.state;
    }
} 