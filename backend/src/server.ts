import { createServer } from 'node:http';

import { createApp } from './app';
import { loadConfig } from './config/env';
import { closePool } from './database/pool';
import { logger } from './utils/logger';

const config = loadConfig();
const app = createApp();
const server = createServer(app);

server.listen(config.port, () => {
  logger.info('server_started', {
    port: config.port,
    environment: process.env.NODE_ENV ?? 'development'
  });
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info('shutdown_started', { signal });

  server.close((error?: Error) => {
    closePool()
      .then(() => {
        if (error !== undefined) {
          logger.error('shutdown_failed', { error });
          process.exit(1);
        }

        logger.info('shutdown_completed');
        process.exit(0);
      })
      .catch((closeError: unknown) => {
        logger.error('shutdown_failed', { error: closeError });
        process.exit(1);
      });
  });

  setTimeout(() => {
    logger.error('shutdown_forced', { signal });
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (error) => {
  logger.error('unhandled_rejection', { error });
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { error });
  process.exit(1);
});
