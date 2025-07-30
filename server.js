// Production server for Railway deployment
// Handles standalone Next.js application with error recovery

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

// Environment configuration
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app instance
const app = next({ 
  dev,
  hostname,
  port,
  dir: process.cwd(),
  conf: {
    distDir: '.next',
    compress: true,
    poweredByHeader: false,
  }
});

const handle = app.getRequestHandler();

// Error recovery mechanism
let serverRestartCount = 0;
const MAX_RESTART_ATTEMPTS = 5;

function startServer() {
  app.prepare()
    .then(() => {
      const server = createServer(async (req, res) => {
        try {
          const parsedUrl = parse(req.url, true);
          await handle(req, res, parsedUrl);
        } catch (err) {
          console.error('Request handler error:', err);
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });

      // Handle server errors
      server.on('error', (err) => {
        console.error('Server error:', err);
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use`);
          process.exit(1);
        }
      });

      // Handle uncaught errors
      process.on('uncaughtException', (err) => {
        console.error('Uncaught exception:', err);
        if (serverRestartCount < MAX_RESTART_ATTEMPTS) {
          serverRestartCount++;
          console.log(`Attempting to restart server (attempt ${serverRestartCount}/${MAX_RESTART_ATTEMPTS})...`);
          server.close(() => {
            setTimeout(startServer, 5000);
          });
        } else {
          console.error('Max restart attempts reached. Exiting...');
          process.exit(1);
        }
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('SIGINT signal received: closing HTTP server');
        server.close(() => {
          console.log('HTTP server closed');
          process.exit(0);
        });
      });

      // Start listening
      server.listen(port, hostname, (err) => {
        if (err) throw err;
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Environment: ${process.env.NODE_ENV}`);
        console.log(`> Node version: ${process.version}`);
        
        // Log important environment variables (without sensitive data)
        console.log('> Configuration:');
        console.log(`  - Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
        console.log(`  - Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Connected' : 'Not configured'}`);
        console.log(`  - Auth: ${process.env.NEXT_PUBLIC_POLAR_CLIENT_ID ? 'Polar configured' : 'Not configured'}`);
        
        // Reset restart counter on successful start
        serverRestartCount = 0;
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

// Health check endpoint for debugging
if (!dev) {
  const healthServer = createServer((req, res) => {
    if (req.url === '/health-debug') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node: process.version,
        env: process.env.NODE_ENV
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  
  healthServer.listen(3001, () => {
    console.log('> Health check server running on port 3001');
  });
}

// Start the server
console.log('Starting ClearSpendly server...');
startServer();