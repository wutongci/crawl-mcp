import { BaseStep } from './BaseStep';
import { CrawlContext, StepResult } from '../types';
import { PlaywrightMCPClient } from '../clients/PlaywrightMCPClient';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * 截图步骤
 */
export class ScreenshotStep extends BaseStep {
    private screenshotOptions: {
        path?: string;
        type?: 'png' | 'jpeg';
        quality?: number;
        fullPage?: boolean;
        clip?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
    private playwrightClient: PlaywrightMCPClient;

    constructor(
        playwrightClient: PlaywrightMCPClient,
        options: {
            path?: string;
            type?: 'png' | 'jpeg';
            quality?: number;
            fullPage?: boolean;
            clip?: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        } = {}
    ) {
        super('screenshot', '截取页面截图', true, 10000);
        this.screenshotOptions = {
            type: options.type || 'png',
            quality: options.quality,
            fullPage: options.fullPage !== false, // 默认全页截图
            clip: options.clip,
            path: options.path
        };
        this.playwrightClient = playwrightClient;
    }

    async execute(context: CrawlContext): Promise<StepResult> {
        try {
            this.logger.info('开始截取页面截图');
            
            const startTime = Date.now();
            
            // 准备截图路径
            const screenshotPath = await this.prepareScreenshotPath(context);
            const screenshotOptions = {
                ...this.screenshotOptions,
                path: screenshotPath
            };
            
            // 执行截图操作
            const result = await this.playwrightClient.takeScreenshot(screenshotOptions);
            
            const screenshotTime = Date.now() - startTime;
            
            if (result.success) {
                this.logger.info(`页面截图成功 (耗时: ${screenshotTime}ms, 路径: ${screenshotPath})`);
                
                // 获取截图文件信息
                const fileInfo = await this.getFileInfo(screenshotPath);
                
                return this.createSuccessResult(result.data, {
                    screenshotPath: screenshotPath,
                    screenshotTime: screenshotTime,
                    type: this.screenshotOptions.type,
                    fullPage: this.screenshotOptions.fullPage,
                    fileSize: fileInfo.size,
                    exists: fileInfo.exists
                });
            } else {
                this.logger.error('页面截图失败', result.error);
                
                return this.createErrorResult(
                    result.error || '截图失败',
                    null,
                    {
                        screenshotPath: screenshotPath,
                        screenshotTime: screenshotTime,
                        failureReason: 'screenshot_failed'
                    }
                );
            }
            
        } catch (error) {
            this.logger.error('截图步骤异常', error);
            
            return this.createErrorResult(
                error as Error,
                null,
                { failureReason: 'screenshot_exception' }
            );
        }
    }

    /**
     * 准备截图路径
     */
    private async prepareScreenshotPath(context: CrawlContext): Promise<string> {
        if (this.screenshotOptions.path) {
            return this.screenshotOptions.path;
        }
        
        // 生成默认截图路径
        const outputDir = process.env.CRAWL_OUTPUT_DIR || './crawled_articles';
        const screenshotsDir = path.join(outputDir, 'screenshots');
        
        // 确保目录存在
        await fs.ensureDir(screenshotsDir);
        
        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const sessionId = context.sessionId.substring(0, 8);
        const extension = this.screenshotOptions.type || 'png';
        const filename = `screenshot-${sessionId}-${timestamp}.${extension}`;
        
        return path.join(screenshotsDir, filename);
    }

    /**
     * 获取文件信息
     */
    private async getFileInfo(filePath: string): Promise<{ exists: boolean; size: number }> {
        try {
            const stats = await fs.stat(filePath);
            return {
                exists: true,
                size: stats.size
            };
        } catch {
            return {
                exists: false,
                size: 0
            };
        }
    }

    /**
     * 创建全页截图步骤
     */
    static fullPage(playwrightClient: PlaywrightMCPClient, path?: string): ScreenshotStep {
        return new ScreenshotStep(playwrightClient, {
            fullPage: true,
            type: 'png',
            path: path
        });
    }

    /**
     * 创建可见区域截图步骤
     */
    static viewport(playwrightClient: PlaywrightMCPClient, path?: string): ScreenshotStep {
        return new ScreenshotStep(playwrightClient, {
            fullPage: false,
            type: 'png',
            path: path
        });
    }

    /**
     * 创建指定区域截图步骤
     */
    static clip(
        playwrightClient: PlaywrightMCPClient,
        clip: { x: number; y: number; width: number; height: number },
        path?: string
    ): ScreenshotStep {
        return new ScreenshotStep(playwrightClient, {
            fullPage: false,
            type: 'png',
            clip: clip,
            path: path
        });
    }

    /**
     * 创建高质量JPEG截图步骤
     */
    static jpeg(playwrightClient: PlaywrightMCPClient, quality: number = 90, path?: string): ScreenshotStep {
        return new ScreenshotStep(playwrightClient, {
            fullPage: true,
            type: 'jpeg',
            quality: quality,
            path: path
        });
    }

    /**
     * 获取截图选项
     */
    getScreenshotOptions(): typeof this.screenshotOptions {
        return { ...this.screenshotOptions };
    }
} 