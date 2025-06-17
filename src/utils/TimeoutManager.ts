import { Logger } from './Logger';

/**
 * 超时操作接口
 */
export interface TimeoutOperation {
    id: string;
    name: string;
    startTime: Date;
    timeoutMs: number;
    timeoutHandler?: NodeJS.Timeout;
    promise?: Promise<any>;
    resolve?: (value: any) => void;
    reject?: (reason: any) => void;
    isCompleted: boolean;
    isCancelled: boolean;
}

/**
 * 超时管理器
 * 负责管理和控制各种超时操作
 */
export class TimeoutManager {
    private logger: Logger;
    private operations: Map<string, TimeoutOperation> = new Map();
    private nextOperationId: number = 1;

    constructor() {
        this.logger = new Logger('TimeoutManager');
    }

    /**
     * 创建带超时的Promise
     */
    async withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        operationName?: string
    ): Promise<T> {
        const operationId = this.generateOperationId();
        const name = operationName || `Operation-${operationId}`;

        return new Promise<T>((resolve, reject) => {
            const operation: TimeoutOperation = {
                id: operationId,
                name,
                startTime: new Date(),
                timeoutMs,
                promise,
                resolve,
                reject,
                isCompleted: false,
                isCancelled: false
            };

            // 设置超时处理器
            operation.timeoutHandler = setTimeout(() => {
                this.handleTimeout(operation);
            }, timeoutMs);

            // 注册操作
            this.operations.set(operationId, operation);
            this.logger.debug(`注册超时操作: ${name} (${timeoutMs}ms)`);

            // 处理原始Promise
            promise
                .then((result) => {
                    this.completeOperation(operationId, 'success', result);
                })
                .catch((error) => {
                    this.completeOperation(operationId, 'error', error);
                });
        });
    }

    /**
     * 创建延迟Promise
     */
    delay(ms: number, operationName?: string): Promise<void> {
        const operationId = this.generateOperationId();
        const name = operationName || `Delay-${operationId}`;

        return new Promise<void>((resolve) => {
            const operation: TimeoutOperation = {
                id: operationId,
                name,
                startTime: new Date(),
                timeoutMs: ms,
                resolve,
                isCompleted: false,
                isCancelled: false
            };

            operation.timeoutHandler = setTimeout(() => {
                this.completeOperation(operationId, 'success', undefined);
            }, ms);

            this.operations.set(operationId, operation);
            this.logger.debug(`创建延迟操作: ${name} (${ms}ms)`);
        });
    }

    /**
     * 创建可取消的超时操作
     */
    createCancellableTimeout<T>(
        executor: (resolve: (value: T) => void, reject: (reason: any) => void) => void,
        timeoutMs: number,
        operationName?: string
    ): {
        promise: Promise<T>;
        cancel: () => void;
        operationId: string;
    } {
        const operationId = this.generateOperationId();
        const name = operationName || `Cancellable-${operationId}`;

        const promise = new Promise<T>((resolve, reject) => {
            const operation: TimeoutOperation = {
                id: operationId,
                name,
                startTime: new Date(),
                timeoutMs,
                resolve,
                reject,
                isCompleted: false,
                isCancelled: false
            };

            // 设置超时处理器
            operation.timeoutHandler = setTimeout(() => {
                this.handleTimeout(operation);
            }, timeoutMs);

            this.operations.set(operationId, operation);
            this.logger.debug(`创建可取消超时操作: ${name} (${timeoutMs}ms)`);

            // 执行用户提供的executor
            try {
                executor(
                    (value) => this.completeOperation(operationId, 'success', value),
                    (reason) => this.completeOperation(operationId, 'error', reason)
                );
            } catch (error) {
                this.completeOperation(operationId, 'error', error);
            }
        });

        const cancel = () => {
            this.cancelOperation(operationId);
        };

        return { promise, cancel, operationId };
    }

    /**
     * 创建重试机制的超时操作
     */
    async withRetry<T>(
        operation: () => Promise<T>,
        options: {
            maxAttempts?: number;
            timeoutMs?: number;
            retryDelay?: number;
            operationName?: string;
            shouldRetry?: (error: any) => boolean;
        } = {}
    ): Promise<T> {
        const {
            maxAttempts = 3,
            timeoutMs = 30000,
            retryDelay = 1000,
            operationName = 'RetryOperation',
            shouldRetry = () => true
        } = options;

        let lastError: any;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                this.logger.debug(`执行重试操作 ${operationName}，第 ${attempt}/${maxAttempts} 次尝试`);
                
                const result = await this.withTimeout(
                    operation(),
                    timeoutMs,
                    `${operationName}-Attempt-${attempt}`
                );
                
                this.logger.debug(`重试操作 ${operationName} 成功，尝试次数: ${attempt}`);
                return result;

            } catch (error) {
                lastError = error;
                this.logger.warn(`重试操作 ${operationName} 第 ${attempt} 次失败`, error);

                // 检查是否应该重试
                if (attempt === maxAttempts || !shouldRetry(error)) {
                    break;
                }

                // 等待重试延迟
                if (retryDelay > 0) {
                    await this.delay(retryDelay, `${operationName}-RetryDelay-${attempt}`);
                }
            }
        }

        this.logger.error(`重试操作 ${operationName} 最终失败，尝试次数: ${maxAttempts}`, lastError);
        throw lastError;
    }

    /**
     * 批量执行带超时的操作
     */
    async executeWithTimeoutBatch<T>(
        operations: Array<{
            operation: () => Promise<T>;
            timeoutMs: number;
            name?: string;
        }>,
        options: {
            concurrency?: number;
            failFast?: boolean;
        } = {}
    ): Promise<Array<{
        success: boolean;
        result?: T;
        error?: any;
        operationName: string;
        duration: number;
    }>> {
        const { concurrency = 3, failFast = false } = options;
        const results: Array<{
            success: boolean;
            result?: T;
            error?: any;
            operationName: string;
            duration: number;
        }> = [];

        this.logger.info(`开始批量执行 ${operations.length} 个超时操作，并发度: ${concurrency}`);

        // 分批执行
        for (let i = 0; i < operations.length; i += concurrency) {
            const batch = operations.slice(i, i + concurrency);
            
            const batchPromises = batch.map(async (op, index) => {
                const operationName = op.name || `BatchOperation-${i + index}`;
                const startTime = Date.now();

                try {
                    const result = await this.withTimeout(
                        op.operation(),
                        op.timeoutMs,
                        operationName
                    );

                    return {
                        success: true,
                        result,
                        operationName,
                        duration: Date.now() - startTime
                    };

                } catch (error) {
                    const result = {
                        success: false,
                        error,
                        operationName,
                        duration: Date.now() - startTime
                    };

                    if (failFast) {
                        throw error;
                    }

                    return result;
                }
            });

            try {
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                
                this.logger.debug(`批次 ${Math.floor(i / concurrency) + 1} 执行完成`);

            } catch (error) {
                if (failFast) {
                    this.logger.error('批量执行因failFast模式而终止', error);
                    throw error;
                }
            }
        }

        const successCount = results.filter(r => r.success).length;
        this.logger.info(`批量执行完成，成功: ${successCount}/${results.length}`);

        return results;
    }

    /**
     * 取消指定操作
     */
    cancelOperation(operationId: string): boolean {
        const operation = this.operations.get(operationId);
        
        if (!operation) {
            this.logger.warn(`未找到要取消的操作: ${operationId}`);
            return false;
        }

        if (operation.isCompleted || operation.isCancelled) {
            this.logger.debug(`操作已完成或已取消: ${operation.name}`);
            return false;
        }

        operation.isCancelled = true;
        
        // 清理超时处理器
        if (operation.timeoutHandler) {
            clearTimeout(operation.timeoutHandler);
        }

        // 拒绝Promise
        if (operation.reject) {
            operation.reject(new Error(`操作被取消: ${operation.name}`));
        }

        this.operations.delete(operationId);
        this.logger.info(`操作已取消: ${operation.name}`);
        
        return true;
    }

    /**
     * 取消所有进行中的操作
     */
    cancelAllOperations(): number {
        const operationIds = Array.from(this.operations.keys());
        let cancelledCount = 0;

        for (const operationId of operationIds) {
            if (this.cancelOperation(operationId)) {
                cancelledCount++;
            }
        }

        this.logger.info(`取消了 ${cancelledCount} 个操作`);
        return cancelledCount;
    }

    /**
     * 获取操作状态
     */
    getOperationStatus(operationId: string): {
        exists: boolean;
        operation?: TimeoutOperation;
        elapsedTime?: number;
        remainingTime?: number;
    } {
        const operation = this.operations.get(operationId);
        
        if (!operation) {
            return { exists: false };
        }

        const elapsedTime = Date.now() - operation.startTime.getTime();
        const remainingTime = Math.max(0, operation.timeoutMs - elapsedTime);

        return {
            exists: true,
            operation: { ...operation },
            elapsedTime,
            remainingTime
        };
    }

    /**
     * 获取所有操作的统计信息
     */
    getOperationsStats(): {
        totalOperations: number;
        activeOperations: number;
        completedOperations: number;
        cancelledOperations: number;
        operationsSummary: Array<{
            id: string;
            name: string;
            status: 'active' | 'completed' | 'cancelled';
            elapsedTime: number;
        }>;
    } {
        const operationsSummary: Array<{
            id: string;
            name: string;
            status: 'active' | 'completed' | 'cancelled';
            elapsedTime: number;
        }> = [];

        let activeCount = 0;
        let completedCount = 0;
        let cancelledCount = 0;

        for (const operation of this.operations.values()) {
            const elapsedTime = Date.now() - operation.startTime.getTime();
            let status: 'active' | 'completed' | 'cancelled';

            if (operation.isCancelled) {
                status = 'cancelled';
                cancelledCount++;
            } else if (operation.isCompleted) {
                status = 'completed';
                completedCount++;
            } else {
                status = 'active';
                activeCount++;
            }

            operationsSummary.push({
                id: operation.id,
                name: operation.name,
                status,
                elapsedTime
            });
        }

        return {
            totalOperations: this.operations.size,
            activeOperations: activeCount,
            completedOperations: completedCount,
            cancelledOperations: cancelledCount,
            operationsSummary
        };
    }

    /**
     * 处理超时
     */
    private handleTimeout(operation: TimeoutOperation): void {
        if (operation.isCompleted || operation.isCancelled) {
            return;
        }

        this.logger.warn(`操作超时: ${operation.name} (${operation.timeoutMs}ms)`);
        
        operation.isCompleted = true;
        
        if (operation.reject) {
            operation.reject(new Error(`操作超时: ${operation.name} (${operation.timeoutMs}ms)`));
        }

        this.operations.delete(operation.id);
    }

    /**
     * 完成操作
     */
    private completeOperation(operationId: string, result: 'success' | 'error', value: any): void {
        const operation = this.operations.get(operationId);
        
        if (!operation || operation.isCompleted || operation.isCancelled) {
            return;
        }

        operation.isCompleted = true;
        
        // 清理超时处理器
        if (operation.timeoutHandler) {
            clearTimeout(operation.timeoutHandler);
        }

        const elapsedTime = Date.now() - operation.startTime.getTime();
        
        if (result === 'success') {
            this.logger.debug(`操作成功完成: ${operation.name} (${elapsedTime}ms)`);
            if (operation.resolve) {
                operation.resolve(value);
            }
        } else {
            this.logger.debug(`操作失败: ${operation.name} (${elapsedTime}ms)`, value);
            if (operation.reject) {
                operation.reject(value);
            }
        }

        this.operations.delete(operationId);
    }

    /**
     * 生成操作ID
     */
    private generateOperationId(): string {
        return `timeout_${this.nextOperationId++}_${Date.now()}`;
    }

    /**
     * 清理所有操作
     */
    cleanup(): void {
        this.logger.info('开始清理所有超时操作');
        
        const cancelledCount = this.cancelAllOperations();
        this.operations.clear();
        
        this.logger.info(`超时管理器清理完成，取消了 ${cancelledCount} 个操作`);
    }

    /**
     * 设置全局超时默认值
     */
    static createWithDefaults(defaults: {
        defaultTimeout?: number;
        defaultRetryAttempts?: number;
        defaultRetryDelay?: number;
    }): TimeoutManager {
        const manager = new TimeoutManager();
        
        // 可以在这里设置默认值，如果需要的话
        // manager.defaultTimeout = defaults.defaultTimeout || 30000;
        
        return manager;
    }
} 