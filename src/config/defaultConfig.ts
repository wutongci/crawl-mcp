import { CrawlOptions, BatchCrawlOptions } from '../types';

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
    // MCP 服务器配置
    server: {
        name: 'crawl-mcp-server',
        version: '1.0.0',
        debug: process.env.MCP_DEBUG === 'true'
    },

    // 抓取配置
    crawl: {
        outputDir: process.env.CRAWL_OUTPUT_DIR || './crawled_articles',
        imagesDir: process.env.CRAWL_IMAGES_DIR || './crawled_articles/images',
        logLevel: (process.env.CRAWL_LOG_LEVEL as any) || 'info',
        maxConcurrent: parseInt(process.env.CRAWL_MAX_CONCURRENT || '3'),
        defaultTimeout: parseInt(process.env.CRAWL_DEFAULT_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.CRAWL_RETRY_ATTEMPTS || '3'),
        userAgent: process.env.CRAWL_USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        minDelay: parseInt(process.env.CRAWL_MIN_DELAY || '2000'),
        maxDelay: parseInt(process.env.CRAWL_MAX_DELAY || '5000')
    },

    // Playwright MCP 配置
    playwright: {
        host: process.env.PLAYWRIGHT_MCP_HOST || 'localhost',
        port: parseInt(process.env.PLAYWRIGHT_MCP_PORT || '3001'),
        timeout: 30000
    },

    // 日志配置
    logging: {
        level: (process.env.CRAWL_LOG_LEVEL as any) || 'info',
        file: process.env.CRAWL_LOG_FILE,
        console: true
    }
} as const;

/**
 * 默认抓取选项
 */
export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
    output_format: 'markdown',
    save_images: true,
    clean_content: true,
    timeout: DEFAULT_CONFIG.crawl.defaultTimeout,
    retry_attempts: DEFAULT_CONFIG.crawl.retryAttempts,
    delay_between_steps: 1000
};

/**
 * 默认批量抓取选项
 */
export const DEFAULT_BATCH_CRAWL_OPTIONS: BatchCrawlOptions = {
    ...DEFAULT_CRAWL_OPTIONS,
    concurrent_limit: 2,
    delay_seconds: 5,
    stop_on_error: false
};

/**
 * 获取配置值
 */
export function getConfig<T>(path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let current: any = DEFAULT_CONFIG;
    
    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return defaultValue as T;
        }
    }
    
    return current as T;
} 