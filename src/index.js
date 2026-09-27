#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import {
  resizeForPlatform,
  applyWatermark,
  stripPhotoMetadata,
  batchProcessFolder,
  generateSocialCard,
  PLATFORM_PRESETS
} from './imageProcessor.js';

const server = new Server(
  {
    name: 'watermark-studio-mcp',
    version: '1.2.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tool schemas and capabilities
const TOOLS = [
  {
    name: 'resize_for_platform',
    description: 'Resize, format, and optimize images with industry presets for Shopify (2048x2048), Etsy (2000x2000), Instagram Square/Story/Portrait, YouTube Thumbnail, Facebook, Pinterest, or custom dimensions.',
    inputSchema: {
      type: 'object',
      properties: {
        image_path: {
          type: 'string',
          description: 'Absolute or relative path to the source image file (JPG, PNG, WebP, etc.).',
        },
        platform: {
          type: 'string',
          enum: [
            'shopify',
            'etsy',
            'instagram_square',
            'instagram_portrait',
            'instagram_story',
            'youtube_thumb',
            'facebook_post',
            'pinterest_pin',
            'custom'
          ],
          description: 'Platform preset: shopify (2048x2048), etsy (2000x2000), instagram_square (1080x1080), instagram_portrait (1080x1350), instagram_story (1080x1920), youtube_thumb (1280x720), facebook_post (1200x630), pinterest_pin (1000x1500), or custom.',
          default: 'shopify'
        },
        width: {
          type: 'number',
          description: 'Custom target width in pixels (optional, overrides preset width if given).',
        },
        height: {
          type: 'number',
          description: 'Custom target height in pixels (optional, overrides preset height if given).',
        },
        fit: {
          type: 'string',
          enum: ['cover', 'contain', 'fill', 'inside', 'outside'],
          description: 'Resize fit method. Defaults to inside for e-commerce, cover for social media.',
        },
        format: {
          type: 'string',
          enum: ['webp', 'jpeg', 'png', 'original'],
          description: 'Output image format. Defaults to webp for maximum compression and web speed.',
          default: 'webp'
        },
        quality: {
          type: 'number',
          description: 'Image quality level (1 to 100). Default is 85.',
          default: 85
        },
        output_path: {
          type: 'string',
          description: 'Optional destination file path. If omitted, saves in the same directory with descriptive name.',
        }
      },
      required: ['image_path'],
    },
  },
  {
    name: 'apply_watermark',
    description: 'Protect product photos, artwork, and marketing images by applying a text or logo watermark with customizable placement, opacity, and styling.',
    inputSchema: {
      type: 'object',
      properties: {
        image_path: {
          type: 'string',
          description: 'Absolute or relative path to the image to watermark.',
        },
        text: {
          type: 'string',
          description: 'Text to render as watermark (e.g., "© 2026 MyBrand", "PROMO COPY", "SAMPLE").',
        },
        logo_path: {
          type: 'string',
          description: 'Path to a PNG or transparent logo image to overlay as watermark.',
        },
        position: {
          type: 'string',
          enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center', 'tile'],
          description: 'Watermark position: bottom-right (default), bottom-left, top-right, top-left, center, or tile (repeats diagonally).',
          default: 'bottom-right'
        },
        opacity: {
          type: 'number',
          description: 'Watermark opacity level between 0.05 (very subtle) and 1.0 (fully opaque). Default is 0.6.',
          default: 0.6
        },
        font_size: {
          type: 'number',
          description: 'Font size in pixels for text watermark. Default auto-scales to image dimensions.',
        },
        color: {
          type: 'string',
          description: 'Color of text watermark in hex (e.g., "#ffffff", "#000000"). Default: #ffffff.',
          default: '#ffffff'
        },
        margin: {
          type: 'number',
          description: 'Padding in pixels from the border edge. Default: 35.',
          default: 35
        },
        output_path: {
          type: 'string',
          description: 'Optional destination file path. If omitted, saves as [name]-watermarked.[ext].',
        }
      },
      required: ['image_path'],
    },
  },
  {
    name: 'strip_photo_metadata',
    description: 'Privacy sanitization tool: Safely remove EXIF camera info, GPS geolocation, IPTC, and sensitive tracking tags from images before publishing or sharing.',
    inputSchema: {
      type: 'object',
      properties: {
        image_path: {
          type: 'string',
          description: 'Path to the image to sanitize and strip metadata from.',
        },
        output_path: {
          type: 'string',
          description: 'Optional destination file path. If omitted, saves as [name]-clean.[ext].',
        },
        format: {
          type: 'string',
          enum: ['same', 'webp', 'jpeg', 'png'],
          description: 'Output image format. Defaults to same as original.',
          default: 'same'
        }
      },
      required: ['image_path'],
    },
  },
  {
    name: 'batch_process_folder',
    description: 'Bulk process an entire directory of photos in parallel: resize with platform presets (Shopify, Etsy, Instagram), convert to WebP/JPEG, apply copyright watermarks, and strip EXIF privacy metadata in a single automated pass.',
    inputSchema: {
      type: 'object',
      properties: {
        folder_path: {
          type: 'string',
          description: 'Absolute or relative path to the folder containing image files to process.',
        },
        output_folder: {
          type: 'string',
          description: 'Optional destination folder. Defaults to [folder_path]/optimized_[platform].',
        },
        platform: {
          type: 'string',
          enum: [
            'shopify',
            'etsy',
            'instagram_square',
            'instagram_portrait',
            'instagram_story',
            'youtube_thumb',
            'facebook_post',
            'pinterest_pin',
            'custom'
          ],
          description: 'Platform preset: shopify (2048x2048), etsy (2000x2000), instagram_square (1080x1080), instagram_portrait (1080x1350), instagram_story (1080x1920), youtube_thumb (1280x720), facebook_post (1200x630), pinterest_pin (1000x1500), or custom.',
          default: 'shopify'
        },
        width: {
          type: 'number',
          description: 'Custom target width in pixels (optional, overrides preset).',
        },
        height: {
          type: 'number',
          description: 'Custom target height in pixels (optional, overrides preset).',
        },
        fit: {
          type: 'string',
          enum: ['cover', 'contain', 'fill', 'inside', 'outside'],
          description: 'Resize fit method. Defaults to inside for e-commerce, cover for social media.',
        },
        format: {
          type: 'string',
          enum: ['webp', 'jpeg', 'png', 'original'],
          description: 'Output format. Defaults to webp for maximum web compression.',
          default: 'webp'
        },
        quality: {
          type: 'number',
          description: 'Image quality level (1 to 100). Default is 85.',
          default: 85
        },
        watermark_text: {
          type: 'string',
          description: 'Optional copyright or brand text to watermark onto every image (e.g., "© 2026 MyBrand").',
        },
        watermark_position: {
          type: 'string',
          enum: ['bottom-right', 'bottom-left', 'top-right', 'center'],
          description: 'Placement of the watermark text. Default is bottom-right.',
          default: 'bottom-right'
        },
        watermark_opacity: {
          type: 'number',
          description: 'Watermark opacity (0.05 to 1.0). Default is 0.6.',
          default: 0.6
        },
        watermark_color: {
          type: 'string',
          description: 'Hex color code of watermark text. Default is #ffffff.',
          default: '#ffffff'
        },
        max_concurrency: {
          type: 'number',
          description: 'Number of images to process concurrently in parallel (1 to 16). Default is 4.',
          default: 4
        }
      },
      required: ['folder_path'],
    },
  },
  {
    name: 'generate_social_card',
    description: 'Generate high-converting 1200x630 OpenGraph and Twitter preview share cards with modern gradients, bold typography, brand pill badges, and optional background photo or logo overlays.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Headline text for the social card (e.g. blog title, product update, announcement).',
        },
        subtitle: {
          type: 'string',
          description: 'Optional secondary description or tagline.',
        },
        brand_name: {
          type: 'string',
          description: 'Brand or category name displayed in the top pill badge (default: "Watermark & Resize Studio").',
          default: 'Watermark & Resize Studio'
        },
        theme: {
          type: 'string',
          enum: ['dark-violet', 'ocean-blue', 'sunset', 'cyber-emerald'],
          description: 'Gradient color scheme for the card. Default is dark-violet.',
          default: 'dark-violet'
        },
        logo_path: {
          type: 'string',
          description: 'Optional path to a PNG/SVG logo to position in the top-right corner.',
        },
        background_image_path: {
          type: 'string',
          description: 'Optional path to a background photo to use behind the card (blurred and masked with dark overlay).',
        },
        format: {
          type: 'string',
          enum: ['png', 'webp', 'jpeg'],
          description: 'Output image format. Default is png.',
          default: 'png'
        },
        quality: {
          type: 'number',
          description: 'Image quality level (1 to 100). Default is 90.',
          default: 90
        },
        output_path: {
          type: 'string',
          description: 'Optional output file path. Defaults to social-card-[slug].[format] in current directory.',
        }
      },
      required: ['title'],
    },
  },
];

// Handle listing tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle calling tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'resize_for_platform': {
        const result = await resizeForPlatform(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'apply_watermark': {
        const result = await applyWatermark(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'strip_photo_metadata': {
        const result = await stripPhotoMetadata(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'batch_process_folder': {
        const result = await batchProcessFolder(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'generate_social_card': {
        const result = await generateSocialCard(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}. Available tools: ${TOOLS.map((t) => t.name).join(', ')}`
        );
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server using stdio transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Watermark Studio MCP Server running on stdio');
}

run().catch((error) => {
  console.error('Fatal error in Watermark Studio MCP Server:', error);
  process.exit(1);
});
