import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from './Logger';
import { v4 as uuidv4 } from 'uuid';
import * as mimeTypes from 'mime-types';

export interface ImageInfo {
    original_url: string;
    local_path: string;
    filename: string;
    size: number;
    mime_type: string;
    download_success: boolean;
    error?: string;
}

export interface DownloadOptions {
    output_dir: string;
    create_subdir?: boolean;
    subdir_name?: string;
    max_file_size?: number; // bytes
    timeout?: number; // ms
    retries?: number;
}

export class ImageDownloader {
    private logger: Logger;
    private static readonly DEFAULT_TIMEOUT = 10000;
    private static readonly DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
    private static readonly DEFAULT_RETRIES = 3;

    constructor() {
        this.logger = new Logger('ImageDownloader');
    }

    /**
     * 下载单个图片
     */
    async downloadImage(
        imageUrl: string, 
        options: DownloadOptions
    ): Promise<ImageInfo> {
        const startTime = Date.now();
        
        try {
            this.logger.info(`开始下载图片: ${imageUrl}`);
            
            // 验证URL
            if (!this.isValidImageUrl(imageUrl)) {
                throw new Error(`无效的图片URL: ${imageUrl}`);
            }

            // 准备下载目录
            const outputDir = await this.prepareOutputDirectory(options);
            
            // 生成文件名
            const filename = this.generateFilename(imageUrl);
            const localPath = path.join(outputDir, filename);
            
            // 检查文件是否已存在
            if (await fs.pathExists(localPath)) {
                this.logger.warn(`文件已存在，跳过下载: ${filename}`);
                const stats = await fs.stat(localPath);
                return {
                    original_url: imageUrl,
                    local_path: localPath,
                    filename,
                    size: stats.size,
                    mime_type: mimeTypes.lookup(filename) || 'application/octet-stream',
                    download_success: true
                };
            }

            // 执行下载
            const imageData = await this.fetchImageData(imageUrl, options);
            
            // 验证文件大小
            if (imageData.length > (options.max_file_size || ImageDownloader.DEFAULT_MAX_SIZE)) {
                throw new Error(`文件过大: ${imageData.length} bytes`);
            }

            // 保存文件
            await fs.writeFile(localPath, imageData);
            
            const duration = Date.now() - startTime;
            this.logger.info(`图片下载成功: ${filename} (${imageData.length} bytes, ${duration}ms)`);

            return {
                original_url: imageUrl,
                local_path: localPath,
                filename,
                size: imageData.length,
                mime_type: this.detectMimeType(imageData, filename),
                download_success: true
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            this.logger.error(`图片下载失败: ${imageUrl} - ${errorMsg} (${duration}ms)`);
            
            return {
                original_url: imageUrl,
                local_path: '',
                filename: '',
                size: 0,
                mime_type: '',
                download_success: false,
                error: errorMsg
            };
        }
    }

    /**
     * 批量下载图片
     */
    async downloadImages(
        imageUrls: string[],
        options: DownloadOptions,
        onProgress?: (completed: number, total: number, current: string) => void
    ): Promise<ImageInfo[]> {
        this.logger.info(`开始批量下载 ${imageUrls.length} 张图片`);
        
        const results: ImageInfo[] = [];
        const validUrls = imageUrls.filter(url => this.isValidImageUrl(url));
        
        if (validUrls.length !== imageUrls.length) {
            this.logger.warn(`过滤掉 ${imageUrls.length - validUrls.length} 个无效URL`);
        }

        // 并发控制
        const concurrency = 3; // 同时下载3张图片
        const chunks = this.chunkArray(validUrls, concurrency);
        
        let completed = 0;
        
        for (const chunk of chunks) {
            const chunkPromises = chunk.map(async (url) => {
                if (onProgress) {
                    onProgress(completed, validUrls.length, url);
                }
                
                const result = await this.downloadImage(url, options);
                completed++;
                
                if (onProgress) {
                    onProgress(completed, validUrls.length, url);
                }
                
                return result;
            });
            
            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
            
            // 添加延迟避免过于频繁的请求
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await this.delay(1000);
            }
        }
        
        const successCount = results.filter(r => r.download_success).length;
        const failCount = results.length - successCount;
        
        this.logger.info(`批量下载完成: 成功 ${successCount}, 失败 ${failCount}`);
        
        return results;
    }

