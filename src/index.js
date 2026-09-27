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
  PLATFORM_PRESETS
} from './imageProcessor.js';

const server = new Server(
  {
    name: 'watermark-studio-mcp',
    version: '1.0.0',
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
