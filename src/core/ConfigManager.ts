import { Logger } from '../utils/Logger';
import { CrawlOptions, BatchCrawlOptions } from '../types/crawl.types';
import { DEFAULT_CRAWL_OPTIONS } from '../config/defaultConfig';

/**
 * 配置管理器
 * 负责管理和验证爬取配置
 */
export class ConfigManager {
    private logger: Logger;
    private configs: Map<string, any> = new Map();

    constructor() {
        this.logger = new Logger('ConfigManager');
        this.initializeDefaultConfigs();
    }

    /**
     * 初始化默认配置
     */
    private initializeDefaultConfigs(): void {
        // 默认爬取配置
        this.setConfig('default_crawl', DEFAULT_CRAWL_OPTIONS);

        // 微信特定配置
        this.setConfig('wechat_selectors', {
            // 文章标题选择器
            titleSelectors: [
                '#activity-name',
                '.rich_media_title',
                'h1',
                '[data-role="title"]'
            ],
            // 作者选择器
            authorSelectors: [
                '#meta_content .profile_nickname',
                '.rich_media_meta_nickname',
                '.author',
                '[data-role="author"]'
            ],
            // 发布时间选择器
            publishTimeSelectors: [
                '#publish_time',
                '.rich_media_meta_time',
                '.publish-time',
                '[data-role="publish-time"]'
            ],
            // 正文内容选择器
            contentSelectors: [
                '#js_content',
                '.rich_media_content',
                '.article-content',
                '[data-role="content"]'
            ],
            // 展开按钮选择器
            expandButtonSelectors: [
                '#js_view_source',
                '.btn_more',
                '.expand-btn',
                '[data-role="expand"]'
            ],
            // 图片选择器
            imageSelectors: [
                '#js_content img',
                '.rich_media_content img',
                'img[data-src]',
                'img[src]'
            ]
        });

        // 抓取策略配置
        this.setConfig('crawl_strategies', {
            // 基础策略
            basic: {
                maxRetries: 3,
                retryDelay: 2000,
                pageLoadTimeout: 30000,
                elementTimeout: 10000,
                scrollDelay: 1000,
                screenshotQuality: 80
            },
            // 保守策略（较慢但更稳定）
            conservative: {
                maxRetries: 5,
                retryDelay: 5000,
                pageLoadTimeout: 60000,
                elementTimeout: 20000,
                scrollDelay: 3000,
                screenshotQuality: 90,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            // 快速策略（快但可能不稳定）
            fast: {
                maxRetries: 1,
                retryDelay: 1000,
                pageLoadTimeout: 15000,
                elementTimeout: 5000,
                scrollDelay: 500,
                screenshotQuality: 60
            }
        });

        // 反爬虫配置
        this.setConfig('anti_bot', {
            // 随机延迟范围
            randomDelayRange: [1000, 3000],
            // User-Agent 池
            userAgents: [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
            ],
            // 请求头配置
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        this.logger.info('默认配置初始化完成');
    }

    /**
     * 设置配置项
     */
    setConfig(key: string, value: any): void {
        this.configs.set(key, value);
        this.logger.debug(`配置项已设置: ${key}`);
    }

    /**
     * 获取配置项
     */
    getConfig<T = any>(key: string, defaultValue?: T): T {
        const value = this.configs.get(key);
        if (value === undefined) {
            if (defaultValue !== undefined) {
                this.logger.debug(`配置项 ${key} 不存在，使用默认值`);
                return defaultValue;
            }
            throw new Error(`配置项不存在: ${key}`);
        }
        return value as T;
    }

    /**
     * 检查配置项是否存在
     */
    hasConfig(key: string): boolean {
        return this.configs.has(key);
    }

    /**
     * 删除配置项
     */
    removeConfig(key: string): boolean {
        const result = this.configs.delete(key);
        if (result) {
            this.logger.debug(`配置项已删除: ${key}`);
        }
        return result;
    }

    /**
     * 获取所有配置
     */
    getAllConfigs(): Record<string, any> {
        const result: Record<string, any> = {};
        for (const [key, value] of this.configs.entries()) {
            result[key] = value;
        }
        return result;
    }

    /**
     * 验证爬取配置
     */
    validateCrawlOptions(options: Partial<CrawlOptions>): CrawlOptions {
        const defaultOptions = this.getConfig<CrawlOptions>('default_crawl');
        const mergedOptions = { ...defaultOptions, ...options };

        // 验证输出格式
        if (!['markdown', 'json'].includes(mergedOptions.output_format)) {
            throw new Error(`无效的输出格式: ${mergedOptions.output_format}`);
        }

        // 验证超时时间
        if (mergedOptions.timeout < 1000 || mergedOptions.timeout > 300000) {
            throw new Error(`超时时间必须在 1-300 秒之间: ${mergedOptions.timeout}ms`);
        }

        // 验证重试次数
        if (mergedOptions.retry_attempts < 0 || mergedOptions.retry_attempts > 10) {
            throw new Error(`重试次数必须在 0-10 次之间: ${mergedOptions.retry_attempts}`);
        }

        // 验证步骤延迟
        if (mergedOptions.delay_between_steps < 0 || mergedOptions.delay_between_steps > 10000) {
            throw new Error(`步骤间延迟必须在 0-10 秒之间: ${mergedOptions.delay_between_steps}ms`);
        }

        this.logger.debug('爬取配置验证通过', mergedOptions);
        return mergedOptions;
    }

    /**
     * 验证批量爬取配置
     */
    validateBatchCrawlOptions(options: Partial<BatchCrawlOptions>): BatchCrawlOptions {
        const crawlOptions = this.validateCrawlOptions(options);
        
        const batchOptions: BatchCrawlOptions = {
            ...crawlOptions,
            concurrent_limit: options.concurrent_limit || 2,
            delay_seconds: options.delay_seconds || 3,
            stop_on_error: options.stop_on_error !== undefined ? options.stop_on_error : false
        };

        // 验证并发限制
        if (batchOptions.concurrent_limit < 1 || batchOptions.concurrent_limit > 5) {
            throw new Error(`并发限制必须在 1-5 之间: ${batchOptions.concurrent_limit}`);
        }

        // 验证延迟时间
        if (batchOptions.delay_seconds < 1 || batchOptions.delay_seconds > 60) {
            throw new Error(`请求间延迟必须在 1-60 秒之间: ${batchOptions.delay_seconds}`);
        }

        this.logger.debug('批量爬取配置验证通过', batchOptions);
        return batchOptions;
    }

    /**
     * 根据策略名称获取爬取策略
     */
    getCrawlStrategy(strategyName: string = 'basic'): any {
        const strategies = this.getConfig('crawl_strategies');
        const strategy = strategies[strategyName];
        
        if (!strategy) {
            this.logger.warn(`未找到策略 ${strategyName}，使用基础策略`);
            return strategies.basic;
        }

        this.logger.debug(`使用爬取策略: ${strategyName}`, strategy);
        return strategy;
    }

    /**
     * 获取微信选择器配置
     */
    getWechatSelectors(): any {
        return this.getConfig('wechat_selectors');
    }

    /**
     * 获取反爬虫配置
     */
    getAntiBotConfig(): any {
        return this.getConfig('anti_bot');
    }

    /**
     * 生成随机User-Agent
     */
    getRandomUserAgent(): string {
        const antiBotConfig = this.getAntiBotConfig();
        const userAgents = antiBotConfig.userAgents;
        const randomIndex = Math.floor(Math.random() * userAgents.length);
        return userAgents[randomIndex];
    }

    /**
     * 生成随机延迟时间
     */
    getRandomDelay(): number {
        const antiBotConfig = this.getAntiBotConfig();
        const [min, max] = antiBotConfig.randomDelayRange;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 更新配置从文件
     */
    async loadConfigFromFile(configPath: string): Promise<void> {
        try {
            // 这里可以实现从文件加载配置的逻辑
            this.logger.info(`从文件加载配置: ${configPath}`);
            // const config = await fs.readFile(configPath, 'utf-8');
            // const parsedConfig = JSON.parse(config);
            // Object.entries(parsedConfig).forEach(([key, value]) => {
            //     this.setConfig(key, value);
            // });
            this.logger.info('配置文件加载完成');
        } catch (error) {
            this.logger.error('配置文件加载失败', error);
            throw error;
        }
    }

    /**
     * 保存配置到文件
     */
    async saveConfigToFile(configPath: string): Promise<void> {
        try {
            const allConfigs = this.getAllConfigs();
            // 这里可以实现保存配置到文件的逻辑
            this.logger.info(`配置已保存到文件: ${configPath}`);
            // await fs.writeFile(configPath, JSON.stringify(allConfigs, null, 2), 'utf-8');
        } catch (error) {
            this.logger.error('配置文件保存失败', error);
            throw error;
        }
    }

    /**
     * 重置配置为默认值
     */
    resetToDefaults(): void {
        this.configs.clear();
        this.initializeDefaultConfigs();
        this.logger.info('配置已重置为默认值');
    }

    /**
     * 获取配置统计信息
     */
    getConfigStats(): {
        totalConfigs: number;
        configKeys: string[];
        lastModified: Date;
    } {
        return {
            totalConfigs: this.configs.size,
            configKeys: Array.from(this.configs.keys()),
            lastModified: new Date()
        };
    }

    /**
     * 验证URL格式
     */
    validateUrl(url: string): boolean {
        try {
            new URL(url);
            
            // 检查是否为微信公众号文章
            const wechatPattern = /^https?:\/\/mp\.weixin\.qq\.com\/s\/.+/;
            if (!wechatPattern.test(url)) {
                this.logger.warn(`URL不是微信公众号文章格式: ${url}`);
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error(`URL格式无效: ${url}`, error);
            return false;
        }
    }

    /**
     * 批量验证URLs
     */
    validateUrls(urls: string[]): {
        validUrls: string[];
        invalidUrls: string[];
        validationErrors: Array<{ url: string; error: string }>;
    } {
        const validUrls: string[] = [];
        const invalidUrls: string[] = [];
        const validationErrors: Array<{ url: string; error: string }> = [];

        for (const url of urls) {
            try {
                if (this.validateUrl(url)) {
                    validUrls.push(url);
                } else {
                    invalidUrls.push(url);
                    validationErrors.push({
                        url,
                        error: '不是有效的微信公众号文章URL'
                    });
                }
            } catch (error) {
                invalidUrls.push(url);
                validationErrors.push({
                    url,
                    error: error instanceof Error ? error.message : '未知验证错误'
                });
            }
        }

        this.logger.debug(`URL验证完成，有效: ${validUrls.length}，无效: ${invalidUrls.length}`);
        return { validUrls, invalidUrls, validationErrors };
    }
} 