import { CrawlStep, CrawlContext, StepResult } from '../types';
import { Logger } from '../utils/Logger';

/**
 * 基础步骤抽象类
 */
export abstract class BaseStep implements CrawlStep {
    public readonly name: string;
    public readonly description: string;
    public readonly retryable: boolean;
    public readonly timeout: number;
    protected logger: Logger;

    constructor(
        name: string,
        description: string,
        retryable: boolean = true,
        timeout: number = 15000
    ) {
        this.name = name;
        this.description = description;
        this.retryable = retryable;
        this.timeout = timeout;
        this.logger = new Logger(`Step:${name}`);
    }

    /**
     * 抽象执行方法，由子类实现
     */
    abstract execute(context: CrawlContext): Promise<StepResult>;

    /**
     * 步骤执行前置检查
     */
    protected async preExecute(context: CrawlContext): Promise<boolean> {
        this.logger.info(`开始执行步骤: ${this.description}`);
        return true;
    }

    /**
     * 步骤执行后置处理
     */
    protected async postExecute(context: CrawlContext, result: StepResult): Promise<void> {
        if (result.success) {
            this.logger.info(`步骤执行成功: ${this.name}`);
        } else {
            this.logger.warn(`步骤执行失败: ${this.name}, 错误: ${result.error}`);
        }
    }

    /**
     * 创建成功结果
     */
    protected createSuccessResult(data: any, metadata?: Record<string, any>): StepResult {
        return {
            success: true,
            data,
            metadata: {
                stepName: this.name,
                timestamp: new Date(),
                ...metadata
            }
        };
    }

    /**
     * 创建失败结果
     */
    protected createErrorResult(error: string | Error, data?: any, metadata?: Record<string, any>): StepResult {
        const errorMessage = error instanceof Error ? error.message : error;
        return {
            success: false,
            data,
            error: errorMessage,
            metadata: {
                stepName: this.name,
                timestamp: new Date(),
                ...metadata
            }
        };
    }

    /**
     * 安全执行方法，包含前置和后置处理
     */
    async safeExecute(context: CrawlContext): Promise<StepResult> {
        try {
            // 前置检查
            const canExecute = await this.preExecute(context);
            if (!canExecute) {
                return this.createErrorResult('前置检查失败');
            }

            // 执行步骤
            const result = await this.execute(context);

            // 后置处理
            await this.postExecute(context, result);

            return result;
        } catch (error) {
            const errorResult = this.createErrorResult(error as Error);
            await this.postExecute(context, errorResult);
            return errorResult;
        }
    }

    /**
     * 获取步骤信息
     */
    getInfo(): { name: string; description: string; retryable: boolean; timeout: number } {
        return {
            name: this.name,
            description: this.description,
            retryable: this.retryable,
            timeout: this.timeout
        };
    }
} 