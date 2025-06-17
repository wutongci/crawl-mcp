import { Logger } from '../utils/Logger';
import { ContentExtractor } from './ContentExtractor';
import { ContentCleaner } from './ContentCleaner';
import { MarkdownConverter } from './MarkdownConverter';
import { CrawlResult } from '../types/crawl.types';

/**
 * 统一的内容处理器
 * 整合提取、清理、转换等功能
 */
// Export individual processors
export { ContentExtractor } from './ContentExtractor';
export { ContentCleaner } from './ContentCleaner';
export { MarkdownConverter } from './MarkdownConverter';
export { ImageProcessor } from './ImageProcessor';

export class ContentProcessor {
    private logger: Logger;
    private extractor: ContentExtractor;
    private cleaner: ContentCleaner;
    private converter: MarkdownConverter;

    constructor() {
        this.logger = new Logger('ContentProcessor');
        this.extractor = new ContentExtractor();
        this.cleaner = new ContentCleaner();
        this.converter = new MarkdownConverter();
    }

    /**
     * 处理HTML内容，返回结构化的爬取结果
     */
    async processContent(htmlContent: string, options: {
        url: string;
        cleanContent?: boolean;
        extractImages?: boolean;
        convertToMarkdown?: boolean;
        includeRawHtml?: boolean;
    }): Promise<CrawlResult> {
        try {
            const {
                url,
                cleanContent = true,
                extractImages = true,
                convertToMarkdown = true,
                includeRawHtml = false
            } = options;

            this.logger.info(`开始处理内容，URL: ${url}`);
            const startTime = new Date();

            // 1. 提取基本信息
            const title = this.extractor.extractTitle(htmlContent);
            const author = this.extractor.extractAuthor(htmlContent);
            const publishTime = this.extractor.extractPublishTime(htmlContent);

            // 2. 提取正文内容
            let content = this.extractor.extractContent(htmlContent);

            // 3. 清理内容（可选）
            if (cleanContent) {
                const cleanedHtml = this.cleaner.cleanHtml(htmlContent);
                content = this.extractor.extractContent(cleanedHtml);
                content = this.cleaner.cleanText(content);
            }

            // 4. 转换为Markdown（可选）
            if (convertToMarkdown) {
                content = this.converter.convertToMarkdown(content);
            }

            // 5. 提取图片信息（可选）
            let images: Array<{ original_url: string; local_path: string; filename: string; size: number; mime_type: string; }> = [];
            if (extractImages) {
                const extractedImages = this.extractor.extractImages(htmlContent);
                images = extractedImages.map((img, index) => ({
                    original_url: img.url,
                    local_path: '',
                    filename: `image_${index + 1}.${this.getImageExtension(img.url)}`,
                    size: 0,
                    mime_type: this.guessMimeType(img.url)
                }));
            }

            // 6. 构建结果
            const result: CrawlResult = {
                success: true,
                url,
                title,
                author,
                publish_time: publishTime,
                content,
                images,
                file_path: '',
                crawl_time: startTime,
                duration: Date.now() - startTime.getTime(),
                session_id: undefined
            };

            // 7. 添加原始HTML（可选）
            if (includeRawHtml) {
                (result as any).rawHtml = htmlContent;
            }

            this.logger.info(`内容处理完成，标题: ${title}, 内容长度: ${content.length} 字符`);
            return result;

        } catch (error) {
            this.logger.error('内容处理失败', error);
            
            return {
                success: false,
                url: options.url,
                title: '处理失败',
                author: '',
                publish_time: '',
                content: '',
                images: [],
                file_path: '',
                crawl_time: new Date(),
                duration: 0,
                error: error instanceof Error ? error.message : '未知错误'
            };
        }
    }

