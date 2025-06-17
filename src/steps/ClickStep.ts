import { BaseStep } from './BaseStep';
import { CrawlContext, StepResult } from '../types';
import { PlaywrightMCPClient } from '../clients/PlaywrightMCPClient';

/**
 * 点击步骤
 */
export class ClickStep extends BaseStep {
    private selector: string;
    private optional: boolean;
    private clickOptions: {
        button?: 'left' | 'right' | 'middle';
        clickCount?: number;
        delay?: number;
        force?: boolean;
        timeout?: number;
    };
    private playwrightClient: PlaywrightMCPClient;

    constructor(
        selector: string,
        playwrightClient: PlaywrightMCPClient,
        options: {
            optional?: boolean;
            button?: 'left' | 'right' | 'middle';
            clickCount?: number;
            delay?: number;
            force?: boolean;
            timeout?: number;
        } = {}
    ) {
        super('click', `点击元素: ${selector}`, true, options.timeout || 10000);
        this.selector = selector;
        this.optional = options.optional || false;
        this.clickOptions = {
            button: options.button || 'left',
            clickCount: options.clickCount || 1,
            delay: options.delay || 0,
            force: options.force || false,
            timeout: options.timeout || 10000
        };
        this.playwrightClient = playwrightClient;
    }

    async execute(context: CrawlContext): Promise<StepResult> {
        try {
            this.logger.info(`开始点击元素: ${this.selector} (可选: ${this.optional})`);
            
            const startTime = Date.now();
            
            // 先检查元素是否存在（如果是可选的）
            if (this.optional) {
                const waitResult = await this.playwrightClient.waitFor(this.selector, {
                    timeout: 2000, // 短暂等待
                    state: 'visible'
                });
                
                if (!waitResult.success) {
                    this.logger.info(`可选元素不存在，跳过点击: ${this.selector}`);
                    return this.createSuccessResult(
                        { clicked: false, skipped: true },
                        {
                            selector: this.selector,
                            optional: this.optional,
                            skipped: true,
                            reason: 'element_not_found'
                        }
                    );
                }
            }
            
            // 执行点击操作
            const result = await this.playwrightClient.click(this.selector, this.clickOptions);
            
            const clickTime = Date.now() - startTime;
            
            if (result.success) {
                this.logger.info(`元素点击成功: ${this.selector} (耗时: ${clickTime}ms)`);
                
                return this.createSuccessResult(result.data, {
                    selector: this.selector,
                    optional: this.optional,
                    clickTime: clickTime,
                    button: this.clickOptions.button,
                    clickCount: this.clickOptions.clickCount,
                    clicked: true
                });
            } else {
                const errorMessage = result.error || '点击失败';
                
                if (this.optional) {
                    this.logger.warn(`可选元素点击失败，继续执行: ${this.selector}`, errorMessage);
                    return this.createSuccessResult(
                        { clicked: false, failed: true },
                        {
                            selector: this.selector,
                            optional: this.optional,
                            clickTime: clickTime,
                            error: errorMessage,
                            failureReason: 'click_failed_optional'
                        }
                    );
                } else {
                    this.logger.error(`必需元素点击失败: ${this.selector}`, errorMessage);
                    return this.createErrorResult(
                        errorMessage,
                        { clicked: false },
                        {
                            selector: this.selector,
                            optional: this.optional,
                            clickTime: clickTime,
                            failureReason: 'click_failed_required'
                        }
                    );
                }
            }
            
        } catch (error) {
            this.logger.error(`点击步骤异常: ${this.selector}`, error);
            
            if (this.optional) {
                return this.createSuccessResult(
                    { clicked: false, exception: true },
                    {
                        selector: this.selector,
                        optional: this.optional,
                        error: error instanceof Error ? error.message : String(error),
                        failureReason: 'click_exception_optional'
                    }
                );
            } else {
                return this.createErrorResult(
                    error as Error,
                    { clicked: false },
                    {
                        selector: this.selector,
                        optional: this.optional,
                        failureReason: 'click_exception_required'
                    }
                );
            }
        }
    }

    /**
     * 创建展开按钮点击步骤
     */
    static forExpandButton(playwrightClient: PlaywrightMCPClient): ClickStep {
        return new ClickStep('.rich_media_js', playwrightClient, {
            optional: true,
            timeout: 5000,
            delay: 500 // 点击后稍等一下
        });
    }

    /**
     * 创建通用可选点击步骤
     */
    static optional(selector: string, playwrightClient: PlaywrightMCPClient): ClickStep {
        return new ClickStep(selector, playwrightClient, {
            optional: true
        });
    }

    /**
     * 创建必需点击步骤
     */
    static required(selector: string, playwrightClient: PlaywrightMCPClient): ClickStep {
        return new ClickStep(selector, playwrightClient, {
            optional: false
        });
    }

    /**
     * 获取选择器
     */
    getSelector(): string {
        return this.selector;
    }

    /**
     * 是否为可选点击
     */
    isOptional(): boolean {
        return this.optional;
    }

    /**
     * 获取点击选项
     */
    getClickOptions(): typeof this.clickOptions {
        return { ...this.clickOptions };
    }
} 