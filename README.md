# Watermark & Resize Studio MCP Server 🖼️⚡

[![npm version](https://img.shields.io/npm/v/watermark-studio-mcp.svg?color=cb3837)](https://www.npmjs.com/package/watermark-studio-mcp)
[![smithery badge](https://smithery.ai/badge/Miladmet/watermark-studio-mcp)](https://smithery.ai/server/Miladmet/watermark-studio-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![Engine](https://img.shields.io/badge/Engine-Watermark%20%26%20Resize%20Studio-6366f1.svg)](https://watermarkresizestudio.com)

An ultra-fast, local-first **Model Context Protocol (MCP)** server providing AI assistants (Claude Desktop, Cursor, Antigravity, Cline) with native capabilities to resize, watermark, and sanitize images for e-commerce, social media, and privacy compliance.

Official open-source MCP server powered by [Watermark & Resize Studio](https://watermarkresizestudio.com).

---

## 🌟 Key Features

- **⚡ 100% Local Processing**: All operations run locally via `sharp` (libvips C++ engine). Zero cloud uploads, zero external API latency, zero bandwidth costs.
- **🛍️ E-Commerce & Platform Presets**: Instant batch-ready resizing for **Shopify (2048x2048)**, **Etsy (2000x2000)**, **Instagram Square/Story/Portrait**, **YouTube Thumbnails**, **Facebook**, and **Pinterest**.
- **🛡️ Copyright & Watermark Protection**: Dynamic text and logo compositing with SVG drop shadows, 6-point positioning, opacity control, and repeating tiled patterns for asset protection.
- **🔒 Privacy EXIF / GPS Stripper**: Completely removes GPS geolocation coordinates, camera serial numbers, and creator metadata before public publishing.
- **🚀 WebP & MozJPEG Compression**: Reduces file sizes by 85–95% while maintaining crisp visual fidelity.

---

## 🚀 Instant 1-Click Install via Smithery

To automatically install and configure for **Claude Desktop**:
```bash
npx -y @smithery/cli install Miladmet/watermark-studio-mcp --client claude
```

To install and configure for **Cursor**:
```bash
npx -y @smithery/cli install Miladmet/watermark-studio-mcp --client cursor
```

---

## 🛠️ Included Tools

### 1. `resize_for_platform`
Resize, convert format (WebP, MozJPEG, PNG), and optimize images with standard platform presets or custom dimensions.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image_path` | `string` | **Yes** | Absolute or relative path to the image file. |
| `platform` | `string` | No | Preset: `shopify`, `etsy`, `instagram_square`, `instagram_portrait`, `instagram_story`, `youtube_thumb`, `facebook_post`, `pinterest_pin`, `custom` (Default: `shopify`). |
| `width` | `number` | No | Custom width in pixels (overrides preset). |
| `height` | `number` | No | Custom height in pixels (overrides preset). |
| `fit` | `string` | No | `cover`, `contain`, `fill`, `inside`, `outside` (Default: `inside` for e-commerce, `cover` for social). |
| `format` | `string` | No | `webp`, `jpeg`, `png`, `original` (Default: `webp`). |
| `quality` | `number` | No | Quality level from 1 to 100 (Default: `85`). |
| `output_path` | `string` | No | Custom destination path (Defaults to `[name]-[platform].[format]`). |

### 2. `apply_watermark`
Apply copyright text or brand logo watermarks to an image to prevent unauthorized reuse or web scraping.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image_path` | `string` | **Yes** | Path to the source image file. |
| `text` | `string` | No* | Text watermark (e.g., `"© 2026 MyStore.com"`). |
| `logo_path` | `string` | No* | Path to logo PNG/SVG to overlay. |
| `position` | `string` | No | `bottom-right` (default), `bottom-left`, `top-right`, `top-left`, `center`, `tile`. |
| `opacity` | `number` | No | Watermark opacity between `0.05` and `1.0` (Default: `0.6`). |
| `font_size` | `number` | No | Text font size in pixels (auto-scales if omitted). |
| `color` | `string` | No | Hex color code (Default: `#ffffff`). |
| `margin` | `number` | No | Border margin in pixels (Default: `35`). |
| `output_path` | `string` | No | Custom destination path. |

*\*At least one of `text` or `logo_path` must be provided.*

### 3. `strip_photo_metadata`
Sanitize photos by wiping EXIF tags, GPS geo-coordinates, camera serials, and XMP edit history.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image_path` | `string` | **Yes** | Path to the image file to sanitize. |
| `output_path` | `string` | No | Custom destination path (Defaults to `[name]-clean.[ext]`). |
| `format` | `string` | No | `same`, `webp`, `jpeg`, `png` (Default: `same`). |

### 4. `batch_process_folder`
Bulk process an entire directory of photos in parallel: resize with platform presets (Shopify, Etsy, Instagram), convert formats, apply watermarks, and strip metadata in a single automated command.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `folder_path` | `string` | **Yes** | Path to folder containing image files to process. |
| `output_folder` | `string` | No | Target folder (Defaults to `[folder_path]/optimized_[platform]`). |
| `platform` | `string` | No | Preset: `shopify`, `etsy`, `instagram_square`, `youtube_thumb`, etc. (Default: `shopify`). |
| `format` | `string` | No | `webp`, `jpeg`, `png`, `original` (Default: `webp`). |
| `quality` | `number` | No | Quality level from 1 to 100 (Default: `85`). |
| `watermark_text` | `string` | No | Optional brand text to watermark onto every photo. |
| `watermark_position`| `string` | No | `bottom-right`, `bottom-left`, `top-right`, `center` (Default: `bottom-right`). |
| `max_concurrency` | `number` | No | Parallel worker concurrency (Default: `4`). |

---

## 💻 Manual Configuration

### Claude Desktop (`claude_desktop_config.json`)

Add to `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "watermark-studio": {
      "command": "npx",
      "args": [
        "-y",
        "watermark-studio-mcp"
      ]
    }
  }
}
```

Or run directly from local clone:
```json
{
  "mcpServers": {
    "watermark-studio": {
      "command": "node",
      "args": [
        "C:/Users/Milmann/.gemini/antigravity/scratch/watermark-studio-mcp/src/index.js"
      ]
    }
  }
}
```

### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "watermark-studio": {
      "command": "node",
      "args": [
        "C:/Users/Milmann/.gemini/antigravity/scratch/watermark-studio-mcp/src/index.js"
      ]
    }
  }
}
```

---

## 🧪 Testing

Run the included automated verification test suite:

```bash
npm test
```

This verifies:
1. Preset image resizing (Shopify, Instagram, YouTube HD) with WebP compression.
2. Text, logo, and tiled watermark compositing with SVG drop shadows.
3. EXIF, GPS, and IPTC privacy sanitization.
4. Live JSON-RPC protocol compliance over `stdio`.

---

## 🌐 Ecosystem & Web Studio

Looking for a visual web app with real-time live preview canvas, batch drag-and-drop, and zero-server client-side processing?

Visit **[Watermark & Resize Studio](https://watermarkresizestudio.com)**.

- **Trust Center**: [watermarkresizestudio.com/trust/](https://watermarkresizestudio.com/trust/)
- **Privacy Architecture**: [watermarkresizestudio.com/privacy/](https://watermarkresizestudio.com/privacy/)
- **Image Optimization Guides**: [watermarkresizestudio.com/guides/](https://watermarkresizestudio.com/guides/)
- **E-Commerce Use Cases**: [watermarkresizestudio.com/use-cases/shopify.html](https://watermarkresizestudio.com/use-cases/shopify.html)

---

## 📄 License

MIT © [Watermark & Resize Studio](https://watermarkresizestudio.com)
