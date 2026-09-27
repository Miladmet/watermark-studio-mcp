# Watermark & Resize Studio MCP Server 🖼️⚡

[![npm version](https://img.shields.io/npm/v/watermark-studio-mcp.svg?color=cb3837)](https://www.npmjs.com/package/watermark-studio-mcp)
[![Glama](https://img.shields.io/badge/Glama-A--Grade%20Verified-10b981.svg)](https://glama.ai/mcp/servers/Miladmet/watermark-studio-mcp)
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
- **🖼️ 1200x630 OpenGraph Social Cards**: Generate viral Twitter/LinkedIn/OG preview cards with modern gradient themes (`dark-violet`, `ocean-blue`, `sunset`, `cyber-emerald`), auto text-wrapping, brand pills, and background photo/logo overlays.
- **🔒 Privacy EXIF / GPS Stripper**: Completely removes GPS geolocation coordinates, camera serial numbers, and creator metadata before public publishing.
- **🚀 WebP & MozJPEG Compression**: Reduces file sizes by 85–95% while maintaining crisp visual fidelity.

---

## 🚀 Quick Setup (Claude Desktop & Cursor)

Because `watermark-studio-mcp` is published on the official npm registry, setup takes 10 seconds with **zero build steps**.

### 1. Claude Desktop
Add to your Claude configuration file:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "watermark-studio": {
      "command": "npx",
      "args": ["-y", "watermark-studio-mcp"]
    }
  }
}
```

### 2. Cursor AI
Add to `.cursor/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "watermark-studio": {
      "command": "npx",
      "args": ["-y", "watermark-studio-mcp"]
    }
  }
}
```

### 3. Verified on Glama
Explore schemas, interactive docs, and test calls on **[Glama.ai Directory](https://glama.ai/mcp/servers/Miladmet/watermark-studio-mcp)** (A-Grade Verified).

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

### 5. `generate_social_card`
Generate professional 1200x630 OpenGraph and Twitter preview cards with modern gradients, bold typography, brand pill badges, and optional background photo or logo overlays.

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | Headline text for the social card (e.g., blog post title or product update). |
| `subtitle` | `string` | No | Supporting subheader or descriptive tagline. |
| `brand_name` | `string` | No | Brand/category text for top pill badge (Default: `Watermark & Resize Studio`). |
| `theme` | `string` | No | Gradient scheme: `dark-violet`, `ocean-blue`, `sunset`, `cyber-emerald` (Default: `dark-violet`). |
| `logo_path` | `string` | No | Path to brand logo PNG/SVG to overlay in top-right. |
| `background_image_path` | `string` | No | Path to background photo (automatically blurred with dark contrast mask). |
| `format` | `string` | No | `png`, `webp`, `jpeg` (Default: `png`). |
| `quality` | `number` | No | Compression quality from 1 to 100 (Default: `90`). |
| `output_path` | `string` | No | Custom destination path (Defaults to `social-card-[slug].[format]`). |

---

## 💻 Running from Local Source (Development)

To run directly from a local clone of this repository instead of npm:

```json
{
  "mcpServers": {
    "watermark-studio": {
      "command": "node",
      "args": [
        "C:/path/to/watermark-studio-mcp/src/index.js"
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
4. Parallel multi-core batch processing of entire image folders.
5. 1200x630 OpenGraph social card generation with gradient themes and brand badges.
6. Live JSON-RPC protocol compliance over `stdio`.

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
