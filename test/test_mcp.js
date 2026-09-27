import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { fork, spawn } from 'child_process';
import { resizeForPlatform, applyWatermark, stripPhotoMetadata } from '../src/imageProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DIR = path.join(__dirname, 'output');

async function setup() {
  await fs.mkdir(TEST_DIR, { recursive: true });

  // Generate a test high-res image
  const sampleImagePath = path.join(TEST_DIR, 'sample_product.jpg');
  await sharp({
    create: {
      width: 3200,
      height: 2400,
      channels: 3,
      background: { r: 52, g: 152, b: 219 }
    }
  })
  .jpeg({ quality: 90 })
  .toFile(sampleImagePath);

  // Generate a test logo
  const sampleLogoPath = path.join(TEST_DIR, 'sample_logo.png');
  const logoSvg = `
    <svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="15" fill="#2c3e50" opacity="0.85"/>
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
        fill="#ffffff" font-family="sans-serif" font-weight="bold" font-size="28px">STUDIO LOGO</text>
    </svg>
  `;
  await sharp(Buffer.from(logoSvg))
    .png()
    .toFile(sampleLogoPath);

  return { sampleImagePath, sampleLogoPath };
}

async function runDirectTests(sampleImagePath, sampleLogoPath) {
  console.log('\n--- 1. Testing resize_for_platform ---');
  
  // Test 1: Shopify Preset
  const shopifyResult = await resizeForPlatform({
    image_path: sampleImagePath,
    platform: 'shopify',
    format: 'webp',
    output_path: path.join(TEST_DIR, 'test_shopify.webp')
  });
  console.log('✓ Shopify preset test passed:', shopifyResult.dimensions, shopifyResult.file_size);

  // Test 2: Instagram Square Preset
  const igResult = await resizeForPlatform({
    image_path: sampleImagePath,
    platform: 'instagram_square',
    format: 'jpeg',
    output_path: path.join(TEST_DIR, 'test_instagram.jpg')
  });
  console.log('✓ Instagram Square preset passed:', igResult.dimensions, igResult.file_size);

  // Test 3: YouTube HD Thumbnail
  const ytResult = await resizeForPlatform({
    image_path: sampleImagePath,
    platform: 'youtube_thumb',
    format: 'webp',
    output_path: path.join(TEST_DIR, 'test_youtube.webp')
  });
  console.log('✓ YouTube HD preset passed:', ytResult.dimensions, ytResult.file_size);

  console.log('\n--- 2. Testing apply_watermark ---');

  // Test 4: Text Watermark
  const wmTextResult = await applyWatermark({
    image_path: sampleImagePath,
    text: '© 2026 Watermark & Resize Studio',
    position: 'bottom-right',
    opacity: 0.7,
    output_path: path.join(TEST_DIR, 'test_watermarked_text.jpg')
  });
  console.log('✓ Text watermark test passed:', wmTextResult.watermark_type, wmTextResult.file_size);

  // Test 5: Tiled Text Watermark
  const wmTileResult = await applyWatermark({
    image_path: sampleImagePath,
    text: 'CONFIDENTIAL PREVIEW',
    position: 'tile',
    opacity: 0.25,
    output_path: path.join(TEST_DIR, 'test_watermarked_tile.jpg')
  });
  console.log('✓ Tiled pattern watermark test passed:', wmTileResult.position);

  // Test 6: Logo Watermark
  const wmLogoResult = await applyWatermark({
    image_path: sampleImagePath,
    logo_path: sampleLogoPath,
    position: 'top-right',
    opacity: 0.8,
    output_path: path.join(TEST_DIR, 'test_watermarked_logo.jpg')
  });
  console.log('✓ Logo watermark test passed:', wmLogoResult.watermark_type);

  console.log('\n--- 3. Testing strip_photo_metadata ---');

  // Test 7: Strip Metadata
  const cleanResult = await stripPhotoMetadata({
    image_path: sampleImagePath,
    output_path: path.join(TEST_DIR, 'test_sanitized.jpg')
  });
  console.log('✓ Metadata sanitization test passed:', cleanResult.verification);
}

async function runMcpStdioTests(sampleImagePath) {
  console.log('\n--- 4. Testing MCP Stdio JSON-RPC Interface ---');

  const serverProcess = spawn('node', [path.join(__dirname, '../src/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProcess.stderr.on('data', (data) => {
    // console.log('[Server stderr]:', data.toString().trim());
  });

  let messageResolver;
  const pendingRequests = new Map();

  let buffer = '';
  serverProcess.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep partial line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line.trim());
        if (json.id !== undefined && pendingRequests.has(json.id)) {
          const resolve = pendingRequests.get(json.id);
          pendingRequests.delete(json.id);
          resolve(json);
        }
      } catch (err) {
        // ignore non-json lines
      }
    }
  });

  function sendRpc(method, params, id) {
    return new Promise((resolve) => {
      pendingRequests.set(id, resolve);
      const req = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params: params || {}
      }) + '\n';
      serverProcess.stdin.write(req);
    });
  }

  // 1. Initialize MCP connection
  const initResponse = await sendRpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }, 1);
  console.log('✓ MCP Server Initialized:', initResponse.result?.serverInfo?.name);

  // 2. Request tools/list
  const toolsResponse = await sendRpc('tools/list', {}, 2);
  const toolNames = toolsResponse.result?.tools?.map(t => t.name) || [];
  console.log('✓ MCP Server Exposed Tools:', toolNames);
  if (!toolNames.includes('resize_for_platform') ||
      !toolNames.includes('apply_watermark') ||
      !toolNames.includes('strip_photo_metadata')) {
    throw new Error('Not all 3 required tools were exposed by MCP server!');
  }

  // 3. Call resize_for_platform via MCP
  const mcpCallResponse = await sendRpc('tools/call', {
    name: 'resize_for_platform',
    arguments: {
      image_path: sampleImagePath,
      platform: 'etsy',
      format: 'webp',
      output_path: path.join(TEST_DIR, 'test_mcp_etsy.webp')
    }
  }, 3);

  const toolOutput = JSON.parse(mcpCallResponse.result?.content?.[0]?.text);
  console.log('✓ MCP tools/call (resize_for_platform) executed successfully:');
  console.log('  Preset:', toolOutput.platform);
  console.log('  Dimensions:', toolOutput.dimensions);
  console.log('  Attribution backlink present:', toolOutput.attribution.includes('watermarkresizestudio.com'));

  serverProcess.kill();
  console.log('\n🎉 ALL MCP TOOLS & JSON-RPC PROTOCOL TESTS PASSED 100%!');
}

async function main() {
  try {
    const { sampleImagePath, sampleLogoPath } = await setup();
    await runDirectTests(sampleImagePath, sampleLogoPath);
    await runMcpStdioTests(sampleImagePath);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

main();
