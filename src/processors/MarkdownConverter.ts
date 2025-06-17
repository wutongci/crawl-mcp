import { Logger } from '../utils/Logger';

/**
 * Markdown转换器
 * 负责将HTML内容转换为Markdown格式
 */
export class MarkdownConverter {
    private logger: Logger;

    // HTML到Markdown的转换规则
    private readonly conversionRules = [
        // 标题
        { pattern: /<h1[^>]*>(.*?)<\/h1>/gi, replacement: '# $1\n\n' },
        { pattern: /<h2[^>]*>(.*?)<\/h2>/gi, replacement: '## $1\n\n' },
        { pattern: /<h3[^>]*>(.*?)<\/h3>/gi, replacement: '### $1\n\n' },
        { pattern: /<h4[^>]*>(.*?)<\/h4>/gi, replacement: '#### $1\n\n' },
        { pattern: /<h5[^>]*>(.*?)<\/h5>/gi, replacement: '##### $1\n\n' },
        { pattern: /<h6[^>]*>(.*?)<\/h6>/gi, replacement: '###### $1\n\n' },

        // 段落
        { pattern: /<p[^>]*>(.*?)<\/p>/gi, replacement: '$1\n\n' },

        // 强调和重要
        { pattern: /<strong[^>]*>(.*?)<\/strong>/gi, replacement: '**$1**' },
        { pattern: /<b[^>]*>(.*?)<\/b>/gi, replacement: '**$1**' },
        { pattern: /<em[^>]*>(.*?)<\/em>/gi, replacement: '*$1*' },
        { pattern: /<i[^>]*>(.*?)<\/i>/gi, replacement: '*$1*' },

        // 链接
        { pattern: /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, replacement: '[$2]($1)' },

        // 图片
        { pattern: /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, replacement: '![$2]($1)' },
        { pattern: /<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*>/gi, replacement: '![$1]($2)' },
        { pattern: /<img[^>]*src=["']([^"']+)["'][^>]*>/gi, replacement: '![]($1)' },

        // 列表
        { pattern: /<ul[^>]*>/gi, replacement: '' },
        { pattern: /<\/ul>/gi, replacement: '\n' },
        { pattern: /<ol[^>]*>/gi, replacement: '' },
        { pattern: /<\/ol>/gi, replacement: '\n' },
        { pattern: /<li[^>]*>(.*?)<\/li>/gi, replacement: '- $1\n' },

        // 引用
        { pattern: /<blockquote[^>]*>(.*?)<\/blockquote>/gi, replacement: '> $1\n\n' },

        // 代码
        { pattern: /<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, replacement: '```\n$1\n```\n\n' },
        { pattern: /<code[^>]*>(.*?)<\/code>/gi, replacement: '`$1`' },

        // 分隔线
        { pattern: /<hr[^>]*>/gi, replacement: '\n---\n\n' },

        // 换行
        { pattern: /<br[^>]*>/gi, replacement: '\n' },

        // 删除线
        { pattern: /<del[^>]*>(.*?)<\/del>/gi, replacement: '~~$1~~' },
        { pattern: /<s[^>]*>(.*?)<\/s>/gi, replacement: '~~$1~~' },

        // 表格相关（简化处理）
        { pattern: /<table[^>]*>/gi, replacement: '\n' },
        { pattern: /<\/table>/gi, replacement: '\n' },
        { pattern: /<tr[^>]*>/gi, replacement: '| ' },
        { pattern: /<\/tr>/gi, replacement: ' |\n' },
        { pattern: /<t[hd][^>]*>(.*?)<\/t[hd]>/gi, replacement: '$1 | ' },

        // 其他容器元素
        { pattern: /<div[^>]*>/gi, replacement: '' },
        { pattern: /<\/div>/gi, replacement: '\n' },
        { pattern: /<section[^>]*>/gi, replacement: '' },
        { pattern: /<\/section>/gi, replacement: '\n' },
        { pattern: /<span[^>]*>(.*?)<\/span>/gi, replacement: '$1' },

        // 清理剩余的HTML标签
        { pattern: /<[^>]+>/g, replacement: '' }
    ];

    constructor() {
        this.logger = new Logger('MarkdownConverter');
    }

    /**
     * 将HTML转换为Markdown
     */
    convertToMarkdown(htmlContent: string, options: {
        preserveImages?: boolean;
        preserveLinks?: boolean;
        addFrontMatter?: boolean;
        frontMatter?: Record<string, any>;
    } = {}): string {
        try {
            this.logger.info('开始转换HTML到Markdown');

            const {
                preserveImages = true,
                preserveLinks = true,
                addFrontMatter = false,
                frontMatter = {}
            } = options;

            let markdown = htmlContent;

            // 预处理HTML
            markdown = this.preprocessHtml(markdown);

            // 应用转换规则
            for (const rule of this.conversionRules) {
                // 根据选项跳过某些规则
                if (!preserveImages && rule.replacement.includes('![')) {
                    continue;
                }
                if (!preserveLinks && rule.replacement.includes('](')) {
                    continue;
                }

                markdown = markdown.replace(rule.pattern, rule.replacement);
            }

            // 后处理
            markdown = this.postprocessMarkdown(markdown);

            // 添加Front Matter
            if (addFrontMatter) {
                markdown = this.addFrontMatter(markdown, frontMatter);
            }

            this.logger.info(`Markdown转换完成，长度: ${markdown.length} 字符`);
            return markdown;

        } catch (error) {
            this.logger.error('Markdown转换失败', error);
            return htmlContent; // 返回原始内容
        }
    }

