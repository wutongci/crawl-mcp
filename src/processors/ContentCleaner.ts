import { Logger } from '../utils/Logger';
import { getSelector } from '../config/wechatSelectors';

/**
 * 内容清理器
 * 负责清理HTML内容，移除广告和无关元素
 */
export class ContentCleaner {
    private logger: Logger;

    // 需要移除的元素选择器
    private readonly removeSelectors = [
        // 广告相关
        '.rich_media_js',
        '#js_pc_qr_code',
        '.qr_code_pc',
        '.reward_qrcode',
        '.article_comment',
        
        // 推广相关
        '.mp_profile_iframe',
        '.weapp_element',
        '.mp_common_widget',
        '.js_share_container',
        
        // 其他无关内容
        '.rich_media_meta',
        '.rich_media_extra',
        '.rich_media_tool',
        'script',
        'style',
        'noscript'
    ];

    // 需要移除的属性
    private readonly removeAttributesList = [
        'onclick',
        'onload',
        'onerror',
        'onmouseover',
        'onmouseout',
        'onfocus',
        'onblur',
        'data-track',
        'data-stat',
        'data-analytics'
    ];

    // 广告关键词
    private readonly adKeywords = [
        '广告',
        '推广',
        '赞赏',
        '打赏',
        '二维码',
        '扫码',
        '关注我们',
        '点击阅读原文',
        '阅读原文',
        '更多精彩',
        '往期推荐',
        '相关阅读'
    ];

    constructor() {
        this.logger = new Logger('ContentCleaner');
    }

    /**
     * 清理HTML内容
     */
    cleanHtml(htmlContent: string): string {
        try {
            this.logger.info('开始清理HTML内容');

            let cleanedHtml = htmlContent;

            // 1. 移除指定的元素
            cleanedHtml = this.removeElements(cleanedHtml);

            // 2. 移除广告相关内容
            cleanedHtml = this.removeAds(cleanedHtml);

            // 3. 移除无用属性
            cleanedHtml = this.removeUnusedAttributes(cleanedHtml);

            // 4. 清理空白和格式
            cleanedHtml = this.normalizeWhitespace(cleanedHtml);

            // 5. 移除空元素
            cleanedHtml = this.removeEmptyElements(cleanedHtml);

            this.logger.info('HTML内容清理完成');
            return cleanedHtml;

        } catch (error) {
            this.logger.error('HTML内容清理失败', error);
            return htmlContent; // 返回原始内容
        }
    }

    /**
     * 清理纯文本内容
     */
    cleanText(textContent: string): string {
        try {
            this.logger.info('开始清理文本内容');

            let cleanedText = textContent;

            // 1. 移除广告相关段落
            cleanedText = this.removeAdParagraphs(cleanedText);

            // 2. 清理特殊字符
            cleanedText = this.cleanSpecialCharacters(cleanedText);

            // 3. 规范化空白
            cleanedText = this.normalizeTextWhitespace(cleanedText);

            // 4. 移除重复内容
            cleanedText = this.removeDuplicateLines(cleanedText);

            this.logger.info(`文本内容清理完成，长度: ${cleanedText.length} 字符`);
            return cleanedText;

        } catch (error) {
            this.logger.error('文本内容清理失败', error);
            return textContent; // 返回原始内容
        }
    }