    /**
     * 从HTML内容中提取图片URL
     */
    extractImageUrlsFromHtml(html: string): string[] {
        const imageUrls: string[] = [];
        
        // 匹配img标签的src和data-src属性
        const imgRegex = /<img[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
        let match;
        
        while ((match = imgRegex.exec(html)) !== null) {
            const url = match[1];
            if (this.isValidImageUrl(url)) {
                imageUrls.push(url);
            }
        }
        
        // 去重
        return [...new Set(imageUrls)];
    }

    /**
     * 更新Markdown内容中的图片引用
     */
    updateMarkdownImageReferences(
        markdownContent: string, 
        imageInfos: ImageInfo[],
        relativePathPrefix: string = './images/'
    ): string {
        let updatedContent = markdownContent;
        
        for (const imageInfo of imageInfos) {
            if (imageInfo.download_success) {
                const relativePath = relativePathPrefix + imageInfo.filename;
                
                // 替换原始URL为本地路径
                const urlPattern = new RegExp(
                    imageInfo.original_url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                    'g'
                );
                
                updatedContent = updatedContent.replace(urlPattern, relativePath);
                
                // 也处理可能的img标签
                const imgTagPattern = new RegExp(
                    `<img[^>]*src=["']${imageInfo.original_url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
                    'gi'
                );
                
                updatedContent = updatedContent.replace(
                    imgTagPattern, 
                    `![图片](${relativePath})`
                );
            }
        }
        
        return updatedContent;
    }

    /**
     * 验证是否为有效的图片URL
     */
    private isValidImageUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url);
            
            // 检查协议
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return false;
            }
            
            // 检查微信图片域名
            const validDomains = [
                'mmbiz.qpic.cn',
                'mmbiz.qlogo.cn', 
                'wx.qlogo.cn',
                'thirdwx.qlogo.cn'
            ];
            
            const hostname = urlObj.hostname.toLowerCase();
            return validDomains.some(domain => hostname.includes(domain));
            
        } catch {
            return false;
        }
    }

    /**
     * 获取图片数据
     */
    private async fetchImageData(
        url: string, 
        options: DownloadOptions
    ): Promise<Buffer> {
        const retries = options.retries || ImageDownloader.DEFAULT_RETRIES;
        const timeout = options.timeout || ImageDownloader.DEFAULT_TIMEOUT;
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                this.logger.debug(`下载尝试 ${attempt}/${retries}: ${url}`);
                
                // 使用简单的fetch实现（Node.js 18+内置）
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                        'Referer': 'https://mp.weixin.qq.com/',
                        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const contentType = response.headers.get('content-type');
                if (contentType && !contentType.startsWith('image/')) {
                    throw new Error(`非图片类型: ${contentType}`);
                }
                
                const arrayBuffer = await response.arrayBuffer();
                return Buffer.from(arrayBuffer);
                
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                
                this.logger.warn(`下载失败，重试中 (${attempt}/${retries}): ${error instanceof Error ? error.message : error}`);
                await this.delay(1000 * attempt); // 递增延迟
            }
        }
        
        throw new Error('所有重试都失败了');
    }

    /**
     * 准备输出目录
     */
    private async prepareOutputDirectory(options: DownloadOptions): Promise<string> {
        let outputDir = options.output_dir;
        
        if (options.create_subdir && options.subdir_name) {
            outputDir = path.join(outputDir, 'images');
        }
        
        await fs.ensureDir(outputDir);
        return outputDir;
    }

    /**
     * 生成文件名
     */
    private generateFilename(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            
            // 从URL中提取文件扩展名
            let extension = path.extname(pathname);
            
            // 如果没有扩展名，尝试从URL参数中获取
            if (!extension) {
                const wxFmt = urlObj.searchParams.get('wx_fmt');
                if (wxFmt) {
                    extension = `.${wxFmt}`;
                } else {
                    extension = '.jpg'; // 默认扩展名
                }
            }
            
            // 生成唯一文件名
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            
            return `image_${timestamp}_${random}${extension}`;
            
        } catch {
            return `image_${Date.now()}_${uuidv4().substring(0, 8)}.jpg`;
        }
    }

    /**
     * 检测MIME类型
     */
    private detectMimeType(data: Buffer, filename: string): string {
        // 通过文件头检测
        if (data.length >= 4) {
            const header = data.slice(0, 4);
            
            if (header[0] === 0xFF && header[1] === 0xD8) {
                return 'image/jpeg';
            }
            if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
                return 'image/png';
            }
            if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
                return 'image/gif';
            }
            if (header.includes(Buffer.from('WEBP'))) {
                return 'image/webp';
            }
        }
        
        // 备用：通过文件扩展名
        return mimeTypes.lookup(filename) || 'image/jpeg';
    }

    /**
     * 数组分块
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 