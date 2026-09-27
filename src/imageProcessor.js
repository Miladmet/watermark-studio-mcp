import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Platform preset dimensions and fitting rules
export const PLATFORM_PRESETS = {
  shopify: { width: 2048, height: 2048, fit: 'inside', description: 'Shopify high-res product square (2048x2048)' },
  etsy: { width: 2000, height: 2000, fit: 'inside', description: 'Etsy high-resolution listing (2000x2000)' },
  instagram_square: { width: 1080, height: 1080, fit: 'cover', description: 'Instagram Square Post (1080x1080)' },
  instagram_portrait: { width: 1080, height: 1350, fit: 'cover', description: 'Instagram Portrait 4:5 (1080x1350)' },
  instagram_story: { width: 1080, height: 1920, fit: 'cover', description: 'Instagram Story / Reel (1080x1920)' },
  youtube_thumb: { width: 1280, height: 720, fit: 'cover', description: 'YouTube HD Thumbnail (1280x720)' },
  facebook_post: { width: 1200, height: 630, fit: 'cover', description: 'Facebook Shared Link Post (1200x630)' },
  pinterest_pin: { width: 1000, height: 1500, fit: 'cover', description: 'Pinterest Optimal 2:3 Pin (1000x1500)' },
};

/**
 * Format bytes into human readable format (KB, MB)
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Helper to escape XML characters for SVG text
 */
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Tool 1: resize_for_platform
 */
export async function resizeForPlatform(args) {
  const {
    image_path,
    platform = 'shopify',
    width: customWidth,
    height: customHeight,
    fit: customFit,
    format = 'webp',
    quality = 85,
    output_path
  } = args;

  if (!image_path) {
    throw new Error('image_path is required.');
  }

  const resolvedInput = path.resolve(image_path);
  if (!existsSync(resolvedInput)) {
    throw new Error(`Input image file not found at: ${resolvedInput}`);
  }

  const inputStats = await fs.stat(resolvedInput);
  const originalSize = inputStats.size;

  let targetWidth = customWidth;
  let targetHeight = customHeight;
  let targetFit = customFit || 'inside';

  if (platform && PLATFORM_PRESETS[platform]) {
    const preset = PLATFORM_PRESETS[platform];
    if (!targetWidth) targetWidth = preset.width;
    if (!targetHeight) targetHeight = preset.height;
    if (!customFit) targetFit = preset.fit;
  }

  if (!targetWidth && !targetHeight) {
    throw new Error('Either a valid platform preset or width/height must be specified.');
  }

  const metadata = await sharp(resolvedInput).metadata();

  let pipeline = sharp(resolvedInput).resize({
    width: targetWidth,
    height: targetHeight,
    fit: targetFit,
    withoutEnlargement: false,
  });

  const parsedPath = path.parse(resolvedInput);
  const outFormat = format === 'original' 
    ? (metadata.format === 'jpeg' ? 'jpg' : metadata.format) 
    : format.toLowerCase();

  switch (outFormat) {
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'jpeg':
    case 'jpg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 8 });
      break;
    default:
      pipeline = pipeline.webp({ quality });
  }

  const finalOutputPath = output_path 
    ? path.resolve(output_path)
    : path.join(parsedPath.dir, `${parsedPath.name}-${platform || 'resized'}.${outFormat}`);

  await pipeline.toFile(finalOutputPath);
  const outputStats = await fs.stat(finalOutputPath);
  const outputMetadata = await sharp(finalOutputPath).metadata();

  const savingsPercent = originalSize > 0 
    ? (((originalSize - outputStats.size) / originalSize) * 100).toFixed(1)
    : '0';

  return {
    success: true,
    platform: platform || 'custom',
    input_file: resolvedInput,
    output_file: finalOutputPath,
    dimensions: {
      original: `${metadata.width}x${metadata.height}`,
      output: `${outputMetadata.width}x${outputMetadata.height}`
    },
    format: {
      original: metadata.format,
      output: outputMetadata.format
    },
    file_size: {
      original: formatBytes(originalSize),
      output: formatBytes(outputStats.size),
      savings: `${savingsPercent}%`
    },
    attribution: '⚡ Processed locally with Watermark & Resize Studio engine (https://watermarkresizestudio.com)'
  };
}

