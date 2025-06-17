import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/Logger';
import { CrawlResult } from '../types/crawl.types';

/**
 * 文件输出适配器
 * 负责将爬取结果保存到文件系统
 */
export class FileOutputAdapter {
    private logger: Logger;
    private outputDir: string;

    constructor(outputDir: string = './output') {
        this.logger = new Logger('FileOutputAdapter');
        this.outputDir = outputDir;
    }

    /**
     * 初始化输出目录
     */
    async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            
            // 创建子目录
            const subDirs = ['articles', 'images', 'raw', 'metadata'];
            for (const subDir of subDirs) {
                await fs.mkdir(path.join(this.outputDir, subDir), { recursive: true });
            }

            this.logger.info(`输出目录初始化完成: ${this.outputDir}`);
        } catch (error) {
            this.logger.error('输出目录初始化失败', error);
            throw error;
        }
    }

    /**
     * 保存单个爬取结果
     */
    async saveCrawlResult(result: CrawlResult, options: {
        saveMarkdown?: boolean;
        saveJson?: boolean;
        saveRawHtml?: boolean;
        saveImages?: boolean;
        filenamePrefix?: string;
    } = {}): Promise<{
        savedFiles: string[];
        totalSize: number;
    }> {
        try {
            const {
                saveMarkdown = true,
                saveJson = true,
                saveRawHtml = false,
                saveImages = false,
                filenamePrefix = ''
            } = options;

            const savedFiles: string[] = [];
            let totalSize = 0;

            // 生成文件名基础部分
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const baseFilename = this.sanitizeFilename(
                `${filenamePrefix}${result.title || 'article'}_${timestamp}`
            );

            // 保存 Markdown 文件
            if (saveMarkdown && result.content) {
                const markdownPath = path.join(this.outputDir, 'articles', `${baseFilename}.md`);
                await fs.writeFile(markdownPath, result.content, 'utf-8');
                const stats = await fs.stat(markdownPath);
                savedFiles.push(markdownPath);
                totalSize += stats.size;
                this.logger.info(`Markdown文件已保存: ${markdownPath}`);
            }

            // 保存 JSON 元数据
            if (saveJson) {
                const jsonPath = path.join(this.outputDir, 'metadata', `${baseFilename}.json`);
                const metadata = {
                    ...result,
                    crawledAt: new Date().toISOString(),
                    files: savedFiles
                };
                await fs.writeFile(jsonPath, JSON.stringify(metadata, null, 2), 'utf-8');
                const stats = await fs.stat(jsonPath);
                savedFiles.push(jsonPath);
                totalSize += stats.size;
                this.logger.info(`JSON元数据已保存: ${jsonPath}`);
            }

            // 保存原始 HTML（如果有的话）
            if (saveRawHtml && (result as any).rawHtml) {
                const htmlPath = path.join(this.outputDir, 'raw', `${baseFilename}.html`);
                await fs.writeFile(htmlPath, (result as any).rawHtml, 'utf-8');
                const stats = await fs.stat(htmlPath);
                savedFiles.push(htmlPath);
                totalSize += stats.size;
                this.logger.info(`原始HTML已保存: ${htmlPath}`);
            }

            // 保存图片（如果需要）
            if (saveImages && result.images && result.images.length > 0) {
                const imageDir = path.join(this.outputDir, 'images', baseFilename);
                await fs.mkdir(imageDir, { recursive: true });

                for (let i = 0; i < result.images.length; i++) {
                    const image = result.images[i];
                    try {
                        // 这里只保存图片URL信息，实际下载需要额外实现
                        const imageInfoPath = path.join(imageDir, `image_${i + 1}_info.json`);
                        await fs.writeFile(imageInfoPath, JSON.stringify(image, null, 2), 'utf-8');
                        const stats = await fs.stat(imageInfoPath);
                        savedFiles.push(imageInfoPath);
                        totalSize += stats.size;
                    } catch (error) {
                        this.logger.warn(`图片信息保存失败: ${image.original_url}`, error);
                    }
                }
            }

            this.logger.info(`爬取结果保存完成，共保存 ${savedFiles.length} 个文件，总大小: ${this.formatFileSize(totalSize)}`);

            return {
                savedFiles,
                totalSize
            };

        } catch (error) {
            this.logger.error('保存爬取结果失败', error);
            throw error;
        }
    }

    /**
     * 批量保存爬取结果
     */
    async saveBatchResults(results: CrawlResult[], options: {
        saveMarkdown?: boolean;
        saveJson?: boolean;
        saveRawHtml?: boolean;
        saveImages?: boolean;
        createSummary?: boolean;
        filenamePrefix?: string;
    } = {}): Promise<{
        savedFiles: string[];
        totalSize: number;
        successCount: number;
        failureCount: number;
    }> {
        try {
            const {
                createSummary = true,
                ...saveOptions
            } = options;

            let allSavedFiles: string[] = [];
            let totalSize = 0;
            let successCount = 0;
            let failureCount = 0;

            this.logger.info(`开始批量保存 ${results.length} 个爬取结果`);

            // 保存每个结果
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                try {
                    const saveResult = await this.saveCrawlResult(result, {
                        ...saveOptions,
                        filenamePrefix: `batch_${i + 1}_`
                    });
                    
                    allSavedFiles.push(...saveResult.savedFiles);
                    totalSize += saveResult.totalSize;
                    successCount++;

                } catch (error) {
                    this.logger.error(`保存第 ${i + 1} 个结果失败`, error);
                    failureCount++;
                }
            }

            // 创建批量摘要
            if (createSummary) {
                const summaryPath = await this.createBatchSummary(results, {
                    savedFiles: allSavedFiles,
                    totalSize,
                    successCount,
                    failureCount
                });
                allSavedFiles.push(summaryPath);
            }

            this.logger.info(`批量保存完成，成功: ${successCount}，失败: ${failureCount}`);

            return {
                savedFiles: allSavedFiles,
                totalSize,
                successCount,
                failureCount
            };

        } catch (error) {
            this.logger.error('批量保存失败', error);
            throw error;
        }
    }

    /**
     * 创建批量摘要文件
     */
    private async createBatchSummary(results: CrawlResult[], stats: {
        savedFiles: string[];
        totalSize: number;
        successCount: number;
        failureCount: number;
    }): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const summaryPath = path.join(this.outputDir, `batch_summary_${timestamp}.md`);

        let summary = `# 批量爬取摘要\n\n`;
        summary += `**爬取时间:** ${new Date().toISOString()}\n`;
        summary += `**总计文章:** ${results.length}\n`;
        summary += `**成功保存:** ${stats.successCount}\n`;
        summary += `**保存失败:** ${stats.failureCount}\n`;
        summary += `**文件总数:** ${stats.savedFiles.length}\n`;
        summary += `**总文件大小:** ${this.formatFileSize(stats.totalSize)}\n\n`;

        summary += `## 文章列表\n\n`;
        results.forEach((result, index) => {
            summary += `${index + 1}. **${result.title || '未知标题'}**\n`;
            if (result.author) summary += `   - 作者: ${result.author}\n`;
            if (result.publish_time) summary += `   - 发布时间: ${result.publish_time}\n`;
            if (result.url) summary += `   - 原文链接: ${result.url}\n`;
            summary += `   - 内容长度: ${result.content?.length || 0} 字符\n`;
            if (result.images) summary += `   - 图片数量: ${result.images.length}\n`;
            summary += `\n`;
        });

        summary += `## 保存的文件\n\n`;
        stats.savedFiles.forEach((file, index) => {
            summary += `${index + 1}. \`${file}\`\n`;
        });

        await fs.writeFile(summaryPath, summary, 'utf-8');
        this.logger.info(`批量摘要已保存: ${summaryPath}`);

        return summaryPath;
    }

    /**
     * 导出为压缩包
     */
    async exportToArchive(archivePath: string, options: {
        includeArticles?: boolean;
        includeImages?: boolean;
        includeRaw?: boolean;
        includeMetadata?: boolean;
    } = {}): Promise<{
        archivePath: string;
        fileCount: number;
        archiveSize: number;
    }> {
        try {
            // 注意：这里需要额外的压缩库（如node-archiver）
            // 暂时返回模拟结果
            this.logger.warn('压缩导出功能需要额外的压缩库支持');
            
            return {
                archivePath,
                fileCount: 0,
                archiveSize: 0
            };
        } catch (error) {
            this.logger.error('导出压缩包失败', error);
            throw error;
        }
    }

    /**
     * 清理旧文件
     */
    async cleanupOldFiles(olderThanDays: number = 30): Promise<{
        deletedFiles: string[];
        freedSpace: number;
    }> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

            const deletedFiles: string[] = [];
            let freedSpace = 0;

            const subDirs = ['articles', 'images', 'raw', 'metadata'];
            
            for (const subDir of subDirs) {
                const dirPath = path.join(this.outputDir, subDir);
                try {
                    const files = await fs.readdir(dirPath);
                    
                    for (const file of files) {
                        const filePath = path.join(dirPath, file);
                        const stats = await fs.stat(filePath);
                        
                        if (stats.mtime < cutoffDate) {
                            freedSpace += stats.size;
                            await fs.unlink(filePath);
                            deletedFiles.push(filePath);
                        }
                    }
                } catch (error) {
                    this.logger.warn(`清理目录失败: ${dirPath}`, error);
                }
            }

            this.logger.info(`清理完成，删除 ${deletedFiles.length} 个文件，释放 ${this.formatFileSize(freedSpace)} 空间`);

            return {
                deletedFiles,
                freedSpace
            };

        } catch (error) {
            this.logger.error('清理旧文件失败', error);
            throw error;
        }
    }

    /**
     * 获取输出目录统计信息
     */
    async getOutputStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        articleCount: number;
        imageCount: number;
        rawCount: number;
        metadataCount: number;
    }> {
        try {
            let totalFiles = 0;
            let totalSize = 0;
            let articleCount = 0;
            let imageCount = 0;
            let rawCount = 0;
            let metadataCount = 0;

            const subDirs = [
                { name: 'articles', counter: () => articleCount++ },
                { name: 'images', counter: () => imageCount++ },
                { name: 'raw', counter: () => rawCount++ },
                { name: 'metadata', counter: () => metadataCount++ }
            ];

            for (const subDir of subDirs) {
                const dirPath = path.join(this.outputDir, subDir.name);
                try {
                    const files = await fs.readdir(dirPath, { withFileTypes: true });
                    
                    for (const file of files) {
                        if (file.isFile()) {
                            const filePath = path.join(dirPath, file.name);
                            const stats = await fs.stat(filePath);
                            totalFiles++;
                            totalSize += stats.size;
                            subDir.counter();
                        }
                    }
                } catch (error) {
                    // 目录可能不存在，忽略错误
                }
            }

            return {
                totalFiles,
                totalSize,
                articleCount,
                imageCount,
                rawCount,
                metadataCount
            };

        } catch (error) {
            this.logger.error('获取输出统计失败', error);
            throw error;
        }
    }

    /**
     * 清理文件名
     */
    private sanitizeFilename(filename: string): string {
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')  // 替换非法字符
            .replace(/\s+/g, '_')          // 替换空格
            .replace(/_+/g, '_')           // 合并多个下划线
            .replace(/^_|_$/g, '')         // 移除首尾下划线
            .substring(0, 100);            // 限制长度
    }

    /**
     * 格式化文件大小
     */
    private formatFileSize(bytes: number): string {
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
     * 设置输出目录
     */
    setOutputDir(newOutputDir: string): void {
        this.outputDir = newOutputDir;
        this.logger.info(`输出目录已更改为: ${newOutputDir}`);
    }

    /**
     * 获取当前输出目录
     */
    getOutputDir(): string {
        return this.outputDir;
    }
} 