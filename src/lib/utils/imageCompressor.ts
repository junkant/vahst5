// src/lib/utils/imageCompressor.ts
import { browser } from '$app/environment';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

export interface CompressedImage {
  blob: Blob;
  dataUrl: string;
  size: number;
  width: number;
  height: number;
  compressionRatio: number;
}

class ImageCompressor {
  private defaultOptions: CompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    format: 'webp'
  };

  // Compress a single image
  async compressImage(
    file: File | Blob,
    options: CompressionOptions = {}
  ): Promise<CompressedImage> {
    if (!browser) {
      throw new Error('Image compression only works in browser');
    }

    const opts = { ...this.defaultOptions, ...options };
    const originalSize = file.size;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate new dimensions
        const { width, height } = this.calculateDimensions(
          img.width,
          img.height,
          opts.maxWidth!,
          opts.maxHeight!
        );

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Convert to data URL for preview
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                blob,
                dataUrl: reader.result as string,
                size: blob.size,
                width,
                height,
                compressionRatio: originalSize / blob.size
              });
            };
            reader.readAsDataURL(blob);
          },
          `image/${opts.format}`,
          opts.quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Load image
      if (file instanceof File) {
        img.src = URL.createObjectURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Compress multiple images
  async compressImages(
    files: File[],
    options: CompressionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<CompressedImage[]> {
    const results: CompressedImage[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      try {
        const compressed = await this.compressImage(files[i], options);
        results.push(compressed);
        
        if (onProgress) {
          onProgress(((i + 1) / total) * 100);
        }
      } catch (error) {
        console.error(`Failed to compress image ${files[i].name}:`, error);
      }
    }

    return results;
  }

  // Calculate new dimensions maintaining aspect ratio
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // If image is smaller than max dimensions, keep original
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    // Calculate aspect ratio
    const aspectRatio = originalWidth / originalHeight;

    let newWidth = maxWidth;
    let newHeight = maxWidth / aspectRatio;

    // Check if height exceeds max
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = maxHeight * aspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  // Create thumbnail
  async createThumbnail(
    file: File | Blob,
    size: number = 200
  ): Promise<CompressedImage> {
    return this.compressImage(file, {
      maxWidth: size,
      maxHeight: size,
      quality: 0.7,
      format: 'webp'
    });
  }

  // Estimate compressed size
  estimateCompressedSize(
    originalSize: number,
    quality: number = 0.8
  ): number {
    // Rough estimation based on quality
    const compressionRatio = quality < 0.5 ? 0.1 : quality < 0.7 ? 0.2 : 0.3;
    return Math.round(originalSize * compressionRatio);
  }

  // Check if compression is needed
  shouldCompress(file: File): boolean {
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    return file.size > MAX_SIZE && COMPRESSIBLE_TYPES.includes(file.type);
  }

  // Convert base64 to blob
  base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}

// Export singleton instance
const imageCompressor = new ImageCompressor();

export { imageCompressor };