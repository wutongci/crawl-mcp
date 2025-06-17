/**
 * 微信公众号页面选择器配置
 */
export const WECHAT_SELECTORS = {
    // 主要内容区域
    mainContent: '.rich_media_content',
    
    // 文章标题
    title: '#activity-name, .rich_media_title',
    
    // 作者信息
    author: '.rich_media_meta_text, .account_nickname_inner',
    
    // 发布时间
    publishTime: '#publish_time, .rich_media_meta_text',
    
    // 公众号名称
    accountName: '.account_nickname_inner, .rich_media_meta_nickname',
    
    // 展开按钮相关
    expandButton: '.rich_media_js, .show_more_btn, [data-action="expand"]',
    expandTrigger: '.rich_media_js',
    
    // 内容相关
    contentBody: '.rich_media_content, #js_content',
    paragraphs: 'p, div.rich_media_content > div',
    images: 'img[data-src], img[src]',
    
    // 广告和无关内容（需要清理的）
    ads: [
        '.rich_media_tool',
        '.rich_media_extra',
        '.rich_media_tips',
        '.rich_media_vote',
        '.mp_common_ad',
        '.appmsg_card_context',
        '#js_tags',
        '.reward_area'
    ],
    
    // 加载状态指示器
    loadingIndicators: [
        '.rich_media_loading',
        '.weui-loading',
        '.loading'
    ],
    
    // 错误页面指示器
    errorIndicators: [
        '.rich_media_error',
        '.weui-msg__text-area',
        '.error_msg'
    ]
} as const;

/**
 * 选择器优先级配置
 * 数字越小优先级越高
 */
export const SELECTOR_PRIORITY = {
    title: {
        '#activity-name': 1,
        '.rich_media_title': 2,
        'h1': 3
    },
    
    author: {
        '.account_nickname_inner': 1,
        '.rich_media_meta_text': 2,
        '.wx_nickname': 3
    },
    
    content: {
        '#js_content': 1,
        '.rich_media_content': 2,
        '.rich_media_area_primary': 3
    }
} as const;

/**
 * 等待条件配置
 */
export const WAIT_CONDITIONS = {
    // 页面加载完成
    pageLoaded: {
        selector: '.rich_media_content',
        timeout: 15000,
        state: 'visible' as const
    },
    
    // 内容加载完成
    contentLoaded: {
        selector: '#js_content',
        timeout: 10000,
        state: 'visible' as const
    },
    
    // 展开按钮出现
    expandButtonVisible: {
        selector: '.rich_media_js',
        timeout: 5000,
        state: 'visible' as const
    },
    
    // 内容展开完成
    contentExpanded: {
        selector: '.rich_media_content:not(.loading)',
        timeout: 8000,
        state: 'visible' as const
    }
} as const;

/**
 * 获取选择器
 */
export function getSelector(type: keyof typeof WECHAT_SELECTORS): string {
    const selector = WECHAT_SELECTORS[type];
    if (Array.isArray(selector)) {
        return selector.join(', ');
    }
    return selector as string;
}

/**
 * 获取优先选择器
 */
export function getPrioritySelector(type: keyof typeof SELECTOR_PRIORITY): string[] {
    const selectors = SELECTOR_PRIORITY[type];
    return Object.entries(selectors)
        .sort(([, a], [, b]) => a - b)
        .map(([selector]) => selector);
} 