    /**
     * 批量处理内容
     */
    async processBatchContent(
        contentItems: Array<{ html: string; url: string; }>,
        options: {
            cleanContent?: boolean;
            extractImages?: boolean;
            convertToMarkdown?: boolean;
            includeRawHtml?: boolean;
            concurrency?: number;
        } = {}
    ): Promise<CrawlResult[]> {
        try {
            const { concurrency = 3, ...processingOptions } = options;
            
            this.logger.info(`开始批量处理 ${contentItems.length} 个内容项`);

            const results: CrawlResult[] = [];
            
            // 分批处理以控制并发
            for (let i = 0; i < contentItems.length; i += concurrency) {
                const batch = contentItems.slice(i, i + concurrency);
                
                const batchPromises = batch.map((item, index) => 
                    this.processContent(item.html, {
                        url: item.url,
                        ...processingOptions
                    }).catch(error => {
                        this.logger.error(`批量处理第 ${i + index + 1} 项失败`, error);
                        return {
                            success: false,
                            url: item.url,
                            title: '处理失败',
                            author: '',
                            publish_time: '',
                            content: '',
                            images: [],
                            file_path: '',
                            crawl_time: new Date(),
                            duration: 0,
                            error: error instanceof Error ? error.message : '未知错误'
                        } as CrawlResult;
                    })
                );

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);

                // 添加批次间延迟
                if (i + concurrency < contentItems.length) {
                    await this.delay(1000);
                }
            }

            const successCount = results.filter(r => r.success).length;
            this.logger.info(`批量处理完成，成功: ${successCount}, 失败: ${results.length - successCount}`);

            return results;

        } catch (error) {
            this.logger.error('批量处理失败', error);
            throw error;
        }
    }

    /**
     * 创建完整的文章Markdown
     */
    async createArticleMarkdown(htmlContent: string, options: {
        url: string;
        includeMetadata?: boolean;
        includeFrontMatter?: boolean;
        additionalMetadata?: Record<string, any>;
    }): Promise<string> {
        try {
            const { url, includeMetadata = true, includeFrontMatter = false, additionalMetadata = {} } = options;

            // 处理内容
            const result = await this.processContent(htmlContent, {
                url,
                cleanContent: true,
                extractImages: true,
                convertToMarkdown: false // 在这里手动转换以获得更多控制
            });

            if (!result.success) {
                throw new Error(result.error || '内容处理失败');
            }

            // 创建文章数据
            const articleData = {
                title: result.title,
                author: result.author,
                publishTime: result.publish_time,
                content: result.content,
                images: result.images.map(img => ({
                    url: img.original_url,
                    alt: img.filename,
                    title: img.filename
                })),
                url: result.url
            };

            // 生成Markdown
            let markdown = this.converter.createArticleMarkdown(articleData);

            // 添加Front Matter（可选）
            if (includeFrontMatter) {
                const frontMatter = {
                    title: result.title,
                    author: result.author,
                    date: result.publish_time,
                    url: result.url,
                    crawled_at: new Date().toISOString(),
                    ...additionalMetadata
                };

                markdown = this.converter.convertToMarkdown('', {
                    addFrontMatter: true,
                    frontMatter
                }) + markdown;
            }

            return markdown;

        } catch (error) {
            this.logger.error('创建文章Markdown失败', error);
            throw error;
        }
    }

    /**
     * 获取处理统计信息
     */
    getProcessingStats(originalHtml: string, processedResult: CrawlResult): {
        originalSize: number;
        processedSize: number;
        compressionRatio: number;
        extractedImages: number;
        processingTime: number;
    } {
        const originalSize = originalHtml.length;
        const processedSize = processedResult.content.length;
        const compressionRatio = Math.round((1 - processedSize / originalSize) * 100);

        return {
            originalSize,
            processedSize,
            compressionRatio,
            extractedImages: processedResult.images.length,
            processingTime: processedResult.duration
        };
    }

    /**
     * 根据URL猜测图片扩展名
     */
    private getImageExtension(url: string): string {
        const match = url.match(/\.(jpg|jpeg|png|gif|webp|svg)(?:\?|$)/i);
        return match ? match[1].toLowerCase() : 'jpg';
    }

    /**
     * 根据URL猜测MIME类型
     */
    private guessMimeType(url: string): string {
        const extension = this.getImageExtension(url);
        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml'
        };
        return mimeTypes[extension] || 'image/jpeg';
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

 