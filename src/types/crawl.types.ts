/**
 * 抓取配置选项
 */
export interface CrawlOptions {
    output_format: 'markdown' | 'json';
    save_images: boolean;
    clean_content: boolean;
    timeout: number;
    retry_attempts: number;
    delay_between_steps: number;
}

/**
 * 抓取结果
 */
export interface CrawlResult {
    success: boolean;
    url: string;
    title: string;
    author: string;
    publish_time: string;
    content: string;
    images: ImageInfo[];
    file_path: string;
    crawl_time: Date;
    duration: number;
    error?: string;
    session_id?: string;
}

/**
 * 图片信息
 */
export interface ImageInfo {
    original_url: string;
    local_path: string;
    filename: string;
    size: number;
    mime_type: string;
}

/**
 * 抓取步骤接口
 */
export interface CrawlStep {
    name: string;
    description: string;
    retryable: boolean;
    timeout: number;
    execute(context: CrawlContext): Promise<StepResult>;
}

/**
 * 步骤执行结果
 */
export interface StepResult {
    success: boolean;
    data: any;
    error?: string;
    metadata?: Record<string, any>;
}

/**
 * 抓取上下文
 */
export interface CrawlContext {
    sessionId: string;
    url: string;
    options: CrawlOptions;
    state: CrawlState;
    stepResults: Map<string, StepResult>;
    startTime: Date;
    currentStep: string;
}

/**
 * 抓取状态
 */
export interface CrawlState {
    sessionId: string;
    url: string;
    startTime: Date;
    currentStep: string;
    stepResults: Map<string, any>;
    stepTimestamps: Map<string, Date>;
    errors: CrawlError[];
    metadata: CrawlMetadata;
}

/**
 * 抓取元数据
 */
export interface CrawlMetadata {
    title?: string;
    author?: string;
    publishTime?: string;
    accountName?: string;
    wordCount?: number;
    imageCount?: number;
    hasExpandButton?: boolean;
}

/**
 * 抓取错误
 */
export class CrawlError extends Error {
    public readonly stepName: string;
    public readonly sessionId: string;
    public readonly timestamp: Date;
    public readonly retryable: boolean;

    constructor(
        message: string,
        stepName: string,
        sessionId: string,
        retryable: boolean = true
    ) {
        super(message);
        this.name = 'CrawlError';
        this.stepName = stepName;
        this.sessionId = sessionId;
        this.timestamp = new Date();
        this.retryable = retryable;
    }
}

/**
 * 批量抓取选项
 */
export interface BatchCrawlOptions extends CrawlOptions {
    concurrent_limit: number;
    delay_seconds: number;
    stop_on_error: boolean;
}

/**
 * 批量抓取结果
 */
export interface BatchCrawlResult {
    success: boolean;
    total_count: number;
    success_count: number;
    failed_count: number;
    results: CrawlResult[];
    session_id: string;
    start_time: Date;
    end_time: Date;
    duration: number;
}

/**
 * 会话状态信息
 */
export interface SessionStatus {
    session_id: string;
    url?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    current_step: string;
    progress: number; // 0-100
    start_time: Date;
    end_time?: Date;
    duration?: number;
    error?: string;
}

/**
 * 默认抓取配置
 */
export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
    output_format: 'markdown',
    save_images: true,
    clean_content: true,
    timeout: 30000,
    retry_attempts: 3,
    delay_between_steps: 1000
};

/**
 * 默认批量抓取配置
 */
export const DEFAULT_BATCH_CRAWL_OPTIONS: BatchCrawlOptions = {
    ...DEFAULT_CRAWL_OPTIONS,
    concurrent_limit: 2,
    delay_seconds: 5,
    stop_on_error: false
}; 