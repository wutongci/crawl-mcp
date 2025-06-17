import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/Logger';

/**
 * 图片信息接口
 */
export interface ImageInfo {
    original_url: string;
    local_path: string;
    filename: string;
    size: number;
    mime_type: string;
    width?: number;
    height?: number;
    alt_text?: string;
    download_success: boolean;
    download_error?: string;
}

/**
 * 图片处理器
 * 负责提取、下载和处理文章中的图片
 */
export class ImageProcessor {
    private logger: Logger;
    private downloadedImages: Map<string, ImageInfo> = new Map();

    constructor() {
        this.logger = new Logger('ImageProcessor');
    }

    /**
     * 从HTML内容中提取图片信息
     */
    extractImagesFromHtml(htmlContent: string, baseUrl?: string): ImageInfo[] {
        const images: ImageInfo[] = [];
        
        try {
            // 正则表达式匹配 img 标签
            const imgRegex = /<img[^>]*>/gi;
            const imgMatches = htmlContent.match(imgRegex) || [];

            for (let i = 0; i < imgMatches.length; i++) {
                const imgTag = imgMatches[i];
                const imageInfo = this.parseImageTag(imgTag, i, baseUrl);
                
                if (imageInfo) {
                    images.push(imageInfo);
                }
            }

            this.logger.info(`从HTML中提取到 ${images.length} 张图片`);
            return images;

        } catch (error) {
            this.logger.error('提取图片失败', error);
            return [];
        }
    }

    /**
     * 解析单个img标签
     */
    private parseImageTag(imgTag: string, index: number, baseUrl?: string): ImageInfo | null {
        try {
            // 提取src或data-src属性
            const srcMatch = imgTag.match(/(?:src|data-src)="([^"]+)"/i);
            if (!srcMatch) {
                return null;
            }

            let imageUrl = srcMatch[1];
            
            // 处理相对URL
            if (baseUrl && !imageUrl.startsWith('http')) {
                imageUrl = new URL(imageUrl, baseUrl).href;
            }

            // 提取alt属性
            const altMatch = imgTag.match(/alt="([^"]+)"/i);
            const altText = altMatch ? altMatch[1] : '';

