import { BaseStep } from './BaseStep';
import { CrawlContext, StepResult } from '../types';
import { PlaywrightMCPClient } from '../clients/PlaywrightMCPClient';

/**
 * 页面导航步骤
 */
export class NavigateStep extends BaseStep {
    private url: string;
    private playwrightClient: PlaywrightMCPClient;

    constructor(url: string, playwrightClient: PlaywrightMCPClient) {
        super('navigate', `导航到页面: ${url}`, false, 30000); // 导航失败不可重试
        this.url = url;
        this.playwrightClient = playwrightClient;
    }

    async execute(context: CrawlContext): Promise<StepResult> {
        try {
            this.logger.info(`开始导航到: ${this.url}`);
            
            // 执行页面导航
            const result = await this.playwrightClient.navigate(this.url, {
                waitUntil: 'domcontentloaded',
                timeout: this.timeout
            });
            
            if (result.success) {
                this.logger.info(`页面导航成功: ${this.url}`);
                
                return this.createSuccessResult(result.data, {
                    url: this.url,
                    loadTime: result.metadata?.loadTime || 0,
                    navigationType: 'initial'
                });
            } else {
                this.logger.error(`页面导航失败: ${this.url}`, result.error);
                
                return this.createErrorResult(
                    result.error || '导航失败',
                    null,
                    { url: this.url, failureReason: 'navigation_failed' }
                );
            }
            
        } catch (error) {
            this.logger.error(`导航步骤异常: ${this.url}`, error);
            
            return this.createErrorResult(
                error as Error,
                null,
                { url: this.url, failureReason: 'navigation_exception' }
            );
        }
    }

    /**
     * 验证URL格式
     */
    protected async preExecute(context: CrawlContext): Promise<boolean> {
        const canExecute = await super.preExecute(context);
        if (!canExecute) return false;

        // 验证URL格式
        if (!this.isValidWechatUrl(this.url)) {
            this.logger.error(`无效的微信文章URL: ${this.url}`);
            return false;
        }

        return true;
    }

    /**
     * 验证是否为有效的微信文章URL
     */
    private isValidWechatUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === 'mp.weixin.qq.com' && 
                   urlObj.pathname.startsWith('/s/');
        } catch {
            return false;
        }
    }

    /**
     * 获取目标URL
     */
    getUrl(): string {
        return this.url;
    }
} 