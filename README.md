# Watermark & Resize Studio MCP Server 🖼️⚡

An ultra-fast, local-first **Model Context Protocol (MCP)** server providing AI assistants (Claude Desktop, Cursor, Antigravity, Cline) with native capabilities to resize, watermark, and sanitize images for e-commerce, social media, and privacy compliance.

Powered by the engine behind [Watermark & Resize Studio](https://watermarkresizestudio.com).

---

## 🌟 Key Features

- **⚡ 100% Local Processing**: All operations run locally via `sharp` (libvips C++ engine). Zero cloud uploads, zero external API latency, zero bandwidth costs.
- **🛍️ E-Commerce & Platform Presets**: Instant batch-ready resizing for **Shopify (2048x2048)**, **Etsy (2000x2000)**, **Instagram Square/Story/Portrait**, **YouTube Thumbnails**, **Facebook**, and **Pinterest**.
- **🛡️ Copyright & Watermark Protection**: Dynamic text and logo compositing with SVG drop shadows, 6-point positioning, opacity control, and repeating tiled patterns for asset protection.
- **🔒 Privacy EXIF / GPS Stripper**: Completely removes GPS geolocation coordinates, camera serial numbers, and creator metadata before public publishing.
- **🚀 WebP & MozJPEG Compression**: Reduces file sizes by 85–95% while maintaining crisp visual fidelity.

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

---

## 💻 Installation & Configuration

### Option A: Claude Desktop Configuration

Add the following entry to your `claude_desktop_config.json`:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "watermark-studio": {
      "command": "node",
      "args": [
        "C:\\Users\\Milmann\\.gemini\\antigravity\\scratch\\watermark-studio-mcp\\src\\index.js"
      ]
    }
  }
}
```

*(Or when published to npm: `"command": "npx", "args": ["-y", "watermark-studio-mcp"]`)*

### Option B: Cursor Configuration (`.cursor/mcp.json` or Global MCP)

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "watermark-studio": {
      "command": "node",
      "args": ["C:/Users/Milmann/.gemini/antigravity/scratch/watermark-studio-mcp/src/index.js"]
    }
  }
}
```

---

## 🧪 Testing

Run the included verification test suite:

```bash
npm test
```

This verifies:
1. Direct tool execution (Shopify, Instagram, YouTube presets, text/logo/tile watermarks, EXIF sanitization).
2. Protocol compliance over standard `stdio` JSON-RPC (`initialize`, `tools/list`, and `tools/call`).

---

## 🌐 Ecosystem & Web Studio

Need a visual web interface with real-time live preview canvas, batch drag-and-drop, and client-side ZIP packaging?

Visit **[Watermark & Resize Studio](https://watermarkresizestudio.com)**.

- **Trust Center**: [watermarkresizestudio.com/trust/](https://watermarkresizestudio.com/trust/)
- **Privacy Policy**: [watermarkresizestudio.com/privacy/](https://watermarkresizestudio.com/privacy/)
- **Format & Sizing Guides**: [watermarkresizestudio.com/guides/](https://watermarkresizestudio.com/guides/)

---

## 📄 License

MIT © [Watermark & Resize Studio](https://watermarkresizestudio.com)
