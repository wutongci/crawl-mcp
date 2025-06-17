import { Logger } from './Logger';

/**
 * URL验证器
 * 专门用于验证微信文章URL
 */
export class UrlValidator {
    private logger: Logger;

    // 微信公众号文章URL模式
    private readonly wechatUrlPatterns = [
        // 标准微信文章URL
        /^https?:\/\/mp\.weixin\.qq\.com\/s\/.+/,
        // 带参数的微信文章URL
        /^https?:\/\/mp\.weixin\.qq\.com\/s\?__biz=.+/,
        // 短链接形式
        /^https?:\/\/weixin\.qq\.com\/[a-zA-Z0-9]+/,
        // 其他可能的微信域名
        /^https?:\/\/([a-zA-Z0-9-]+\.)*weixin\.qq\.com\/.+/
    ];

    // 需要的URL参数
    private readonly requiredParams = ['__biz', 'mid', 'idx', 'sn'];

    constructor() {
        this.logger = new Logger('UrlValidator');
    }

    /**
     * 验证是否为有效的微信文章URL
     */
    isValidWechatUrl(url: string): boolean {
        try {
            // 基本格式验证
            if (!this.isValidUrl(url)) {
                this.logger.debug(`无效的URL格式: ${url}`);
                return false;
            }

            // 微信域名验证
            if (!this.isWechatDomain(url)) {
                this.logger.debug(`非微信域名: ${url}`);
                return false;
            }

            // URL模式验证
            if (!this.matchesWechatPattern(url)) {
                this.logger.debug(`不匹配微信文章URL模式: ${url}`);
                return false;
            }

            this.logger.debug(`有效的微信文章URL: ${url}`);
            return true;

        } catch (error) {
            this.logger.error('URL验证失败', error);
            return false;
        }
    }