    /**
     * 创建结构化的文章Markdown
     */
    createArticleMarkdown(articleData: {
        title?: string;
        author?: string;
        publishTime?: string;
        content: string;
        images?: Array<{ url: string; alt?: string; title?: string; }>;
        url?: string;
    }): string {
        try {
            const {
                title = '未知标题',
                author = '未知作者',
                publishTime = '',
                content,
                images = [],
                url = ''
            } = articleData;

            let markdown = '';

            // 添加标题
            markdown += `# ${title}\n\n`;

            // 添加元信息
            if (author || publishTime || url) {
                markdown += '---\n\n';
                
                if (author) {
                    markdown += `**作者：** ${author}\n\n`;
                }
                
                if (publishTime) {
                    markdown += `**发布时间：** ${publishTime}\n\n`;
                }
                
                if (url) {
                    markdown += `**原文链接：** [查看原文](${url})\n\n`;
                }
                
                markdown += '---\n\n';
            }

            // 转换内容
            const contentMarkdown = this.convertToMarkdown(content);
            markdown += contentMarkdown;

            // 添加图片清单（可选）
            if (images.length > 0) {
                markdown += '\n\n---\n\n## 文章图片\n\n';
                images.forEach((image, index) => {
                    const alt = image.alt || image.title || `图片${index + 1}`;
                    markdown += `${index + 1}. ![${alt}](${image.url})\n`;
                });
            }

            this.logger.info(`文章Markdown创建完成，包含 ${images.length} 张图片`);
            return markdown;

        } catch (error) {
            this.logger.error('文章Markdown创建失败', error);
            return `# ${articleData.title || '转换失败'}\n\n${articleData.content}`;
        }
    }

    /**
     * HTML预处理
     */
    private preprocessHtml(html: string): string {
        let processed = html;

        // 处理特殊字符
        processed = processed
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // 处理换行
        processed = processed
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        // 为块级元素添加换行
        processed = processed
            .replace(/<\/(?:p|div|section|article|h[1-6])>/gi, '$&\n')
            .replace(/<(?:p|div|section|article|h[1-6])[^>]*>/gi, '\n$&');

        return processed;
    }

    /**
     * Markdown后处理
     */
    private postprocessMarkdown(markdown: string): string {
        let processed = markdown;

        // 清理多余的空行
        processed = processed
            .replace(/\n{4,}/g, '\n\n\n')
            .replace(/^\n+/, '')
            .replace(/\n+$/, '\n');

        // 修复列表格式
        processed = this.fixListFormatting(processed);

        // 修复链接格式
        processed = this.fixLinkFormatting(processed);

        // 修复标题格式
        processed = this.fixHeadingFormatting(processed);

        return processed;
    }

    /**
     * 修复列表格式
     */
    private fixListFormatting(markdown: string): string {
        const lines = markdown.split('\n');
        const fixedLines: string[] = [];
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('- ')) {
                if (!inList && fixedLines.length > 0 && fixedLines[fixedLines.length - 1].trim() !== '') {
                    fixedLines.push('');
                }
                inList = true;
                fixedLines.push(line);
            } else if (inList && trimmedLine === '') {
                // 在列表中的空行
                if (i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
                    fixedLines.push(line);
                } else {
                    inList = false;
                    fixedLines.push(line);
                }
            } else {
                if (inList && trimmedLine !== '') {
                    inList = false;
                    fixedLines.push('');
                }
                fixedLines.push(line);
            }
        }

        return fixedLines.join('\n');
    }

    /**
     * 修复链接格式
     */
    private fixLinkFormatting(markdown: string): string {
        // 修复相邻的链接
        return markdown.replace(/\]\([^)]+\)\[/g, (match) => {
            return match.replace(')[', ') [');
        });
    }

    /**
     * 修复标题格式
     */
    private fixHeadingFormatting(markdown: string): string {
        const lines = markdown.split('\n');
        const fixedLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (/^#{1,6}\s/.test(line)) {
                // 确保标题前有空行
                if (fixedLines.length > 0 && fixedLines[fixedLines.length - 1].trim() !== '') {
                    fixedLines.push('');
                }
                fixedLines.push(line);
                
                // 确保标题后有空行
                if (i + 1 < lines.length && lines[i + 1].trim() !== '') {
                    fixedLines.push('');
                }
            } else {
                fixedLines.push(line);
            }
        }

        return fixedLines.join('\n');
    }

    /**
     * 添加Front Matter
     */
    private addFrontMatter(markdown: string, frontMatter: Record<string, any>): string {
        if (Object.keys(frontMatter).length === 0) {
            return markdown;
        }

        let frontMatterYaml = '---\n';
        for (const [key, value] of Object.entries(frontMatter)) {
            if (typeof value === 'string') {
                frontMatterYaml += `${key}: "${value}"\n`;
            } else {
                frontMatterYaml += `${key}: ${value}\n`;
            }
        }
        frontMatterYaml += '---\n\n';

        return frontMatterYaml + markdown;
    }

    /**
     * 获取转换统计信息
     */
    getConversionStats(originalHtml: string, convertedMarkdown: string): {
        originalSize: number;
        markdownSize: number;
        compressionRatio: number;
        estimatedReadingTime: number; // 分钟
    } {
        const originalSize = originalHtml.length;
        const markdownSize = convertedMarkdown.length;
        const compressionRatio = Math.round((1 - markdownSize / originalSize) * 100);
        
        // 估算阅读时间（基于中文250字/分钟的阅读速度）
        const chineseCharCount = (convertedMarkdown.match(/[\u4e00-\u9fa5]/g) || []).length;
        const estimatedReadingTime = Math.ceil(chineseCharCount / 250);

        return {
            originalSize,
            markdownSize,
            compressionRatio,
            estimatedReadingTime
        };
    }
} 