    /**
     * 移除指定的HTML元素
     */
    private removeElements(html: string): string {
        let result = html;

        for (const selector of this.removeSelectors) {
            // 将CSS选择器转换为正则表达式
            const tagName = selector.replace(/[.#]/, '').split(/[.#\s]/)[0];
            
            if (selector.startsWith('.')) {
                // 类选择器
                const className = selector.substring(1);
                const classRegex = new RegExp(`<[^>]*class=[^>]*${className}[^>]*>[\\s\\S]*?</[^>]+>`, 'gi');
                result = result.replace(classRegex, '');
            } else if (selector.startsWith('#')) {
                // ID选择器
                const idName = selector.substring(1);
                const idRegex = new RegExp(`<[^>]*id=[^>]*${idName}[^>]*>[\\s\\S]*?</[^>]+>`, 'gi');
                result = result.replace(idRegex, '');
            } else {
                // 标签选择器
                const tagRegex = new RegExp(`<${tagName}[\\s\\S]*?</${tagName}>`, 'gi');
                result = result.replace(tagRegex, '');
            }
        }

        return result;
    }

    /**
     * 移除广告相关内容
     */
    private removeAds(html: string): string {
        let result = html;

        // 移除包含广告关键词的段落或div
        for (const keyword of this.adKeywords) {
            const adPattern = new RegExp(
                `<(?:p|div)[^>]*>[^<]*${keyword}[^<]*</(?:p|div)>`,
                'gi'
            );
            result = result.replace(adPattern, '');
        }

        // 移除微信特有的推广元素
        const wechatAdPatterns = [
            /<div[^>]*data-[\w-]*="mp_profile_iframe"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*class="[^"]*weapp[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<section[^>]*data-[\w-]*="qr"[^>]*>[\s\S]*?<\/section>/gi
        ];

        for (const pattern of wechatAdPatterns) {
            result = result.replace(pattern, '');
        }

        return result;
    }

    /**
     * 移除无用属性
     */
    private removeUnusedAttributes(html: string): string {
        let result = html;

        for (const attr of this.removeAttributesList) {
            const attrRegex = new RegExp(`\\s${attr}=[^\\s>]*`, 'gi');
            result = result.replace(attrRegex, '');
        }

        return result;
    }

    /**
     * 规范化HTML空白
     */
    private normalizeWhitespace(html: string): string {
        return html
            // 移除多余的空白字符
            .replace(/\s+/g, ' ')
            // 移除标签间的空白
            .replace(/>\s+</g, '><')
            // 移除行首行尾空白
            .replace(/^\s+|\s+$/gm, '')
            // 移除空行
            .replace(/\n\s*\n/g, '\n');
    }

    /**
     * 移除空元素
     */
    private removeEmptyElements(html: string): string {
        // 移除空的段落和div
        let result = html;
        
        const emptyElementPatterns = [
            /<p[^>]*>\s*<\/p>/gi,
            /<div[^>]*>\s*<\/div>/gi,
            /<span[^>]*>\s*<\/span>/gi,
            /<section[^>]*>\s*<\/section>/gi
        ];

        for (const pattern of emptyElementPatterns) {
            result = result.replace(pattern, '');
        }

        return result;
    }

    /**
     * 移除广告相关段落
     */
    private removeAdParagraphs(text: string): string {
        const lines = text.split('\n');
        const cleanedLines: string[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // 跳过包含广告关键词的行
            if (this.containsAdKeywords(trimmedLine)) {
                this.logger.debug(`移除广告行: ${trimmedLine.substring(0, 50)}...`);
                continue;
            }

            // 跳过过短的行（可能是无意义的内容）
            if (trimmedLine.length > 0 && trimmedLine.length < 5 && 
                !/[a-zA-Z0-9\u4e00-\u9fa5]/.test(trimmedLine)) {
                continue;
            }

            cleanedLines.push(line);
        }

        return cleanedLines.join('\n');
    }

    /**
     * 检查文本是否包含广告关键词
     */
    private containsAdKeywords(text: string): boolean {
        return this.adKeywords.some(keyword => text.includes(keyword));
    }

    /**
     * 清理特殊字符
     */
    private cleanSpecialCharacters(text: string): string {
        return text
            // 清理HTML实体
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&ldquo;/g, '"')
            .replace(/&rdquo;/g, '"')
            .replace(/&lsquo;/g, "'")
            .replace(/&rsquo;/g, "'")
            // 清理零宽字符
            .replace(/[\u200b-\u200d\ufeff]/g, '')
            // 清理控制字符
            .replace(/[\u0000-\u001f\u007f-\u009f]/g, '');
    }

    /**
     * 规范化文本空白
     */
    private normalizeTextWhitespace(text: string): string {
        return text
            // 规范化空格
            .replace(/[ \t]+/g, ' ')
            // 规范化换行
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // 移除多余的换行
            .replace(/\n{3,}/g, '\n\n')
            // 移除行首行尾空白
            .replace(/^[ \t]+|[ \t]+$/gm, '')
            // 移除首尾空白
            .trim();
    }

    /**
     * 移除重复行
     */
    private removeDuplicateLines(text: string): string {
        const lines = text.split('\n');
        const uniqueLines: string[] = [];
        const seen = new Set<string>();

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // 空行总是保留（但限制连续空行）
            if (trimmedLine === '') {
                if (uniqueLines.length > 0 && 
                    uniqueLines[uniqueLines.length - 1].trim() !== '') {
                    uniqueLines.push(line);
                }
                continue;
            }

            // 检查是否重复
            if (!seen.has(trimmedLine)) {
                seen.add(trimmedLine);
                uniqueLines.push(line);
            }
        }

        return uniqueLines.join('\n');
    }

    /**
     * 获取清理统计信息
     */
    getCleaningStats(originalContent: string, cleanedContent: string): {
        originalLength: number;
        cleanedLength: number;
        reductionPercentage: number;
        removedBytes: number;
    } {
        const originalLength = originalContent.length;
        const cleanedLength = cleanedContent.length;
        const removedBytes = originalLength - cleanedLength;
        const reductionPercentage = Math.round((removedBytes / originalLength) * 100);

        return {
            originalLength,
            cleanedLength,
            reductionPercentage,
            removedBytes
        };
    }
} 