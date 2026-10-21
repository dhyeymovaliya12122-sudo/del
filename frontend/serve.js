import { createServer } from 'vite';

// Keep the event loop active indefinitely
const keepAlive = setInterval(() => {}, 1000 * 60 * 60);

process.on('uncaughtException', (err) => {
  console.error('[Frontend Server] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Frontend Server] Unhandled rejection:', reason);
});

process.on('exit', (code) => {
  console.log(`[Frontend Server] Process exit with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('[Frontend Server] Received SIGINT');
});

process.on('SIGTERM', () => {
  console.log('[Frontend Server] Received SIGTERM');
});

// Resume stdin if available, ignore end/close
if (process.stdin) {
  process.stdin.resume();
  process.stdin.on('end', () => {});
  process.stdin.on('error', () => {});
}

async function start() {
  const server = await createServer({
    configFile: './vite.config.ts',
    root: process.cwd(),
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
  });
  await server.listen();
  server.printUrls();
  console.log('Frontend server actively listening on port 5173');
}

start().catch((err) => {
  console.error('Failed to start frontend dev server:', err);
  process.exit(1);
});