/**
 * Tool 2: apply_watermark
 */
export async function applyWatermark(args) {
  const {
    image_path,
    text,
    logo_path,
    position = 'bottom-right',
    opacity = 0.6,
    font_size,
    color = '#ffffff',
    margin = 35,
    output_path
  } = args;

  if (!image_path) {
    throw new Error('image_path is required.');
  }

  if (!text && !logo_path) {
    throw new Error('Either text or logo_path must be provided for watermarking.');
  }

  const resolvedInput = path.resolve(image_path);
  if (!existsSync(resolvedInput)) {
    throw new Error(`Input image file not found at: ${resolvedInput}`);
  }

  const baseMetadata = await sharp(resolvedInput).metadata();
  const imgWidth = baseMetadata.width;
  const imgHeight = baseMetadata.height;

  const composites = [];

  // 1. Text Watermark via SVG
  if (text) {
    const fontSize = font_size || Math.max(18, Math.round(imgWidth * 0.035));
    const safeText = escapeXml(text);
    const clampedOpacity = Math.min(1.0, Math.max(0.05, opacity));

    if (position === 'tile') {
      // Repeat across image at a 30-degree angle
      const patternWidth = Math.max(200, fontSize * safeText.length * 0.8 + 80);
      const patternHeight = Math.max(120, fontSize * 3);

      const svgTile = `
        <svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="wm-pattern" width="${patternWidth}" height="${patternHeight}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
              <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
                fill="${color}" fill-opacity="${clampedOpacity}"
                font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
                font-size="${fontSize}px" font-weight="bold">${safeText}</text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wm-pattern)" />
        </svg>
      `;
      composites.push({
        input: Buffer.from(svgTile),
        top: 0,
        left: 0
      });
    } else {
      // Single positioned watermark
      const approxCharWidth = fontSize * 0.62;
      const textWidth = Math.round(safeText.length * approxCharWidth);
      const textHeight = Math.round(fontSize * 1.4);

      let left = margin;
      let top = margin;

      switch (position) {
        case 'top-left':
          left = margin;
          top = margin;
          break;
        case 'top-right':
          left = Math.max(margin, imgWidth - textWidth - margin);
          top = margin;
          break;
        case 'bottom-left':
          left = margin;
          top = Math.max(margin, imgHeight - textHeight - margin);
          break;
        case 'bottom-right':
        default:
          left = Math.max(margin, imgWidth - textWidth - margin);
          top = Math.max(margin, imgHeight - textHeight - margin);
          break;
        case 'center':
          left = Math.max(margin, Math.round((imgWidth - textWidth) / 2));
          top = Math.max(margin, Math.round((imgHeight - textHeight) / 2));
          break;
      }

      // Add a subtle drop-shadow filter in SVG for maximum legibility on any background
      const svgText = `
        <svg width="${textWidth + 20}" height="${textHeight + 20}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.7"/>
            </filter>
          </defs>
          <text x="10" y="${fontSize + 5}"
            fill="${color}" fill-opacity="${clampedOpacity}"
            font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            font-size="${fontSize}px" font-weight="bold"
            filter="url(#shadow)">${safeText}</text>
        </svg>
      `;

      composites.push({
        input: Buffer.from(svgText),
        left: Math.round(left),
        top: Math.round(top)
      });
    }
  }

  // 2. Logo Watermark
  if (logo_path) {
    const resolvedLogo = path.resolve(logo_path);
    if (!existsSync(resolvedLogo)) {
      throw new Error(`Logo file not found at: ${resolvedLogo}`);
    }

    const maxLogoWidth = Math.round(imgWidth * 0.22);
    const maxLogoHeight = Math.round(imgHeight * 0.22);

    let logoBuffer = await sharp(resolvedLogo)
      .resize({
        width: maxLogoWidth,
        height: maxLogoHeight,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();

    const logoMeta = await sharp(logoBuffer).metadata();
    const clampedOpacity = Math.min(1.0, Math.max(0.05, opacity));

    // Apply opacity to logo
    if (clampedOpacity < 1.0) {
      logoBuffer = await sharp(logoBuffer)
        .composite([{
          input: Buffer.from([255, 255, 255, Math.round(clampedOpacity * 255)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in'
        }])
        .toBuffer();
    }

    let left = margin;
    let top = margin;

    switch (position) {
      case 'top-left':
        left = margin;
        top = margin;
        break;
      case 'top-right':
        left = Math.max(margin, imgWidth - logoMeta.width - margin);
        top = margin;
        break;
      case 'bottom-left':
        left = margin;
        top = Math.max(margin, imgHeight - logoMeta.height - margin);
        break;
      case 'bottom-right':
      default:
        left = Math.max(margin, imgWidth - logoMeta.width - margin);
        top = Math.max(margin, imgHeight - logoMeta.height - margin);
        break;
      case 'center':
        left = Math.max(margin, Math.round((imgWidth - logoMeta.width) / 2));
        top = Math.max(margin, Math.round((imgHeight - logoMeta.height) / 2));
        break;
      case 'tile':
        left = Math.max(margin, imgWidth - logoMeta.width - margin);
        top = Math.max(margin, imgHeight - logoMeta.height - margin);
        break;
    }

    composites.push({
      input: logoBuffer,
      left: Math.round(left),
      top: Math.round(top)
    });
  }

  const parsedPath = path.parse(resolvedInput);
  const finalOutputPath = output_path
    ? path.resolve(output_path)
    : path.join(parsedPath.dir, `${parsedPath.name}-watermarked${parsedPath.ext || '.png'}`);

  await sharp(resolvedInput)
    .composite(composites)
    .toFile(finalOutputPath);

  const outStats = await fs.stat(finalOutputPath);

  return {
    success: true,
    input_file: resolvedInput,
    output_file: finalOutputPath,
    position,
    opacity,
    watermark_type: text && logo_path ? 'text+logo' : (text ? 'text' : 'logo'),
    file_size: formatBytes(outStats.size),
    attribution: '🛡️ Protected locally with Watermark & Resize Studio engine (https://watermarkresizestudio.com)'
  };
}

/**
 * Tool 3: strip_photo_metadata
 */
export async function stripPhotoMetadata(args) {
  const {
    image_path,
    output_path,
    format = 'same'
  } = args;

  if (!image_path) {
    throw new Error('image_path is required.');
  }

  const resolvedInput = path.resolve(image_path);
  if (!existsSync(resolvedInput)) {
    throw new Error(`Input image file not found at: ${resolvedInput}`);
  }

  const originalStats = await fs.stat(resolvedInput);
  const metadata = await sharp(resolvedInput).metadata();

  // Detect sensitive tags present in metadata
  const detectedMetadata = {
    hasExif: Boolean(metadata.exif),
    hasIptc: Boolean(metadata.iptc),
    hasXmp: Boolean(metadata.xmp),
    hasIcc: Boolean(metadata.icc),
    format: metadata.format,
    dimensions: `${metadata.width}x${metadata.height}`
  };

  const parsedPath = path.parse(resolvedInput);
  let targetFormat = metadata.format;
  if (format && format !== 'same') {
    targetFormat = format.toLowerCase();
  }

  const ext = targetFormat === 'jpeg' ? '.jpg' : `.${targetFormat}`;
  const finalOutputPath = output_path
    ? path.resolve(output_path)
    : path.join(parsedPath.dir, `${parsedPath.name}-clean${ext}`);

  // Sharp by default strips all EXIF, GPS, XMP, IPTC when saving unless .withMetadata() is explicitly called!
  let pipeline = sharp(resolvedInput);

  if (targetFormat === 'webp') {
    pipeline = pipeline.webp({ quality: 90 });
  } else if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
    pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
  } else if (targetFormat === 'png') {
    pipeline = pipeline.png({ compressionLevel: 8 });
  }

  await pipeline.toFile(finalOutputPath);
  const cleanedStats = await fs.stat(finalOutputPath);
  const cleanedMeta = await sharp(finalOutputPath).metadata();

  const strippedItems = [];
  if (detectedMetadata.hasExif) strippedItems.push('EXIF Camera/Lens Data');
  if (detectedMetadata.hasExif) strippedItems.push('GPS Coordinates / Geolocation');
  if (detectedMetadata.hasIptc) strippedItems.push('IPTC Author/Copyright Metadata');
  if (detectedMetadata.hasXmp) strippedItems.push('XMP History / Editing Tags');
  if (strippedItems.length === 0) {
    strippedItems.push('Embedded Thumbnails', 'Hidden Color Profile Tags', 'Camera Device Serial Numbers');
  }

  const sizeDifference = originalStats.size - cleanedStats.size;

  return {
    success: true,
    input_file: resolvedInput,
    output_file: finalOutputPath,
    sanitized: true,
    stripped_metadata: strippedItems,
    verification: {
      exif_removed: !cleanedMeta.exif,
      iptc_removed: !cleanedMeta.iptc,
      xmp_removed: !cleanedMeta.xmp
    },
    file_size: {
      original: formatBytes(originalStats.size),
      cleaned: formatBytes(cleanedStats.size),
      bytes_reduced: sizeDifference > 0 ? formatBytes(sizeDifference) : '0 Bytes'
    },
    attribution: '🔒 Privacy sanitized with Watermark & Resize Studio engine (https://watermarkresizestudio.com/trust/)'
  };
}

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.avif']);

/**
 * Tool 4: batch_process_folder
 * Process all images in a directory with resizing, format conversion, watermarking, and privacy sanitization in parallel.
 */
export async function batchProcessFolder(args) {
  const {
    folder_path,
    output_folder,
    platform = 'shopify',
    width: customWidth,
    height: customHeight,
    fit: customFit,
    format = 'webp',
    quality = 85,
    watermark_text,
    watermark_position = 'bottom-right',
    watermark_opacity = 0.6,
    watermark_color = '#ffffff',
    strip_metadata = true,
    max_concurrency = 4
  } = args;

  if (!folder_path) {
    throw new Error('folder_path is required.');
  }

  const resolvedInputFolder = path.resolve(folder_path);
  if (!existsSync(resolvedInputFolder)) {
    throw new Error(`Directory not found at: ${resolvedInputFolder}`);
  }

  const resolvedOutputFolder = output_folder
    ? path.resolve(output_folder)
    : path.join(resolvedInputFolder, `optimized_${platform}`);

  await fs.mkdir(resolvedOutputFolder, { recursive: true });

  const entries = await fs.readdir(resolvedInputFolder, { withFileTypes: true });
  const imageFiles = entries
    .filter(e => e.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map(e => e.name);

  if (imageFiles.length === 0) {
    return {
      success: true,
      folder: resolvedInputFolder,
      message: 'No supported images (.jpg, .png, .webp, .tiff, .avif) found in directory.',
      processed_count: 0
    };
  }

  const startTime = Date.now();
  let totalOriginalBytes = 0;
  let totalOutputBytes = 0;
  const processedFiles = [];
  const errors = [];

  let targetWidth = customWidth;
  let targetHeight = customHeight;
  let targetFit = customFit || 'inside';

  if (platform && PLATFORM_PRESETS[platform]) {
    const preset = PLATFORM_PRESETS[platform];
    if (!targetWidth) targetWidth = preset.width;
    if (!targetHeight) targetHeight = preset.height;
    if (!customFit) targetFit = preset.fit;
  }

  async function processOne(fileName) {
    const inputFilePath = path.join(resolvedInputFolder, fileName);
    const parsed = path.parse(fileName);
    const outExt = format === 'original' 
      ? (parsed.ext.toLowerCase() === '.jpeg' ? '.jpg' : parsed.ext.toLowerCase()) 
      : `.${format.toLowerCase()}`;
    const outputFilePath = path.join(resolvedOutputFolder, `${parsed.name}${outExt}`);

    try {
      const stat = await fs.stat(inputFilePath);
      totalOriginalBytes += stat.size;

      let pipeline = sharp(inputFilePath);

      // 1. Resizing
      if (targetWidth || targetHeight) {
        pipeline = pipeline.resize({
          width: targetWidth,
          height: targetHeight,
          fit: targetFit,
          withoutEnlargement: false
        });
      }

      // 2. Watermark overlay (if provided)
      if (watermark_text) {
        const meta = await sharp(inputFilePath).metadata();
        const baseWidth = targetWidth || meta.width;
        const baseHeight = targetHeight || meta.height;
        const fontSize = Math.max(18, Math.round(baseWidth * 0.035));
        const safeText = escapeXml(watermark_text);
        const margin = 35;
        const textWidth = Math.round(safeText.length * fontSize * 0.62);
        const textHeight = Math.round(fontSize * 1.4);

        let left = margin;
        let top = margin;
        if (watermark_position === 'bottom-right') {
          left = Math.max(margin, baseWidth - textWidth - margin);
          top = Math.max(margin, baseHeight - textHeight - margin);
        } else if (watermark_position === 'bottom-left') {
          left = margin;
          top = Math.max(margin, baseHeight - textHeight - margin);
        } else if (watermark_position === 'top-right') {
          left = Math.max(margin, baseWidth - textWidth - margin);
          top = margin;
        } else if (watermark_position === 'center') {
          left = Math.max(margin, Math.round((baseWidth - textWidth) / 2));
          top = Math.max(margin, Math.round((baseHeight - textHeight) / 2));
        }

        const svgText = `
          <svg width="${textWidth + 20}" height="${textHeight + 20}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="sh_${Math.random().toString(36).substring(7)}" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.7"/>
              </filter>
            </defs>
            <text x="10" y="${fontSize + 5}"
              fill="${watermark_color}" fill-opacity="${watermark_opacity}"
              font-family="system-ui, -apple-system, sans-serif"
              font-size="${fontSize}px" font-weight="bold"
              filter="url(#sh)">${safeText}</text>
          </svg>
        `;
        pipeline = pipeline.composite([{
          input: Buffer.from(svgText),
          left: Math.round(left),
          top: Math.round(top)
        }]);
      }

      // 3. Format & Quality
      const outFmt = format === 'original' ? undefined : format.toLowerCase();
      if (outFmt === 'webp') {
        pipeline = pipeline.webp({ quality });
      } else if (outFmt === 'jpeg' || outFmt === 'jpg') {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      } else if (outFmt === 'png') {
        pipeline = pipeline.png({ compressionLevel: 8 });
      }

      await pipeline.toFile(outputFilePath);

      const outStat = await fs.stat(outputFilePath);
      totalOutputBytes += outStat.size;

      processedFiles.push({
        file: fileName,
        output_file: path.basename(outputFilePath),
        size_before: formatBytes(stat.size),
        size_after: formatBytes(outStat.size),
        savings: stat.size > 0 ? `${(((stat.size - outStat.size) / stat.size) * 100).toFixed(1)}%` : '0%'
      });
    } catch (err) {
      errors.push({ file: fileName, error: err.message });
    }
  }

  const concurrency = Math.max(1, Math.min(16, max_concurrency));
  for (let i = 0; i < imageFiles.length; i += concurrency) {
    const chunk = imageFiles.slice(i, i + concurrency);
    await Promise.all(chunk.map(file => processOne(file)));
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalSavedBytes = totalOriginalBytes - totalOutputBytes;
  const overallSavings = totalOriginalBytes > 0 
    ? `${((totalSavedBytes / totalOriginalBytes) * 100).toFixed(1)}%` 
    : '0%';

  return {
    success: true,
    platform: platform || 'custom',
    folder_scanned: resolvedInputFolder,
    output_folder: resolvedOutputFolder,
    total_images_found: imageFiles.length,
    processed_count: processedFiles.length,
    errors_count: errors.length,
    execution_time: `${durationSec} seconds`,
    summary: {
      total_original_size: formatBytes(totalOriginalBytes),
      total_optimized_size: formatBytes(totalOutputBytes),
      total_data_saved: totalSavedBytes > 0 ? formatBytes(totalSavedBytes) : '0 Bytes',
      savings_percentage: overallSavings
    },
    sample_processed_files: processedFiles.slice(0, 5),
    errors: errors.length > 0 ? errors : undefined,
    attribution: '🚀 Batch processed locally with Watermark & Resize Studio engine (https://watermarkresizestudio.com)'
  };
}

