/**
 * 抓取策略配置定义
 */
export interface CrawlStrategy {
    name: string;
    description: string;
    timeouts: {
        navigation: number;
        pageLoad: number;
        elementWait: number;
        contentExtraction: number;
        screenshot: number;
    };
    delays: {
        betweenSteps: number;
        beforeExpand: number;
        afterExpand: number;
        beforeScreenshot: number;
    };
    retries: {
        maxAttempts: number;
        backoffMultiplier: number;
        initialDelay: number;
    };
    detection: {
        expandButtonSelectors: string[];
        contentSelectors: string[];
        loadedIndicators: string[];
    };
    cleanup: {
        removeAds: boolean;
        removeComments: boolean;
        removeTracking: boolean;
        normalizeSpaces: boolean;
    };
    performance: {
        enableCache: boolean;
        prefetchImages: boolean;
        compressContent: boolean;
    };
}

/**
 * 基础策略 - 平衡速度和稳定性
 */
export const BASIC_STRATEGY: CrawlStrategy = {
    name: 'basic',
    description: '平衡模式 - 兼顾速度和稳定性的默认策略',
    timeouts: {
        navigation: 30000,      // 30秒导航超时
        pageLoad: 15000,        // 15秒页面加载
        elementWait: 10000,     // 10秒元素等待
        contentExtraction: 20000, // 20秒内容提取
        screenshot: 15000       // 15秒截图
    },
    delays: {
        betweenSteps: 1000,     // 步骤间1秒延迟
        beforeExpand: 2000,     // 展开前2秒等待
        afterExpand: 3000,      // 展开后3秒等待
        beforeScreenshot: 1000  // 截图前1秒等待
    },
    retries: {
        maxAttempts: 3,
        backoffMultiplier: 1.5,
        initialDelay: 1000
    },
    detection: {
        expandButtonSelectors: [
            '.rich_media_js',
            '[data-tools="展开全文"]',
            '.expand_area',
            '.js_expand',
            '*[contains(text(), "展开全文")]'
        ],
        contentSelectors: [
            '#js_content',
            '.rich_media_content',
            '#js_article',
            '.article-content'
        ],
        loadedIndicators: [
            'img[data-src]',
            '.rich_media_content',
            '#js_content'
        ]
    },
    cleanup: {
        removeAds: true,
        removeComments: true,
        removeTracking: true,
        normalizeSpaces: true
    },
    performance: {
        enableCache: true,
        prefetchImages: false,
        compressContent: false
    }
};

/**
 * 保守策略 - 最大化成功率
 */
export const CONSERVATIVE_STRATEGY: CrawlStrategy = {
    name: 'conservative',
    description: '稳定模式 - 最大化抓取成功率，适合重要内容',
    timeouts: {
        navigation: 60000,      // 60秒导航超时
        pageLoad: 30000,        // 30秒页面加载
        elementWait: 20000,     // 20秒元素等待
        contentExtraction: 45000, // 45秒内容提取
        screenshot: 30000       // 30秒截图
    },
    delays: {
        betweenSteps: 3000,     // 步骤间3秒延迟
        beforeExpand: 5000,     // 展开前5秒等待
        afterExpand: 8000,      // 展开后8秒等待
        beforeScreenshot: 2000  // 截图前2秒等待
    },
    retries: {
        maxAttempts: 5,
        backoffMultiplier: 2.0,
        initialDelay: 2000
    },
    detection: {
        expandButtonSelectors: [
            '.rich_media_js',
            '[data-tools="展开全文"]',
            '.expand_area',
            '.js_expand',
            '*[contains(text(), "展开全文")]',
            '[onclick*="展开"]',
            '.expand-btn',
            '#expand_btn'
        ],
        contentSelectors: [
            '#js_content',
            '.rich_media_content',
            '#js_article',
            '.article-content',
            '.post-content',
            '.content-wrap'
        ],
        loadedIndicators: [
            'img[data-src]',
            '.rich_media_content',
            '#js_content',
            '.loading-complete',
            '.content-loaded'
        ]
    },
    cleanup: {
        removeAds: true,
        removeComments: true,
        removeTracking: true,
        normalizeSpaces: true
    },
    performance: {
        enableCache: true,
        prefetchImages: true,
        compressContent: false
    }
};

