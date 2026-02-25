/**
 * Shared Express server base
 * - helmet + cors + json
 * - /health endpoint
 * - uncaughtException / unhandledRejection
 * - graceful shutdown (SIGINT/SIGTERM)
 * - EADDRINUSE handling
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

/**
 * Create an Express app with standard middleware
 *
 * @param {Object} opts
 * @param {string} opts.name - service name (used in health, logs)
 * @param {Object} opts.cors - cors options (default: allow all)
 * @param {string|number} opts.jsonLimit - body parser limit (default: '1mb')
 * @param {boolean} opts.noHelmet - skip helmet (default: false)
 * @returns {import('express').Express}
 */
function createServer(opts = {}) {
  const { name = 'service', jsonLimit = '1mb', noHelmet = false, health } = opts;
  const app = express();

  if (!noHelmet) app.use(helmet());
  app.use(cors(opts.cors || {}));
  app.use(express.json({ limit: jsonLimit }));

  // Health endpoint (skip if health === false, use custom if function)
  if (health !== false) {
    app.get('/health', typeof health === 'function' ? health : (req, res) => {
      res.json({
        status: 'ok',
        service: name,
        uptime: Math.round(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      });
    });
  }

  return app;
}

/**
 * Attach global error handlers (uncaughtException, unhandledRejection)
 *
 * @param {string} name - service name for logging
 */
function attachErrorHandlers(name = 'service') {
  process.on('uncaughtException', (err) => {
    console.error(`[${name}] FATAL uncaughtException:`, err.message);
  });
  process.on('unhandledRejection', (reason) => {
    console.error(`[${name}] FATAL unhandledRejection:`, reason);
  });
}

/**
 * Start the server with EADDRINUSE handling and graceful shutdown
 *
 * @param {import('express').Express} app
 * @param {number} port
 * @param {Object} opts
 * @param {string} opts.name - service name
 * @param {Function} opts.onShutdown - cleanup callback before exit
 * @returns {Promise<import('http').Server>}
 */
function startServer(app, port, opts = {}) {
  const { name = 'service', onShutdown } = opts;

  attachErrorHandlers(name);

  return new Promise((resolve, reject) => {
    const host = process.env.HOST || '0.0.0.0';
    const server = app.listen(port, host, () => {
      console.log(`[${name}] Running on ${host}:${port}`);
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[${name}] Port ${port} already in use`);
        process.exit(1);
      }
      console.error(`[${name}] Server error:`, err.message);
      reject(err);
    });

    // Graceful shutdown
    let shuttingDown = false;
    const shutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[${name}] ${signal} received, shutting down...`);
      if (onShutdown) {
        try { await onShutdown(); } catch (err) {
          console.error(`[${name}] Shutdown cleanup error:`, err.message);
        }
      }
      server.close(() => process.exit(0));
      // Force exit after 10s
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  });
}

module.exports = { createServer, startServer, attachErrorHandlers };
