import fs from 'fs/promises';
import path from 'path';
import { Logger } from './Logger';

/**
 * 文件管理器
 * 提供统一的文件操作接口
 */
export class FileManager {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('FileManager');
    }

    /**
     * 确保目录存在
     */
    async ensureDirectory(dirPath: string): Promise<void> {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            this.logger.debug(`目录已确保存在: ${dirPath}`);
        } catch (error) {
            this.logger.error(`创建目录失败: ${dirPath}`, error);
            throw error;
        }
    }

    /**
     * 写入文件
     */
    async writeFile(filePath: string, content: string, options: {
        encoding?: BufferEncoding;
        ensureDir?: boolean;
    } = {}): Promise<void> {
        try {
            const { encoding = 'utf-8', ensureDir = true } = options;

            if (ensureDir) {
                const dir = path.dirname(filePath);
                await this.ensureDirectory(dir);
            }

            await fs.writeFile(filePath, content, encoding);
            this.logger.debug(`文件已写入: ${filePath}`);
        } catch (error) {
            this.logger.error(`写入文件失败: ${filePath}`, error);
            throw error;
        }
    }

    /**
     * 读取文件
     */
    async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
        try {
            const content = await fs.readFile(filePath, encoding);
            this.logger.debug(`文件已读取: ${filePath}`);
            return content;
        } catch (error) {
            this.logger.error(`读取文件失败: ${filePath}`, error);
            throw error;
        }
    }

    /**
     * 检查文件是否存在
     */
    async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 检查目录是否存在
     */
    async directoryExists(dirPath: string): Promise<boolean> {
        try {
            const stats = await fs.stat(dirPath);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * 删除文件
     */
    async deleteFile(filePath: string): Promise<void> {
        try {
            await fs.unlink(filePath);
            this.logger.debug(`文件已删除: ${filePath}`);
        } catch (error) {
            this.logger.error(`删除文件失败: ${filePath}`, error);
            throw error;
        }
    }

    /**
     * 删除目录（递归）
     */
    async deleteDirectory(dirPath: string): Promise<void> {
        try {
            await fs.rm(dirPath, { recursive: true, force: true });
            this.logger.debug(`目录已删除: ${dirPath}`);
        } catch (error) {
            this.logger.error(`删除目录失败: ${dirPath}`, error);
            throw error;
        }
    }

    /**
     * 列出目录内容
     */
    async listDirectory(dirPath: string, options: {
        includeFiles?: boolean;
        includeDirs?: boolean;
        recursive?: boolean;
    } = {}): Promise<string[]> {
        try {
            const { includeFiles = true, includeDirs = true, recursive = false } = options;
            
            const items: string[] = [];
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isFile() && includeFiles) {
                    items.push(fullPath);
                } else if (entry.isDirectory()) {
                    if (includeDirs) {
                        items.push(fullPath);
                    }
                    if (recursive) {
                        const subItems = await this.listDirectory(fullPath, options);
                        items.push(...subItems);
                    }
                }
            }

            return items;
        } catch (error) {
            this.logger.error(`列出目录内容失败: ${dirPath}`, error);
            throw error;
        }
    }

    /**
     * 获取文件信息
     */
    async getFileStats(filePath: string): Promise<{
        size: number;
        createdAt: Date;
        modifiedAt: Date;
        isFile: boolean;
        isDirectory: boolean;
    }> {
        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            this.logger.error(`获取文件信息失败: ${filePath}`, error);
            throw error;
        }
    }

    /**
     * 复制文件
     */
    async copyFile(sourcePath: string, destPath: string, options: {
        ensureDir?: boolean;
        overwrite?: boolean;
    } = {}): Promise<void> {
        try {
            const { ensureDir = true, overwrite = true } = options;

            if (!overwrite && await this.fileExists(destPath)) {
                throw new Error(`目标文件已存在: ${destPath}`);
            }

            if (ensureDir) {
                const destDir = path.dirname(destPath);
                await this.ensureDirectory(destDir);
            }

            await fs.copyFile(sourcePath, destPath);
            this.logger.debug(`文件已复制: ${sourcePath} -> ${destPath}`);
        } catch (error) {
            this.logger.error(`复制文件失败: ${sourcePath} -> ${destPath}`, error);
            throw error;
        }
    }

    /**
     * 移动文件
     */
    async moveFile(sourcePath: string, destPath: string, options: {
        ensureDir?: boolean;
        overwrite?: boolean;
    } = {}): Promise<void> {
        try {
            const { ensureDir = true, overwrite = true } = options;

            if (!overwrite && await this.fileExists(destPath)) {
                throw new Error(`目标文件已存在: ${destPath}`);
            }

            if (ensureDir) {
                const destDir = path.dirname(destPath);
                await this.ensureDirectory(destDir);
            }

            await fs.rename(sourcePath, destPath);
            this.logger.debug(`文件已移动: ${sourcePath} -> ${destPath}`);
        } catch (error) {
            this.logger.error(`移动文件失败: ${sourcePath} -> ${destPath}`, error);
            throw error;
        }
    }

    /**
     * 生成安全的文件名
     */
    sanitizeFilename(filename: string, options: {
        maxLength?: number;
        replacement?: string;
    } = {}): string {
        const { maxLength = 255, replacement = '_' } = options;

        let sanitized = filename
            // 移除或替换非法字符
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, replacement)
            // 移除前后空格和点
            .replace(/^[\s.]+|[\s.]+$/g, '')
            // 压缩多个替换字符
            .replace(new RegExp(`\\${replacement}+`, 'g'), replacement)
            // 移除前后的替换字符
            .replace(new RegExp(`^\\${replacement}+|\\${replacement}+$`, 'g'), '');

        // 限制长度
        if (sanitized.length > maxLength) {
            const ext = path.extname(sanitized);
            const name = path.basename(sanitized, ext);
            const truncatedName = name.substring(0, maxLength - ext.length);
            sanitized = truncatedName + ext;
        }

        // 确保文件名不为空
        if (!sanitized) {
            sanitized = 'untitled';
        }

        return sanitized;
    }

    /**
     * 生成唯一文件名
     */
    async generateUniqueFilename(dirPath: string, basename: string, extension: string): Promise<string> {
        let counter = 0;
        let filename = `${basename}.${extension}`;

        while (await this.fileExists(path.join(dirPath, filename))) {
            counter++;
            filename = `${basename}_${counter}.${extension}`;
        }

        return filename;
    }

    /**
     * 获取目录大小
     */
    async getDirectorySize(dirPath: string): Promise<number> {
        try {
            let totalSize = 0;
            const files = await this.listDirectory(dirPath, { 
                includeFiles: true, 
                includeDirs: false, 
                recursive: true 
            });

            for (const file of files) {
                const stats = await this.getFileStats(file);
                totalSize += stats.size;
            }

            return totalSize;
        } catch (error) {
            this.logger.error(`获取目录大小失败: ${dirPath}`, error);
            throw error;
        }
    }

    /**
     * 清理空目录
     */
    async cleanupEmptyDirectories(dirPath: string): Promise<string[]> {
        try {
            const removedDirs: string[] = [];
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            // 递归清理子目录
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const subDirPath = path.join(dirPath, entry.name);
                    const removedSubDirs = await this.cleanupEmptyDirectories(subDirPath);
                    removedDirs.push(...removedSubDirs);
                }
            }

            // 检查当前目录是否为空
            const currentEntries = await fs.readdir(dirPath);
            if (currentEntries.length === 0) {
                await fs.rmdir(dirPath);
                removedDirs.push(dirPath);
                this.logger.debug(`已删除空目录: ${dirPath}`);
            }

            return removedDirs;
        } catch (error) {
            this.logger.error(`清理空目录失败: ${dirPath}`, error);
            throw error;
        }
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * 获取相对路径
     */
    getRelativePath(fromPath: string, toPath: string): string {
        return path.relative(fromPath, toPath);
    }

    /**
     * 解析路径信息
     */
    parsePath(filePath: string): {
        dir: string;
        base: string;
        name: string;
        ext: string;
        root: string;
    } {
        return path.parse(filePath);
    }

    /**
     * 规范化路径
     */
    normalizePath(filePath: string): string {
        return path.normalize(filePath);
    }

    /**
     * 连接路径
     */
    joinPaths(...paths: string[]): string {
        return path.join(...paths);
    }
} 