/**
 * 快速策略 - 最大化速度
 */
export const FAST_STRATEGY: CrawlStrategy = {
    name: 'fast',
    description: '快速模式 - 最大化抓取速度，适合批量处理',
    timeouts: {
        navigation: 15000,      // 15秒导航超时
        pageLoad: 8000,         // 8秒页面加载
        elementWait: 5000,      // 5秒元素等待
        contentExtraction: 10000, // 10秒内容提取
        screenshot: 8000        // 8秒截图
    },
    delays: {
        betweenSteps: 500,      // 步骤间0.5秒延迟
        beforeExpand: 1000,     // 展开前1秒等待
        afterExpand: 1500,      // 展开后1.5秒等待
        beforeScreenshot: 500   // 截图前0.5秒等待
    },
    retries: {
        maxAttempts: 2,
        backoffMultiplier: 1.2,
        initialDelay: 500
    },
    detection: {
        expandButtonSelectors: [
            '.rich_media_js',
            '.js_expand',
            '*[contains(text(), "展开全文")]'
        ],
        contentSelectors: [
            '#js_content',
            '.rich_media_content'
        ],
        loadedIndicators: [
            '#js_content'
        ]
    },
    cleanup: {
        removeAds: false,       // 跳过广告清理以节省时间
        removeComments: false,
        removeTracking: false,
        normalizeSpaces: false
    },
    performance: {
        enableCache: true,
        prefetchImages: false,
        compressContent: true
    }
};

/**
 * 所有可用策略
 */
export const AVAILABLE_STRATEGIES: Record<string, CrawlStrategy> = {
    basic: BASIC_STRATEGY,
    conservative: CONSERVATIVE_STRATEGY,
    fast: FAST_STRATEGY
};

/**
 * 获取策略配置
 */
export function getStrategy(name: string): CrawlStrategy {
    const strategy = AVAILABLE_STRATEGIES[name];
    if (!strategy) {
        throw new Error(`未知的抓取策略: ${name}. 可用策略: ${Object.keys(AVAILABLE_STRATEGIES).join(', ')}`);
    }
    return strategy;
}

/**
 * 验证策略名称
 */
export function isValidStrategy(name: string): boolean {
    return name in AVAILABLE_STRATEGIES;
}

/**
 * 获取所有策略名称
 */
export function getAvailableStrategyNames(): string[] {
    return Object.keys(AVAILABLE_STRATEGIES);
}

/**
 * 根据条件推荐策略
 */
export function recommendStrategy(context: {
    isBatch?: boolean;
    isImportantContent?: boolean;
    networkQuality?: 'slow' | 'fast' | 'unstable';
    timeConstraint?: 'strict' | 'flexible';
}): string {
    // 批量处理且时间紧迫
    if (context.isBatch && context.timeConstraint === 'strict') {
        return 'fast';
    }

    // 重要内容或网络不稳定
    if (context.isImportantContent || context.networkQuality === 'unstable') {
        return 'conservative';
    }

    // 网络慢
    if (context.networkQuality === 'slow') {
        return 'conservative';
    }

    // 默认使用平衡策略
    return 'basic';
}

/**
 * 创建自定义策略
 */
export function createCustomStrategy(
    name: string,
    baseStrategy: string,
    overrides: Partial<CrawlStrategy>
): CrawlStrategy {
    const base = getStrategy(baseStrategy);
    
    return {
        ...base,
        ...overrides,
        name,
        timeouts: { ...base.timeouts, ...overrides.timeouts },
        delays: { ...base.delays, ...overrides.delays },
        retries: { ...base.retries, ...overrides.retries },
        detection: { ...base.detection, ...overrides.detection },
        cleanup: { ...base.cleanup, ...overrides.cleanup },
        performance: { ...base.performance, ...overrides.performance }
    };
} 