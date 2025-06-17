import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '../utils/Logger';
import { ImageDownloader, ImageInfo, DownloadOptions } from '../utils/ImageDownloader';
import { CrawlArticleParams, CrawlArticleResult } from '../tools/crawlArticleTool';

export interface ArticleData {
    title: string;
    author: string;
    publish_time: string;
    content: string;
    html_content: string;
    url: string;
    images?: string[];
}

export interface ProcessingOptions {
    output_dir: string;
    save_images: boolean;
    clean_content: boolean;
    create_markdown: boolean;
    create_json: boolean;
}

export class ArticleProcessor {
    private logger: Logger;
    private imageDownloader: ImageDownloader;

    constructor() {
        this.logger = new Logger('ArticleProcessor');
        this.imageDownloader = new ImageDownloader();
    }

    /**
     * 处理完整的文章（包括图片下载）
     */
    async processArticle(
        articleData: ArticleData,
        params: CrawlArticleParams,
        options: ProcessingOptions
    ): Promise<CrawlArticleResult> {
        const startTime = Date.now();
        this.logger.info(`开始处理文章: ${articleData.title}`);

        try {
            // 1. 准备输出目录
            const articleDir = await this.prepareArticleDirectory(articleData.title, options.output_dir);
            
            // 2. 提取和下载图片
            let imageInfos: ImageInfo[] = [];
            if (options.save_images && params.save_images) {
                imageInfos = await this.downloadArticleImages(
                    articleData.html_content, 
                    articleDir
                );
            }

            // 3. 清理内容
            let processedContent = articleData.content;
            if (options.clean_content && params.clean_content) {
                processedContent = this.cleanContent(processedContent);
            }

            // 4. 更新图片引用
            if (imageInfos.length > 0) {
                processedContent = this.imageDownloader.updateMarkdownImageReferences(
                    processedContent,
                    imageInfos,
                    './images/'
                );
            }

            // 5. 生成文件
            const files = await this.generateOutputFiles(
                articleData,
                processedContent,
                imageInfos,
                articleDir,
                options
            );

            const duration = Date.now() - startTime;
            this.logger.info(`文章处理完成: ${articleData.title} (${duration}ms)`);

            // 6. 构建结果
            return {
                success: true,
                url: articleData.url,
                title: articleData.title,
                author: articleData.author,
                publish_time: articleData.publish_time,
                content: processedContent,
                images: imageInfos.map(img => ({
                    original_url: img.original_url,
                    local_path: img.local_path,
                    filename: img.filename,
                    size: img.size,
                    mime_type: img.mime_type
                })),
                file_path: files.markdown || files.json || '',
                crawl_time: new Date(),
                duration,
                strategy_used: params.strategy || 'basic',
                steps_completed: 6,
                total_steps: 6,
                metadata: {
                    word_count: processedContent.length,
                    image_count: imageInfos.length,
                    has_expand_button: false,
                    page_load_time: 0,
                    content_extraction_time: duration
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`文章处理失败: ${articleData.title} - ${errorMsg}`);

            return {
                success: false,
                url: articleData.url,
                title: articleData.title || '',
                author: articleData.author || '',
                publish_time: articleData.publish_time || '',
                content: '',
                images: [],
                file_path: '',
                crawl_time: new Date(),
                duration,
                strategy_used: params.strategy || 'basic',
                steps_completed: 0,
                total_steps: 6,
                error: errorMsg
            };
        }
    }

    /**
     * 下载文章中的所有图片
     */
    private async downloadArticleImages(
        htmlContent: string,
        articleDir: string
    ): Promise<ImageInfo[]> {
        this.logger.info('开始提取和下载图片...');

        try {
            // 提取图片URL
            const imageUrls = this.imageDownloader.extractImageUrlsFromHtml(htmlContent);
            
            if (imageUrls.length === 0) {
                this.logger.info('未发现图片');
                return [];
            }

            this.logger.info(`发现 ${imageUrls.length} 张图片，开始下载...`);

            // 准备图片下载选项
            const downloadOptions: DownloadOptions = {
                output_dir: path.join(articleDir, 'images'),
                create_subdir: false,
                max_file_size: 10 * 1024 * 1024, // 10MB
                timeout: 15000,
                retries: 3
            };

            // 确保图片目录存在
            await fs.ensureDir(downloadOptions.output_dir);

            // 下载图片
            const imageInfos = await this.imageDownloader.downloadImages(
                imageUrls,
                downloadOptions,
                (completed, total, current) => {
                    this.logger.info(`图片下载进度: ${completed}/${total} - ${current}`);
                }
            );

            const successCount = imageInfos.filter(img => img.download_success).length;
            const failCount = imageInfos.length - successCount;

            this.logger.info(`图片下载完成: 成功 ${successCount}, 失败 ${failCount}`);

            return imageInfos;

        } catch (error) {
            this.logger.error(`图片下载过程出错: ${error instanceof Error ? error.message : error}`);
            return [];
        }
    }

    /**
     * 清理文章内容
     */
    private cleanContent(content: string): string {
        let cleaned = content;

        // 移除常见的广告和推广内容
        const adPatterns = [
            /点击上方.*?关注我们/gi,
            /长按.*?识别.*?二维码/gi,
            /扫描.*?二维码.*?关注/gi,
            /更多精彩内容.*?请关注/gi,
            /点击.*?阅读原文/gi,
            /商务合作.*?联系/gi,
            /投稿.*?邮箱/gi,
            /版权声明.*?转载/gi
        ];

        for (const pattern of adPatterns) {
            cleaned = cleaned.replace(pattern, '');
        }

        // 清理多余的空行
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        
        // 清理开头和结尾的空白
        cleaned = cleaned.trim();

        return cleaned;
    }

    /**
     * 准备文章目录
     */
    private async prepareArticleDirectory(title: string, outputDir: string): Promise<string> {
        // 清理标题用作目录名
        const cleanTitle = title
            .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 保留字母数字中文和空格
            .replace(/\s+/g, '_') // 空格转下划线
            .substring(0, 50); // 限制长度

        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const dirName = `${timestamp}_${cleanTitle}`;
        
        const articleDir = path.join(outputDir, dirName);
        await fs.ensureDir(articleDir);
        
        return articleDir;
    }

    /**
     * 生成输出文件
     */
    private async generateOutputFiles(
        articleData: ArticleData,
        content: string,
        imageInfos: ImageInfo[],
        articleDir: string,
        options: ProcessingOptions
    ): Promise<{ markdown?: string; json?: string; }> {
        const files: { markdown?: string; json?: string; } = {};

        // 生成Markdown文件
        if (options.create_markdown) {
            const markdownContent = this.generateMarkdown(articleData, content, imageInfos);
            const markdownPath = path.join(articleDir, 'article.md');
            await fs.writeFile(markdownPath, markdownContent, 'utf-8');
            files.markdown = markdownPath;
            this.logger.info(`Markdown文件已保存: ${markdownPath}`);
        }

        // 生成JSON文件
        if (options.create_json) {
            const jsonData = {
                title: articleData.title,
                author: articleData.author,
                publish_time: articleData.publish_time,
                url: articleData.url,
                content: content,
                images: imageInfos,
                processed_at: new Date().toISOString(),
                statistics: {
                    word_count: content.length,
                    image_count: imageInfos.length,
                    successful_images: imageInfos.filter(img => img.download_success).length
                }
            };

            const jsonPath = path.join(articleDir, 'article.json');
            await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
            files.json = jsonPath;
            this.logger.info(`JSON文件已保存: ${jsonPath}`);
        }

        return files;
    }

    /**
     * 生成Markdown内容
     */
    private generateMarkdown(
        articleData: ArticleData,
        content: string,
        imageInfos: ImageInfo[]
    ): string {
        const successfulImages = imageInfos.filter(img => img.download_success);
        const failedImages = imageInfos.filter(img => !img.download_success);

        let markdown = `# ${articleData.title}\n\n`;
        
        markdown += `**作者**: ${articleData.author}\n`;
        markdown += `**发布时间**: ${articleData.publish_time}\n`;
        markdown += `**原文链接**: [点击查看原文](${articleData.url})\n\n`;
        
        if (imageInfos.length > 0) {
            markdown += `**图片统计**: 共 ${imageInfos.length} 张图片，成功下载 ${successfulImages.length} 张\n\n`;
        }

        markdown += `---\n\n`;
        
        markdown += content;
        
        markdown += `\n\n---\n\n`;
        
        if (failedImages.length > 0) {
            markdown += `## 下载失败的图片\n\n`;
            for (const img of failedImages) {
                markdown += `- [${img.original_url}](${img.original_url}) - ${img.error}\n`;
            }
            markdown += `\n`;
        }
        
        markdown += `*本文由 crawl-mcp 自动抓取于 ${new Date().toLocaleString()}*\n`;

        return markdown;
    }

    /**
     * 从playwright的页面快照中提取文章数据
     */
    extractArticleDataFromSnapshot(snapshotHtml: string): ArticleData {
        // 这里是一个简化的提取器，实际应用中可能需要更复杂的解析
        const titleMatch = snapshotHtml.match(/<title[^>]*>([^<]*)<\/title>/i) || 
                          snapshotHtml.match(/id="activity-name"[^>]*>([^<]*)</i) ||
                          snapshotHtml.match(/class="rich_media_title"[^>]*>([^<]*)</i);
        
        const authorMatch = snapshotHtml.match(/class="account_nickname_inner"[^>]*>([^<]*)</i) ||
                           snapshotHtml.match(/id="js_name"[^>]*>([^<]*)</i);
        
        const timeMatch = snapshotHtml.match(/id="publish_time"[^>]*>([^<]*)</i) ||
                         snapshotHtml.match(/class="publish_time"[^>]*>([^<]*)</i);
        
        const contentMatch = snapshotHtml.match(/id="js_content"[^>]*>([\s\S]*?)<\/div>/i) ||
                           snapshotHtml.match(/class="rich_media_content"[^>]*>([\s\S]*?)<\/div>/i);

        return {
            title: titleMatch ? titleMatch[1].trim() : '未知标题',
            author: authorMatch ? authorMatch[1].trim() : '未知作者',
            publish_time: timeMatch ? timeMatch[1].trim() : new Date().toISOString(),
            content: contentMatch ? this.htmlToMarkdown(contentMatch[1]) : '',
            html_content: snapshotHtml,
            url: ''
        };
    }

    /**
     * 简单的HTML转Markdown
     */
    private htmlToMarkdown(html: string): string {
        let markdown = html;
        
        // 基本的HTML标签转换
        markdown = markdown.replace(/<h([1-6])[^>]*>/gi, (match, level) => '#'.repeat(parseInt(level)) + ' ');
        markdown = markdown.replace(/<\/h[1-6]>/gi, '\n\n');
        markdown = markdown.replace(/<p[^>]*>/gi, '');
        markdown = markdown.replace(/<\/p>/gi, '\n\n');
        markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
        markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
        markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
        markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
        markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
        
        // 处理图片
        markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, '![图片]($1)');
        markdown = markdown.replace(/<img[^>]*data-src=["']([^"']*)["'][^>]*>/gi, '![图片]($1)');
        
        // 处理链接
        markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
        
        // 移除其他HTML标签
        markdown = markdown.replace(/<[^>]+>/g, '');
        
        // 解码HTML实体
        markdown = markdown.replace(/&nbsp;/g, ' ');
        markdown = markdown.replace(/&lt;/g, '<');
        markdown = markdown.replace(/&gt;/g, '>');
        markdown = markdown.replace(/&amp;/g, '&');
        markdown = markdown.replace(/&quot;/g, '"');
        
        // 清理多余的空行
        markdown = markdown.replace(/\n{3,}/g, '\n\n');
        
        return markdown.trim();
    }
} 