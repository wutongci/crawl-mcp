import { BaseStep } from './BaseStep';
import { CrawlContext, StepResult } from '../types';
import { PlaywrightMCPClient } from '../clients/PlaywrightMCPClient';

/**
 * 内容快照步骤
 */
export class SnapshotStep extends BaseStep {
    private snapshotType: 'initial' | 'final' | 'custom';
    private selector?: string;
    private playwrightClient: PlaywrightMCPClient;

    constructor(
        snapshotType: 'initial' | 'final' | 'custom',
        playwrightClient: PlaywrightMCPClient,
        selector?: string
    ) {
        super(
            `${snapshotType}_snapshot`,
            `获取${snapshotType}内容快照`,
            true,
            15000
        );
        this.snapshotType = snapshotType;
        this.selector = selector;
        this.playwrightClient = playwrightClient;
    }

    async execute(context: CrawlContext): Promise<StepResult> {
        try {
            this.logger.info(`开始获取${this.snapshotType}内容快照`);
            
            const startTime = Date.now();
            
            // 执行内容快照
            const result = await this.playwrightClient.snapshot({
                selector: this.selector,
                fullPage: true
            });
            
            const snapshotTime = Date.now() - startTime;
            
            if (result.success && result.data) {
                const contentLength = typeof result.data === 'string' ? result.data.length : 0;
                
                this.logger.info(
                    `${this.snapshotType}内容快照获取成功 (耗时: ${snapshotTime}ms, 内容长度: ${contentLength})`
                );
                
                return this.createSuccessResult(result.data, {
                    snapshotType: this.snapshotType,
                    selector: this.selector,
                    snapshotTime: snapshotTime,
                    contentLength: contentLength,
                    hasContent: contentLength > 0,
                    timestamp: new Date()
                });
            } else {
                this.logger.error(`${this.snapshotType}内容快照获取失败`, result.error);
                
                return this.createErrorResult(
                    result.error || '内容快照获取失败',
                    null,
                    { 
                        snapshotType: this.snapshotType,
                        selector: this.selector,
                        snapshotTime: snapshotTime,
                        failureReason: 'snapshot_failed' 
                    }
                );
            }
            
        } catch (error) {
            this.logger.error(`${this.snapshotType}内容快照异常`, error);
            
            return this.createErrorResult(
                error as Error,
                null,
                { 
                    snapshotType: this.snapshotType,
                    selector: this.selector,
                    failureReason: 'snapshot_exception' 
                }
            );
        }
    }

    /**
     * 分析快照内容
     */
    private analyzeContent(htmlContent: string): {
        hasExpandButton: boolean;
        hasImages: boolean;
        textLength: number;
        imageCount: number;
    } {
        const hasExpandButton = htmlContent.includes('rich_media_js') || 
                               htmlContent.includes('展开全文') ||
                               htmlContent.includes('show more');
        
        const hasImages = htmlContent.includes('<img') || 
                         htmlContent.includes('data-src=');
        
        // 简单的文本长度估算
        const textContent = htmlContent.replace(/<[^>]*>/g, '');
        const textLength = textContent.length;
        
        // 简单的图片数量统计
        const imageMatches = htmlContent.match(/<img[^>]*>/g) || [];
        const imageCount = imageMatches.length;
        
        return {
            hasExpandButton,
            hasImages,
            textLength,
            imageCount
        };
    }

    /**
     * 后置处理，分析快照内容
     */
    protected async postExecute(context: CrawlContext, result: StepResult): Promise<void> {
        await super.postExecute(context, result);
        
        if (result.success && typeof result.data === 'string') {
            const analysis = this.analyzeContent(result.data);
            
            // 将分析结果添加到元数据中
            if (result.metadata) {
                result.metadata = {
                    ...result.metadata,
                    ...analysis
                };
            }
            
            this.logger.debug(`内容分析结果:`, analysis);
        }
    }

    /**
     * 创建初始快照步骤
     */
    static initial(playwrightClient: PlaywrightMCPClient): SnapshotStep {
        return new SnapshotStep('initial', playwrightClient);
    }

    /**
     * 创建最终快照步骤
     */
    static final(playwrightClient: PlaywrightMCPClient): SnapshotStep {
        return new SnapshotStep('final', playwrightClient);
    }

    /**
     * 创建自定义快照步骤
     */
    static custom(playwrightClient: PlaywrightMCPClient, selector?: string): SnapshotStep {
        return new SnapshotStep('custom', playwrightClient, selector);
    }

    /**
     * 获取快照类型
     */
    getSnapshotType(): string {
        return this.snapshotType;
    }

    /**
     * 获取选择器
     */
    getSelector(): string | undefined {
        return this.selector;
    }
} 