import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/Logger';
import { CrawlResult, CrawlContext, StepResult } from '../types/crawl.types';
import { ContentProcessor } from '../processors';
import { FileOutputAdapter } from '../adapters/FileOutputAdapter';

/**
 * 结果聚合器
 * 负责整合多个抓取步骤的结果，生成最终的爬取结果
 */
export class ResultAggregator {
    private logger: Logger;
    private contentProcessor: ContentProcessor;
    private fileOutputAdapter: FileOutputAdapter;

    constructor() {
        this.logger = new Logger('ResultAggregator');
        this.contentProcessor = new ContentProcessor();
        this.fileOutputAdapter = new FileOutputAdapter();
    }

    /**
     * 聚合单个会话的抓取结果
     */
    async aggregateResults(context: CrawlContext): Promise<CrawlResult> {
        try {
            this.logger.info(`开始聚合会话 ${context.sessionId} 的结果`);
            const startTime = Date.now();

            // 1. 获取关键步骤结果
            const snapshotResult = this.getStepResult(context, 'snapshot');
            const screenshotResult = this.getStepResult(context, 'screenshot');
            
            if (!snapshotResult || !snapshotResult.success) {
                throw new Error('未能获取有效的页面内容快照');
            }

            // 2. 处理HTML内容
            const htmlContent = snapshotResult.data;
            const processedResult = await this.contentProcessor.processContent(htmlContent, {
                url: context.url,
                cleanContent: context.options.clean_content,
                extractImages: context.options.save_images,
                convertToMarkdown: context.options.output_format === 'markdown',
                includeRawHtml: true
            });

            if (!processedResult.success) {
                throw new Error(processedResult.error || '内容处理失败');
            }

            // 3. 保存文件（如果需要）
            let savedFiles: string[] = [];
            if (context.options.output_format === 'markdown') {
                const saveResult = await this.fileOutputAdapter.saveCrawlResult(processedResult, {
                    saveMarkdown: true,
                    saveJson: true,
                    saveRawHtml: false,
                    saveImages: context.options.save_images,
                    filenamePrefix: `session_${context.sessionId}_`
                });
                savedFiles = saveResult.savedFiles;
                
                // 更新文件路径
                processedResult.file_path = savedFiles.find(f => f.endsWith('.md')) || '';
            }

            // 4. 添加截图信息
            if (screenshotResult && screenshotResult.success) {
                (processedResult as any).screenshot = screenshotResult.data;
            }

            // 5. 添加会话信息
            processedResult.session_id = context.sessionId;
            processedResult.crawl_time = context.startTime;
            processedResult.duration = Date.now() - startTime;

            // 6. 添加步骤执行信息
            (processedResult as any).stepResults = this.summarizeStepResults(context);

            this.logger.info(`会话 ${context.sessionId} 结果聚合完成，耗时 ${processedResult.duration}ms`);
            return processedResult;

        } catch (error) {
            this.logger.error(`聚合会话 ${context.sessionId} 结果失败`, error);
            
            return {
                success: false,
                url: context.url,
                title: '聚合失败',
                author: '',
                publish_time: '',
                content: '',
                images: [],
                file_path: '',
                crawl_time: context.startTime,
                duration: Date.now() - context.startTime.getTime(),
                error: error instanceof Error ? error.message : '未知聚合错误',
                session_id: context.sessionId
            };
        }
    }

    /**
     * 聚合批量抓取结果
     */
    async aggregateBatchResults(
        results: CrawlResult[],
        options: {
            createSummary?: boolean;
            outputDir?: string;
            sessionId?: string;
        } = {}
    ): Promise<{
        success: boolean;
        totalCount: number;
        successCount: number;
        failedCount: number;
        results: CrawlResult[];
        summaryPath?: string;
        aggregatedStats: {
            totalArticles: number;
            totalImages: number;
            totalSize: number;
            averageDuration: number;
            successRate: number;
        };
    }> {
        try {
            const { createSummary = true, outputDir = './output', sessionId = 'batch' } = options;
            
            this.logger.info(`开始聚合批量结果，共 ${results.length} 个结果`);

            const successCount = results.filter(r => r.success).length;
            const failedCount = results.length - successCount;
            
            // 计算聚合统计信息
            const aggregatedStats = this.calculateAggregatedStats(results);

            let summaryPath: string | undefined;

            // 创建批量摘要（可选）
            if (createSummary) {
                summaryPath = await this.createBatchSummary(results, {
                    outputDir,
                    sessionId,
                    stats: aggregatedStats
                });
            }

            const batchResult = {
                success: successCount > 0,
                totalCount: results.length,
                successCount,
                failedCount,
                results,
                summaryPath,
                aggregatedStats
            };

            this.logger.info(`批量结果聚合完成，成功: ${successCount}, 失败: ${failedCount}`);
            return batchResult;

        } catch (error) {
            this.logger.error('批量结果聚合失败', error);
            throw error;
        }
    }

    /**
     * 获取步骤执行结果
     */
    private getStepResult(context: CrawlContext, stepType: string): StepResult | null {
        for (const [stepName, result] of context.stepResults) {
            if (stepName.includes(stepType)) {
                return result;
            }
        }
        return null;
    }

