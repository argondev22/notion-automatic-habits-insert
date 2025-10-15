import { ServiceFactory } from './shared/factories/ServiceFactory';
import { ILogger } from './shared/logger/Logger';
import { WebhookServer } from './presentation/WebhookServer';

/**
 * アプリケーションのエントリーポイント
 * Webhookサーバーを起動
 */

const logger = ServiceFactory.getService<ILogger>('logger');

async function main() {
  try {
    logger.info('アプリケーション起動中...');

    // Webhookサーバーを起動
    const server = new WebhookServer();
    server.start();

    logger.info('アプリケーションの起動が完了しました');
  } catch (error) {
    logger.error('アプリケーションの起動に失敗しました', error as Error);
    process.exit(1);
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => {
  logger.info('SIGTERMを受信しました。シャットダウン中...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINTを受信しました。シャットダウン中...');
  process.exit(0);
});

// 未処理のエラーをキャッチ
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未処理のPromise拒否', undefined, {
    reason,
    promise,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('キャッチされていない例外', error);
  process.exit(1);
});

main();
