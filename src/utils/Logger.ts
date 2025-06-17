import { LogLevel } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * 日志工具类
 */
export class Logger {
    private logLevel: LogLevel;
    private outputFile?: string;
    private name: string;

    constructor(name: string) {
        this.name = name;
        this.logLevel = this.parseLogLevel(process.env.CRAWL_LOG_LEVEL || 'info');
        this.outputFile = process.env.CRAWL_LOG_FILE;
    }

    /**
     * 解析日志级别
     */
    private parseLogLevel(level: string): LogLevel {
        const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const lowerLevel = level.toLowerCase() as LogLevel;
        return validLevels.includes(lowerLevel) ? lowerLevel : 'info';
    }

    /**
     * 检查是否应该记录该级别的日志
     */
    private shouldLog(level: LogLevel): boolean {
        const levels: Record<LogLevel, number> = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        return levels[level] >= levels[this.logLevel];
    }

    /**
     * 格式化日志消息
     */
    private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.name}]`;
        
        if (args.length === 0) {
            return `${prefix} ${message}`;
        }
        
        const formattedArgs = args.map(arg => {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return String(arg);
        }).join(' ');
        
        return `${prefix} ${message} ${formattedArgs}`;
    }

    /**
     * 写入日志文件
     */
    private async writeToFile(content: string): Promise<void> {
        if (!this.outputFile) return;
        
        try {
            const logDir = path.dirname(this.outputFile);
            await fs.ensureDir(logDir);
            await fs.appendFile(this.outputFile, content);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    /**
     * 通用日志方法
     */
    private async log(level: LogLevel, message: string, ...args: any[]): Promise<void> {
        if (!this.shouldLog(level)) return;
        
        const formattedMessage = this.formatMessage(level, message, ...args);
        
        // 输出到控制台
        const consoleMethod = level === 'error' ? console.error : 
                             level === 'warn' ? console.warn : 
                             level === 'debug' ? console.debug : console.log;
        consoleMethod(formattedMessage);
        
        // 写入文件
        if (this.outputFile) {
            await this.writeToFile(formattedMessage + '\n');
        }
    }

    /**
     * Debug 级别日志
     */
    debug(message: string, ...args: any[]): void {
        this.log('debug', message, ...args);
    }

    /**
     * Info 级别日志
     */
    info(message: string, ...args: any[]): void {
        this.log('info', message, ...args);
    }

    /**
     * Warning 级别日志
     */
    warn(message: string, ...args: any[]): void {
        this.log('warn', message, ...args);
    }

    /**
     * Error 级别日志
     */
    error(message: string, error?: Error | any, ...args: any[]): void {
        const errorInfo = error instanceof Error ? 
            `${error.message}\n${error.stack}` : 
            String(error);
        
        this.log('error', message, errorInfo, ...args);
    }

    /**
     * 创建子日志器
     */
    child(name: string): Logger {
        return new Logger(`${this.name}:${name}`);
    }

    /**
     * 设置日志级别
     */
    setLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * 获取当前日志级别
     */
    getLevel(): LogLevel {
        return this.logLevel;
    }
} 