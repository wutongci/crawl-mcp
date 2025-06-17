/**
 * 简单的日志记录器
 */
export class Logger {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    info(message: string, ...args: any[]): void {
        console.log(`[${this.name}] INFO: ${message}`, ...args);
    }

    debug(message: string, ...args: any[]): void {
        console.log(`[${this.name}] DEBUG: ${message}`, ...args);
    }

    warn(message: string, ...args: any[]): void {
        console.warn(`[${this.name}] WARN: ${message}`, ...args);
    }

    error(message: string, ...args: any[]): void {
        console.error(`[${this.name}] ERROR: ${message}`, ...args);
    }
} 