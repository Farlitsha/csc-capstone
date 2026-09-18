/**
 * Ultra-low-data client-side image compression utility using HTML5 Canvas.
 * 
 * Scales images down to mobile-friendly dimensions (e.g., 600px max for listings,
 * 300px max for avatars) and encodes with WebP / JPEG at high compression efficiency.
 * Reduces 1.4MB - 8MB camera photos down to ~15KB - 25KB (98%+ data reduction).
 */

export async function compressImage(file, options = {}) {
  const {
    maxWidth = 600,
    maxHeight = 600,
    quality = 0.6,
    mimeType = "image/webp",
  } = options;

  // If already tiny (e.g., < 20 KB) and already a modern web format, return as is
  if (file.size < 20 * 1024 && (file.type === "image/webp" || file.type === "image/jpeg")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Compute new dimensions keeping aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file); // fallback to original if canvas 2d context unavailable
            return;
          }

          // Use smooth image scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Try WebP first, fallback to JPEG if toBlob fails or type not supported
          const tryFormats = [mimeType, "image/jpeg", "image/png"];
          
          function exportNext(formatIndex) {
            if (formatIndex >= tryFormats.length) {
              resolve(file); // fallback to original
              return;
            }
            const currentMime = tryFormats[formatIndex];
            canvas.toBlob(
              (blob) => {
                if (blob && blob.size > 0) {
                  const ext = currentMime === "image/webp" ? "webp" : (currentMime === "image/jpeg" ? "jpg" : "png");
                  const baseName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "image";
                  const compressedFile = new File([blob], `${baseName}.${ext}`, {
                    type: currentMime,
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                } else {
                  exportNext(formatIndex + 1);
                }
              },
              currentMime,
              quality
            );
          }

          exportNext(0);
        } catch (err) {
          console.warn("Image compression failed, using original file", err);
          resolve(file);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