    /**
     * 验证基本URL格式
     */
    isValidUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * 检查是否为微信域名
     */
    isWechatDomain(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            return hostname === 'mp.weixin.qq.com' || 
                   hostname === 'weixin.qq.com' ||
                   hostname.endsWith('.weixin.qq.com');
        } catch {
            return false;
        }
    }

    /**
     * 检查是否匹配微信文章URL模式
     */
    matchesWechatPattern(url: string): boolean {
        return this.wechatUrlPatterns.some(pattern => pattern.test(url));
    }

    /**
     * 验证URL是否包含必要参数
     */
    hasRequiredParams(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const searchParams = urlObj.searchParams;

            // 对于 /s/ 路径的URL，参数可能在hash中
            if (url.includes('/s/')) {
                return true; // 这种格式通常是有效的
            }

            // 检查必要参数
            for (const param of this.requiredParams) {
                if (!searchParams.has(param)) {
                    this.logger.debug(`缺少必要参数: ${param}`);
                    return false;
                }
            }

            return true;
        } catch {
            return false;
        }
    }

    /**
     * 清理和标准化URL
     */
    normalizeUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            
            // 移除一些不必要的参数
            const paramsToRemove = [
                'from', 'isappinstalled', 'scene', 'srcid', 'sharer_sharetime',
                'sharer_shareid', 'exportkey', 'pass_ticket', 'winzoom'
            ];

            paramsToRemove.forEach(param => {
                urlObj.searchParams.delete(param);
            });

            // 确保使用HTTPS
            urlObj.protocol = 'https:';

            const normalizedUrl = urlObj.toString();
            this.logger.debug(`URL已标准化: ${url} -> ${normalizedUrl}`);
            
            return normalizedUrl;

        } catch (error) {
            this.logger.warn(`URL标准化失败，返回原URL: ${url}`, error);
            return url;
        }
    }

    /**
     * 提取URL中的文章信息
     */
    extractArticleInfo(url: string): {
        biz?: string;
        mid?: string;
        idx?: string;
        sn?: string;
        title?: string;
    } {
        try {
            const urlObj = new URL(url);
            const params = urlObj.searchParams;

            const info: {
                biz?: string;
                mid?: string;
                idx?: string;
                sn?: string;
                title?: string;
            } = {};

            // 提取标准参数
            if (params.has('__biz')) info.biz = params.get('__biz') || undefined;
            if (params.has('mid')) info.mid = params.get('mid') || undefined;
            if (params.has('idx')) info.idx = params.get('idx') || undefined;
            if (params.has('sn')) info.sn = params.get('sn') || undefined;
            if (params.has('title')) info.title = params.get('title') || undefined;

            this.logger.debug('文章信息提取完成', info);
            return info;

        } catch (error) {
            this.logger.error('提取文章信息失败', error);
            return {};
        }
    }

    /**
     * 批量验证URL
     */
    validateUrls(urls: string[]): {
        valid: string[];
        invalid: string[];
        normalized: string[];
    } {
        const valid: string[] = [];
        const invalid: string[] = [];
        const normalized: string[] = [];

        for (const url of urls) {
            if (this.isValidWechatUrl(url)) {
                const normalizedUrl = this.normalizeUrl(url);
                valid.push(url);
                normalized.push(normalizedUrl);
            } else {
                invalid.push(url);
            }
        }

        this.logger.info(`批量验证完成，有效: ${valid.length}, 无效: ${invalid.length}`);

        return {
            valid,
            invalid,
            normalized
        };
    }

    /**
     * 从文本中提取微信文章URL
     */
    extractWechatUrls(text: string): string[] {
        const urls: string[] = [];
        
        // URL匹配模式
        const urlPattern = /https?:\/\/[^\s<>"']+/g;
        const matches = text.match(urlPattern);

        if (matches) {
            for (const match of matches) {
                // 清理URL末尾可能的标点符号
                const cleanUrl = match.replace(/[.,;!?）】}]*$/, '');
                
                if (this.isValidWechatUrl(cleanUrl)) {
                    urls.push(cleanUrl);
                }
            }
        }

        this.logger.debug(`从文本中提取到 ${urls.length} 个微信文章URL`);
        return urls;
    }

    /**
     * 检查URL是否可访问
     */
    async checkUrlAccessibility(url: string, timeout: number = 5000): Promise<{
        accessible: boolean;
        statusCode?: number;
        error?: string;
    }> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            clearTimeout(timeoutId);

            const result = {
                accessible: response.ok,
                statusCode: response.status
            };

            this.logger.debug(`URL可访问性检查: ${url} -> ${result.statusCode}`);
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            this.logger.warn(`URL可访问性检查失败: ${url}`, error);
            
            return {
                accessible: false,
                error: errorMessage
            };
        }
    }

    /**
     * 生成URL的唯一标识符
     */
    generateUrlHash(url: string): string {
        try {
            const articleInfo = this.extractArticleInfo(url);
            
            // 使用文章的关键参数生成hash
            if (articleInfo.biz && articleInfo.mid && articleInfo.idx && articleInfo.sn) {
                const key = `${articleInfo.biz}_${articleInfo.mid}_${articleInfo.idx}_${articleInfo.sn}`;
                return this.simpleHash(key);
            }

            // 如果无法提取参数，使用整个URL
            return this.simpleHash(this.normalizeUrl(url));

        } catch (error) {
            this.logger.error('生成URL哈希失败', error);
            return this.simpleHash(url);
        }
    }

    /**
     * 简单哈希函数
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 获取验证统计信息
     */
    getValidationStats(urls: string[]): {
        total: number;
        validCount: number;
        invalidCount: number;
        validRate: number;
        commonIssues: string[];
    } {
        const validation = this.validateUrls(urls);
        const total = urls.length;
        const validCount = validation.valid.length;
        const invalidCount = validation.invalid.length;
        const validRate = total > 0 ? Math.round((validCount / total) * 100) : 0;

        // 分析常见问题
        const commonIssues: string[] = [];
        for (const invalidUrl of validation.invalid) {
            if (!this.isValidUrl(invalidUrl)) {
                commonIssues.push('无效的URL格式');
            } else if (!this.isWechatDomain(invalidUrl)) {
                commonIssues.push('非微信域名');
            } else if (!this.matchesWechatPattern(invalidUrl)) {
                commonIssues.push('不匹配微信文章URL模式');
            }
        }

        return {
            total,
            validCount,
            invalidCount,
            validRate,
            commonIssues: [...new Set(commonIssues)]
        };
    }
} 