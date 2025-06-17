import { Logger } from '../utils/Logger';
import { WECHAT_SELECTORS, getSelector } from '../config/wechatSelectors';

/**
 * 内容提取器
 * 负责从HTML中提取微信文章的关键信息
 */
export class ContentExtractor {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('ContentExtractor');
    }

    /**
     * 从HTML中提取文章标题
     */
    extractTitle(htmlContent: string): string {
        try {
            // 使用多种选择器策略
            const titleSelectors = [
                '#activity-name',
                '.rich_media_title',
                'h1.rich_media_title',
                'h1',
                'title'
            ];

            for (const selector of titleSelectors) {
                const regex = new RegExp(`<${selector}[^>]*>([^<]+)<`, 'i');
                const match = htmlContent.match(regex);
                if (match && match[1]) {
                    const title = this.cleanText(match[1]);
                    if (title.length > 0) {
                        this.logger.debug(`标题提取成功，使用选择器: ${selector}`);
                        return title;
                    }
                }
            }

            // 从页面title标签提取
            const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)</i);
            if (titleMatch && titleMatch[1]) {
                const title = this.cleanText(titleMatch[1]);
                if (title && !title.includes('微信公众平台')) {
                    return title;
                }
            }

            this.logger.warn('未能提取到有效标题');
            return '未知标题';

        } catch (error) {
            this.logger.error('标题提取失败', error);
            return '未知标题';
        }
    }

    /**
     * 从HTML中提取作者信息
     */
    extractAuthor(htmlContent: string): string {
        try {
            const authorSelectors = [
                'class="account_nickname_inner"[^>]*>([^<]+)',
                'class="rich_media_meta_nickname"[^>]*>([^<]+)',
                'class="rich_media_meta_text"[^>]*>([^<]+)',
                'id="profileBt"[^>]*>([^<]+)'
            ];

            for (const selectorPattern of authorSelectors) {
                const regex = new RegExp(selectorPattern, 'i');
                const match = htmlContent.match(regex);
                if (match && match[1]) {
                    const author = this.cleanText(match[1]);
                    if (author.length > 0 && !this.isTimeString(author)) {
                        this.logger.debug(`作者提取成功: ${author}`);
                        return author;
                    }
                }
            }

            this.logger.warn('未能提取到有效作者信息');
            return '未知作者';

        } catch (error) {
            this.logger.error('作者提取失败', error);
            return '未知作者';
        }
    }

    /**
     * 从HTML中提取发布时间
     */
    extractPublishTime(htmlContent: string): string {
        try {
            // 查找时间相关的模式
            const timePatterns = [
                /id="publish_time"[^>]*>([^<]+)/i,
                /class="rich_media_meta_text"[^>]*>([^<]+)/i,
                /(\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?)/g,
                /(\d{4}-\d{2}-\d{2})/g
            ];

            for (const pattern of timePatterns) {
                const matches = htmlContent.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        const timeText = typeof match === 'string' ? match : match[1];
                        if (this.isTimeString(timeText)) {
                            const normalizedTime = this.normalizeTimeString(timeText);
                            this.logger.debug(`发布时间提取成功: ${normalizedTime}`);
                            return normalizedTime;
                        }
                    }
                }
            }

            this.logger.warn('未能提取到发布时间');
            return '';

        } catch (error) {
            this.logger.error('发布时间提取失败', error);
            return '';
        }
    }

    /**
     * 从HTML中提取正文内容
     */
    extractContent(htmlContent: string): string {
        try {
            // 查找内容区域
            const contentPatterns = [
                /<div class="rich_media_content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div id="js_content"[^>]*>([\s\S]*?)<\/div>/i,
                /<section[^>]*>([\s\S]*?)<\/section>/i
            ];

            let contentHtml = '';
            for (const pattern of contentPatterns) {
                const match = htmlContent.match(pattern);
                if (match && match[1]) {
                    contentHtml = match[1];
                    break;
                }
            }

            if (!contentHtml) {
                this.logger.warn('未找到内容区域');
                return '';
            }

            // 提取文本内容
            const textContent = this.extractTextFromHtml(contentHtml);
            
            this.logger.info(`内容提取成功，长度: ${textContent.length} 字符`);
            return textContent;

        } catch (error) {
            this.logger.error('内容提取失败', error);
            return '';
        }
    }

    /**
     * 从HTML中提取图片信息
     */
    extractImages(htmlContent: string): Array<{
        url: string;
        alt?: string;
        title?: string;
    }> {
        try {
            const images: Array<{ url: string; alt?: string; title?: string; }> = [];
            
            // 匹配img标签
            const imgPattern = /<img[^>]*>/gi;
            const imgMatches = htmlContent.match(imgPattern);

            if (imgMatches) {
                for (const imgTag of imgMatches) {
                    // 提取src或data-src
                    const srcMatch = imgTag.match(/(?:src|data-src)=["']([^"']+)["']/i);
                    if (srcMatch && srcMatch[1]) {
                        const imageInfo: { url: string; alt?: string; title?: string; } = {
                            url: srcMatch[1]
                        };

                        // 提取alt属性
                        const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
                        if (altMatch && altMatch[1]) {
                            imageInfo.alt = this.cleanText(altMatch[1]);
                        }

                        // 提取title属性
                        const titleMatch = imgTag.match(/title=["']([^"']+)["']/i);
                        if (titleMatch && titleMatch[1]) {
                            imageInfo.title = this.cleanText(titleMatch[1]);
                        }

                        images.push(imageInfo);
                    }
                }
            }

            this.logger.info(`图片提取完成，共发现 ${images.length} 张图片`);
            return images;

        } catch (error) {
            this.logger.error('图片提取失败', error);
            return [];
        }
    }

    /**
     * 从HTML中提取纯文本
     */
    private extractTextFromHtml(html: string): string {
        // 移除脚本和样式标签
        let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
        text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
        
        // 移除HTML标签，保留换行结构
        text = text.replace(/<br[^>]*>/gi, '\n');
        text = text.replace(/<\/p>/gi, '\n\n');
        text = text.replace(/<\/div>/gi, '\n');
        text = text.replace(/<[^>]+>/g, '');
        
        // 清理空白字符
        text = text.replace(/&nbsp;/g, ' ');
        text = text.replace(/&lt;/g, '<');
        text = text.replace(/&gt;/g, '>');
        text = text.replace(/&amp;/g, '&');
        text = text.replace(/&quot;/g, '"');
        
        // 规范化换行
        text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
        text = text.replace(/^\s+|\s+$/g, '');
        
        return text;
    }

    /**
     * 清理文本内容
     */
    private cleanText(text: string): string {
        return text
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * 判断是否为时间字符串
     */
    private isTimeString(text: string): boolean {
        const timePatterns = [
            /\d{4}[-年]\d{1,2}[-月]\d{1,2}/,
            /\d{1,2}[-月]\d{1,2}[日]/,
            /\d{4}-\d{2}-\d{2}/,
            /\d{2}:\d{2}/
        ];
        
        return timePatterns.some(pattern => pattern.test(text));
    }

    /**
     * 标准化时间字符串
     */
    private normalizeTimeString(timeStr: string): string {
        return timeStr
            .replace(/年/g, '-')
            .replace(/月/g, '-')
            .replace(/日/g, '')
            .trim();
    }
} 