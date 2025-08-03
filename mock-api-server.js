/**
 * Mock API Server for Development
 * 模拟后端API服务器，用于开发测试
 */

const http = require('http');
const url = require('url');

// In-memory storage
let unifiedConfig = {};
let providers = {
  openai: [
    { id: '1', name: 'OpenAI Main', enabled: true, apiKey: 'sk-xxx' }
  ],
  google: [
    { id: '2', name: 'Google AI', enabled: true, apiKey: 'xxx' }
  ]
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  // Route handlers
  if (pathname === '/api/admin/unified-config' && req.method === 'GET') {
    // Get unified config
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: unifiedConfig
    }));
  } 
  else if (pathname === '/api/admin/unified-config' && req.method === 'POST') {
    // Save unified config
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        unifiedConfig = JSON.parse(body);
        console.log('✅ Unified config saved:', Object.keys(unifiedConfig));
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: 'Configuration saved to database'
        }));
      } catch (error) {
        console.error('❌ Error parsing request body:', error);
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid JSON'
        }));
      }
    });
  }
  else if (pathname === '/api/admin/providers' && req.method === 'GET') {
    // Get providers
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: providers
    }));
  }
  else {
    // 404 Not Found
    res.writeHead(404);
    res.end(JSON.stringify({
      success: false,
      error: 'Not Found'
    }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`);
  console.log('📝 Available endpoints:');
  console.log('  GET  /api/admin/unified-config');
  console.log('  POST /api/admin/unified-config');
  console.log('  GET  /api/admin/providers');
});