            // 提取width和height属性
            const widthMatch = imgTag.match(/width="?([^"\s>]+)/i);
            const heightMatch = imgTag.match(/height="?([^"\s>]+)/i);

            const width = widthMatch ? parseInt(widthMatch[1]) : undefined;
            const height = heightMatch ? parseInt(heightMatch[1]) : undefined;

            // 生成文件名
            const filename = this.generateImageFilename(imageUrl, index);
            
            // 推断MIME类型
            const mimeType = this.inferMimeType(imageUrl);

            return {
                original_url: imageUrl,
                local_path: '',  // 将在下载时设置
                filename,
                size: 0,  // 将在下载时设置
                mime_type: mimeType,
                width,
                height,
                alt_text: altText,
                download_success: false
            };

        } catch (error) {
            this.logger.warn(`解析图片标签失败: ${imgTag}`, error);
            return null;
        }
    }

    /**
     * 生成图片文件名
     */
    private generateImageFilename(url: string, index: number): string {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const originalFilename = path.basename(pathname);
            
            // 如果URL中有文件名，使用它
            if (originalFilename && originalFilename.includes('.')) {
                // 清理文件名
                const cleanFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
                return `image_${index + 1}_${cleanFilename}`;
            }
            
            // 根据MIME类型生成扩展名
            const extension = this.getExtensionFromMimeType(this.inferMimeType(url));
            return `image_${index + 1}.${extension}`;

        } catch (error) {
            this.logger.warn(`生成文件名失败，使用默认: ${url}`, error);
            return `image_${index + 1}.jpg`;
        }
    }

    /**
     * 推断MIME类型
     */
    private inferMimeType(url: string): string {
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('.png') || urlLower.includes('png')) return 'image/png';
        if (urlLower.includes('.gif') || urlLower.includes('gif')) return 'image/gif';
        if (urlLower.includes('.webp') || urlLower.includes('webp')) return 'image/webp';
        if (urlLower.includes('.svg') || urlLower.includes('svg')) return 'image/svg+xml';
        if (urlLower.includes('.bmp') || urlLower.includes('bmp')) return 'image/bmp';
        
        // 默认为JPEG
        return 'image/jpeg';
    }

    /**
     * 根据MIME类型获取文件扩展名
     */
    private getExtensionFromMimeType(mimeType: string): string {
        const mimeToExt: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg',
            'image/bmp': 'bmp'
        };
        
        return mimeToExt[mimeType] || 'jpg';
    }

    /**
     * 批量下载图片（模拟实现）
     */
    async downloadImages(
        images: ImageInfo[], 
        outputDir: string,
        options: {
            maxConcurrent?: number;
            timeout?: number;
            retryAttempts?: number;
            skipExisting?: boolean;
        } = {}
    ): Promise<ImageInfo[]> {
        const {
            maxConcurrent = 3,
            timeout = 30000,
            retryAttempts = 3,
            skipExisting = true
        } = options;

        this.logger.info(`开始下载 ${images.length} 张图片到目录: ${outputDir}`);

        // 确保输出目录存在
        await fs.mkdir(outputDir, { recursive: true });

        const downloadPromises: Promise<ImageInfo>[] = [];
        const semaphore = new Array(maxConcurrent).fill(null);

        for (const image of images) {
            const downloadPromise = this.downloadSingleImage(
                image, 
                outputDir, 
                { timeout, retryAttempts, skipExisting }
            );
            downloadPromises.push(downloadPromise);

            // 简单的并发控制
            if (downloadPromises.length >= maxConcurrent) {
                await Promise.allSettled(downloadPromises.splice(0, maxConcurrent));
            }
        }

        // 处理剩余的下载任务
        if (downloadPromises.length > 0) {
            await Promise.allSettled(downloadPromises);
        }

        const downloadResults = await Promise.allSettled(
            images.map(img => this.downloadSingleImage(img, outputDir, { timeout, retryAttempts, skipExisting }))
        );

        const processedImages: ImageInfo[] = [];
        downloadResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                processedImages.push(result.value);
            } else {
                const failedImage = { ...images[index] };
                failedImage.download_success = false;
                failedImage.download_error = result.reason?.message || '下载失败';
                processedImages.push(failedImage);
            }
        });

        const successCount = processedImages.filter(img => img.download_success).length;
        this.logger.info(`图片下载完成，成功: ${successCount}/${images.length}`);

        return processedImages;
    }

    /**
     * 下载单张图片（模拟实现）
     */
    private async downloadSingleImage(
        image: ImageInfo, 
        outputDir: string,
        options: {
            timeout?: number;
            retryAttempts?: number;
            skipExisting?: boolean;
        }
    ): Promise<ImageInfo> {
        const { timeout = 30000, retryAttempts = 3, skipExisting = true } = options;
        
        const localPath = path.join(outputDir, image.filename);
        
        try {
            // 检查文件是否已存在
            if (skipExisting) {
                try {
                    const stats = await fs.stat(localPath);
                    if (stats.isFile()) {
                        this.logger.debug(`图片已存在，跳过下载: ${image.filename}`);
                        return {
                            ...image,
                            local_path: localPath,
                            size: stats.size,
                            download_success: true
                        };
                    }
                } catch (error) {
                    // 文件不存在，继续下载
                }
            }

            // 模拟下载过程
            this.logger.debug(`开始下载图片: ${image.original_url}`);
            
            // 这里应该是实际的HTTP请求下载图片
            // 目前只是模拟创建一个占位文件
            const mockImageData = `Mock image data for ${image.original_url}`;
            await fs.writeFile(localPath, mockImageData, 'utf-8');
            
            const stats = await fs.stat(localPath);
            
            const updatedImage: ImageInfo = {
                ...image,
                local_path: localPath,
                size: stats.size,
                download_success: true
            };

            this.downloadedImages.set(image.original_url, updatedImage);
            this.logger.debug(`图片下载成功: ${image.filename}`);
            
            return updatedImage;

        } catch (error) {
            this.logger.error(`图片下载失败: ${image.original_url}`, error);
            
            return {
                ...image,
                local_path: localPath,
                download_success: false,
                download_error: error instanceof Error ? error.message : '未知下载错误'
            };
        }
    }

    /**
     * 处理图片URL，将远程URL替换为本地路径
     */
    processImageUrls(content: string, images: ImageInfo[]): string {
        let processedContent = content;
        
        for (const image of images) {
            if (image.download_success && image.local_path) {
                // 将绝对路径转换为相对路径
                const relativePath = path.basename(image.local_path);
                
                // 替换原始URL为本地路径
                processedContent = processedContent.replace(
                    new RegExp(image.original_url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    relativePath
                );
            }
        }
        
        return processedContent;
    }

    /**
     * 生成图片摘要信息
     */
    generateImageSummary(images: ImageInfo[]): {
        totalImages: number;
        downloadedImages: number;
        failedImages: number;
        totalSize: number;
        imagesByType: Record<string, number>;
        largestImage: ImageInfo | null;
        smallestImage: ImageInfo | null;
    } {
        const downloadedImages = images.filter(img => img.download_success);
        const failedImages = images.filter(img => !img.download_success);
        const totalSize = downloadedImages.reduce((sum, img) => sum + img.size, 0);
        
        // 按类型统计
        const imagesByType: Record<string, number> = {};
        images.forEach(img => {
            imagesByType[img.mime_type] = (imagesByType[img.mime_type] || 0) + 1;
        });

        // 找出最大和最小的图片
        let largestImage: ImageInfo | null = null;
        let smallestImage: ImageInfo | null = null;
        
        downloadedImages.forEach(img => {
            if (!largestImage || img.size > largestImage.size) {
                largestImage = img;
            }
            if (!smallestImage || img.size < smallestImage.size) {
                smallestImage = img;
            }
        });

        return {
            totalImages: images.length,
            downloadedImages: downloadedImages.length,
            failedImages: failedImages.length,
            totalSize,
            imagesByType,
            largestImage,
            smallestImage
        };
    }

    /**
     * 清理下载的图片文件
     */
    async cleanupImages(images: ImageInfo[]): Promise<{
        deletedCount: number;
        errors: string[];
    }> {
        let deletedCount = 0;
        const errors: string[] = [];

        for (const image of images) {
            if (image.download_success && image.local_path) {
                try {
                    await fs.unlink(image.local_path);
                    deletedCount++;
                    this.logger.debug(`已删除图片文件: ${image.local_path}`);
                } catch (error) {
                    const errorMsg = `删除图片文件失败 ${image.local_path}: ${error instanceof Error ? error.message : '未知错误'}`;
                    errors.push(errorMsg);
                    this.logger.warn(errorMsg);
                }
            }
        }

        this.logger.info(`图片清理完成，删除: ${deletedCount}，错误: ${errors.length}`);
        return { deletedCount, errors };
    }

    /**
     * 获取处理器统计信息
     */
    getProcessorStats(): {
        totalProcessed: number;
        totalDownloaded: number;
        cacheSize: number;
        averageImageSize: number;
    } {
        const downloadedImages = Array.from(this.downloadedImages.values());
        const totalSize = downloadedImages.reduce((sum, img) => sum + img.size, 0);
        const averageSize = downloadedImages.length > 0 ? Math.round(totalSize / downloadedImages.length) : 0;

        return {
            totalProcessed: this.downloadedImages.size,
            totalDownloaded: downloadedImages.filter(img => img.download_success).length,
            cacheSize: this.downloadedImages.size,
            averageImageSize: averageSize
        };
    }

    /**
     * 清理处理器缓存
     */
    clearCache(): void {
        this.downloadedImages.clear();
        this.logger.info('图片处理器缓存已清理');
    }
} 