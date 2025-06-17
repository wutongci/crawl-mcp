import { CrawlState, CrawlMetadata, CrawlError, SessionStatus } from '../types';
import { Logger } from '../utils/Logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * 状态管理器
 * 负责管理抓取会话的状态和进度
 */
export class StateManager {
    private crawlStates: Map<string, CrawlState> = new Map();
    private logger: Logger;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.logger = new Logger('StateManager');
        this.startCleanupTimer();
    }

    /**
     * 创建新的抓取会话
     */
    createCrawlSession(url: string): string {
        const sessionId = this.generateSessionId();
        
        const state: CrawlState = {
            sessionId,
            url,
            startTime: new Date(),
            currentStep: 'initializing',
            stepResults: new Map(),
            stepTimestamps: new Map(),
            errors: [],
            metadata: this.createInitialMetadata()
        };
        
        this.crawlStates.set(sessionId, state);
        
        this.logger.info(`创建抓取会话: ${sessionId} for ${url}`);
        
        return sessionId;
    }

    /**
     * 获取会话状态
     */
    getSessionState(sessionId: string): CrawlState | undefined {
        return this.crawlStates.get(sessionId);
    }

    /**
     * 更新当前步骤
     */
    updateCurrentStep(sessionId: string, stepName: string): void {
        const state = this.crawlStates.get(sessionId);
        if (state) {
            state.currentStep = stepName;
            state.stepTimestamps.set(stepName, new Date());
            this.logger.debug(`会话 ${sessionId} 步骤更新: ${stepName}`);
        }
    }

    /**
     * 更新步骤结果
     */
    updateStepResult(sessionId: string, stepName: string, result: any): void {
        const state = this.crawlStates.get(sessionId);
        if (state) {
            state.stepResults.set(stepName, result);
            state.stepTimestamps.set(stepName, new Date());
            this.logger.debug(`会话 ${sessionId} 步骤结果更新: ${stepName}`);
        }
    }

    /**
     * 添加错误
     */
    addError(sessionId: string, error: CrawlError): void {
        const state = this.crawlStates.get(sessionId);
        if (state) {
            state.errors.push(error);
            this.logger.warn(`会话 ${sessionId} 错误记录: ${error.message}`);
        }
    }

    /**
     * 更新元数据
     */
    updateMetadata(sessionId: string, metadata: Partial<CrawlMetadata>): void {
        const state = this.crawlStates.get(sessionId);
        if (state) {
            state.metadata = { ...state.metadata, ...metadata };
            this.logger.debug(`会话 ${sessionId} 元数据更新:`, metadata);
        }
    }

    /**
     * 获取会话状态信息
     */
    getSessionStatus(sessionId: string): SessionStatus | undefined {
        const state = this.crawlStates.get(sessionId);
        if (!state) {
            return undefined;
        }

        const now = new Date();
        const duration = now.getTime() - state.startTime.getTime();
        const progress = this.calculateProgress(state);
        const status = this.determineStatus(state);

        return {
            session_id: sessionId,
            url: state.url,
            status: status,
            current_step: state.currentStep,
            progress: progress,
            start_time: state.startTime,
            end_time: status === 'completed' || status === 'failed' ? now : undefined,
            duration: duration,
            error: state.errors.length > 0 ? state.errors[state.errors.length - 1].message : undefined
        };
    }

    /**
     * 获取所有活跃会话状态
     */
    getAllSessionStatus(): SessionStatus[] {
        const statuses: SessionStatus[] = [];
        
        for (const [sessionId] of this.crawlStates) {
            const status = this.getSessionStatus(sessionId);
            if (status) {
                statuses.push(status);
            }
        }
        
        return statuses.sort((a, b) => b.start_time.getTime() - a.start_time.getTime());
    }

    /**
     * 完成会话
     */
    completeSession(sessionId: string, success: boolean): void {
        const state = this.crawlStates.get(sessionId);
        if (state) {
            state.currentStep = success ? 'completed' : 'failed';
            state.stepTimestamps.set(state.currentStep, new Date());
            
            this.logger.info(`会话 ${sessionId} ${success ? '完成' : '失败'}`);
        }
    }

    /**
     * 删除会话
     */
    removeSession(sessionId: string): boolean {
        const removed = this.crawlStates.delete(sessionId);
        if (removed) {
            this.logger.info(`删除会话: ${sessionId}`);
        }
        return removed;
    }

    /**
     * 清理过期会话
     */
    cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number { // 默认24小时
        const now = new Date();
        let cleanedCount = 0;
        
        for (const [sessionId, state] of this.crawlStates) {
            const age = now.getTime() - state.startTime.getTime();
            if (age > maxAgeMs) {
                this.crawlStates.delete(sessionId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.logger.info(`清理过期会话: ${cleanedCount} 个`);
        }
        
        return cleanedCount;
    }

    /**
     * 获取会话统计信息
     */
    getStatistics(): {
        totalSessions: number;
        activeSessions: number;
        completedSessions: number;
        failedSessions: number;
    } {
        let activeSessions = 0;
        let completedSessions = 0;
        let failedSessions = 0;
        
        for (const state of this.crawlStates.values()) {
            switch (state.currentStep) {
                case 'completed':
                    completedSessions++;
                    break;
                case 'failed':
                    failedSessions++;
                    break;
                default:
                    activeSessions++;
                    break;
            }
        }
        
        return {
            totalSessions: this.crawlStates.size,
            activeSessions,
            completedSessions,
            failedSessions
        };
    }

    /**
     * 生成会话ID
     */
    private generateSessionId(): string {
        return uuidv4();
    }

    /**
     * 创建初始元数据
     */
    private createInitialMetadata(): CrawlMetadata {
        return {
            wordCount: 0,
            imageCount: 0,
            hasExpandButton: false
        };
    }

    /**
     * 计算进度百分比
     */
    private calculateProgress(state: CrawlState): number {
        const totalSteps = [
            'navigate',
            'wait_page_load',
            'initial_snapshot',
            'click_expand',
            'final_snapshot',
            'screenshot'
        ];
        
        const completedSteps = totalSteps.filter(step => 
            state.stepResults.has(step) || 
            state.stepTimestamps.has(step)
        );
        
        return Math.round((completedSteps.length / totalSteps.length) * 100);
    }

    /**
     * 确定会话状态
     */
    private determineStatus(state: CrawlState): SessionStatus['status'] {
        if (state.currentStep === 'completed') {
            return 'completed';
        }
        
        if (state.currentStep === 'failed' || state.errors.length > 0) {
            return 'failed';
        }
        
        if (state.currentStep === 'initializing') {
            return 'pending';
        }
        
        return 'running';
    }

    /**
     * 启动清理定时器
     */
    private startCleanupTimer(): void {
        // 每小时清理一次过期会话
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60 * 60 * 1000);
    }

    /**
     * 停止清理定时器
     */
    stopCleanupTimer(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * 销毁状态管理器
     */
    destroy(): void {
        this.stopCleanupTimer();
        this.crawlStates.clear();
        this.logger.info('状态管理器已销毁');
    }
} 