    /**
     * 总结步骤执行情况
     */
    private summarizeStepResults(context: CrawlContext): {
        totalSteps: number;
        successfulSteps: number;
        failedSteps: number;
        stepDetails: Array<{
            name: string;
            success: boolean;
            duration?: number;
            error?: string;
        }>;
    } {
        const stepDetails: Array<{
            name: string;
            success: boolean;
            duration?: number;
            error?: string;
        }> = [];

        for (const [stepName, result] of context.stepResults) {
            stepDetails.push({
                name: stepName,
                success: result.success,
                duration: result.metadata?.duration,
                error: result.error
            });
        }

        const successfulSteps = stepDetails.filter(s => s.success).length;
        const failedSteps = stepDetails.length - successfulSteps;

        return {
            totalSteps: stepDetails.length,
            successfulSteps,
            failedSteps,
            stepDetails
        };
    }

    /**
     * 计算聚合统计信息
     */
    private calculateAggregatedStats(results: CrawlResult[]): {
        totalArticles: number;
        totalImages: number;
        totalSize: number;
        averageDuration: number;
        successRate: number;
    } {
        const successfulResults = results.filter(r => r.success);
        
        const totalImages = successfulResults.reduce((sum, r) => sum + r.images.length, 0);
        const totalSize = successfulResults.reduce((sum, r) => sum + r.content.length, 0);
        const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
        const averageDuration = results.length > 0 ? Math.round(totalDuration / results.length) : 0;
        const successRate = results.length > 0 ? Math.round((successfulResults.length / results.length) * 100) : 0;

        return {
            totalArticles: successfulResults.length,
            totalImages,
            totalSize,
            averageDuration,
            successRate
        };
    }

    /**
     * 创建批量抓取摘要
     */
    private async createBatchSummary(
        results: CrawlResult[],
        options: {
            outputDir: string;
            sessionId: string;
            stats: {
                totalArticles: number;
                totalImages: number;
                totalSize: number;
                averageDuration: number;
                successRate: number;
            };
        }
    ): Promise<string> {
        try {
            await this.fileOutputAdapter.initialize();
            this.fileOutputAdapter.setOutputDir(options.outputDir);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const summaryPath = `batch_summary_${options.sessionId}_${timestamp}.md`;

            let summary = `# 批量抓取摘要报告\n\n`;
            summary += `**会话ID:** ${options.sessionId}\n`;
            summary += `**生成时间:** ${new Date().toISOString()}\n`;
            summary += `**总计文章:** ${results.length}\n`;
            summary += `**成功抓取:** ${options.stats.totalArticles}\n`;
            summary += `**失败抓取:** ${results.length - options.stats.totalArticles}\n`;
            summary += `**成功率:** ${options.stats.successRate}%\n`;
            summary += `**总图片数:** ${options.stats.totalImages}\n`;
            summary += `**平均耗时:** ${options.stats.averageDuration}ms\n\n`;

            summary += `## 📊 统计概览\n\n`;
            summary += `| 指标 | 数值 |\n`;
            summary += `|------|------|\n`;
            summary += `| 总文章数 | ${results.length} |\n`;
            summary += `| 成功抓取 | ${options.stats.totalArticles} |\n`;
            summary += `| 失败抓取 | ${results.length - options.stats.totalArticles} |\n`;
            summary += `| 成功率 | ${options.stats.successRate}% |\n`;
            summary += `| 总内容大小 | ${this.formatBytes(options.stats.totalSize)} |\n`;
            summary += `| 平均处理时间 | ${options.stats.averageDuration}ms |\n\n`;

            summary += `## 📝 详细结果\n\n`;
            results.forEach((result, index) => {
                const status = result.success ? '✅ 成功' : '❌ 失败';
                summary += `### ${index + 1}. ${result.title}\n\n`;
                summary += `**状态:** ${status}\n`;
                summary += `**URL:** ${result.url}\n`;
                if (result.author) summary += `**作者:** ${result.author}\n`;
                if (result.publish_time) summary += `**发布时间:** ${result.publish_time}\n`;
                summary += `**内容长度:** ${result.content.length} 字符\n`;
                summary += `**图片数量:** ${result.images.length}\n`;
                summary += `**处理时间:** ${result.duration}ms\n`;
                if (result.file_path) summary += `**保存路径:** \`${result.file_path}\`\n`;
                if (result.error) summary += `**错误信息:** ${result.error}\n`;
                summary += `\n`;
            });

            // 保存摘要文件
            const fullPath = path.join(options.outputDir, summaryPath);
            await fs.writeFile(fullPath, summary, 'utf-8');
            
            this.logger.info(`批量摘要已保存: ${fullPath}`);
            return fullPath;

        } catch (error) {
            this.logger.error('创建批量摘要失败', error);
            throw error;
        }
    }

    /**
     * 格式化字节大小
     */
    private formatBytes(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * 获取聚合器统计信息
     */
    getAggregatorStats(): {
        processedSessions: number;
        totalProcessingTime: number;
        averageProcessingTime: number;
        successRate: number;
    } {
        // 这里可以添加实际的统计跟踪
        return {
            processedSessions: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0,
            successRate: 100
        };
    }

    /**
     * 清理临时数据
     */
    async cleanup(): Promise<void> {
        try {
            this.logger.info('结果聚合器清理开始');
            // 这里可以添加清理逻辑，如删除临时文件等
            this.logger.info('结果聚合器清理完成');
        } catch (error) {
            this.logger.error('结果聚合器清理失败', error);
        }
    }
} 