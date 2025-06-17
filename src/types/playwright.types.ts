/**
 * Playwright MCP 调用结果
 */
export interface PlaywrightResult {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: Record<string, any>;
}

/**
 * 页面导航选项
 */
export interface NavigateOptions {
    url: string;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
}

/**
 * 等待选项
 */
export interface WaitOptions {
    selector?: string;
    timeout?: number;
    state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

/**
 * 点击选项
 */
export interface ClickOptions {
    selector: string;
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
    delay?: number;
    force?: boolean;
    timeout?: number;
    optional?: boolean; // 自定义选项：如果元素不存在是否跳过
}

/**
 * 截图选项
 */
export interface ScreenshotOptions {
    path?: string;
    type?: 'png' | 'jpeg';
    quality?: number;
    fullPage?: boolean;
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

/**
 * 快照选项
 */
export interface SnapshotOptions {
    selector?: string;
    fullPage?: boolean;
}

/**
 * 滚动选项
 */
export interface ScrollOptions {
    selector?: string;
    x?: number;
    y?: number;
    behavior?: 'auto' | 'smooth';
}

/**
 * 输入选项
 */
export interface TypeOptions {
    selector: string;
    text: string;
    delay?: number;
    timeout?: number;
}

/**
 * Playwright 工具名称
 */
export type PlaywrightToolName = 
    | 'browser_navigate'
    | 'browser_wait_for'
    | 'browser_snapshot'
    | 'browser_click'
    | 'browser_take_screenshot'
    | 'browser_scroll'
    | 'browser_type'
    | 'browser_reload'
    | 'browser_back'
    | 'browser_forward'; 