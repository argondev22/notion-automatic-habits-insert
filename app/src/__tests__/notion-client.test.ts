/**
 * Tests for NotionClientWrapper
 * Covers: timezone injection (Fix 5) and status/code-based retry decisions (Fix 7)
 */

import { NotionClientWrapper, createNotionClient } from '../notion-client';

describe('NotionClientWrapper', () => {
  describe('isRetryableError (status/code based, not message substring matching)', () => {
    const client = new NotionClientWrapper('token', 'db-id');
    // isRetryableError is private; accessed via a cast for direct unit testing.
    const isRetryable = (result: Record<string, unknown>): boolean =>
      (
        client as unknown as { isRetryableError: (r: unknown) => boolean }
      ).isRetryableError(result);

    it('retries on retryable Notion API status codes', () => {
      for (const status of [429, 500, 502, 503, 504]) {
        expect(isRetryable({ success: false, habitName: 'x', status })).toBe(
          true
        );
      }
    });

    it('does not retry on non-retryable status codes', () => {
      for (const status of [400, 401, 403, 404]) {
        expect(isRetryable({ success: false, habitName: 'x', status })).toBe(
          false
        );
      }
    });

    it('retries on retryable network error codes', () => {
      for (const code of [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'EAI_AGAIN',
      ]) {
        expect(isRetryable({ success: false, habitName: 'x', code })).toBe(
          true
        );
      }
    });

    it('does not retry when the message merely contains a retryable-looking substring', () => {
      // Regression test: the pre-fix implementation substring-matched
      // '500'/'429'/etc. against the error MESSAGE, so an unrelated message
      // containing those digits would incorrectly trigger a retry.
      expect(
        isRetryable({
          success: false,
          habitName: 'x',
          error: 'Habit "Task 500" could not be found (order #429)',
        })
      ).toBe(false);
    });

    it('does not retry when neither status nor code is present', () => {
      expect(
        isRetryable({ success: false, habitName: 'x', error: 'Unknown error' })
      ).toBe(false);
    });
  });

  describe('timezone injection', () => {
    it('stores the constructor-injected timezone rather than reading process.env.TIMEZONE', () => {
      const originalEnv = process.env.TIMEZONE;
      process.env.TIMEZONE = 'Asia/Tokyo';

      const client = new NotionClientWrapper(
        'token',
        'db-id',
        'America/New_York'
      );
      expect((client as unknown as { timezone: string }).timezone).toBe(
        'America/New_York'
      );

      process.env.TIMEZONE = originalEnv;
    });

    it('defaults to UTC when no timezone is provided', () => {
      const client = new NotionClientWrapper('token', 'db-id');
      expect((client as unknown as { timezone: string }).timezone).toBe('UTC');
    });
  });

  describe('createNotionClient factory', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        NOTION_TOKEN: 'test-token',
        TIMEBOX_DATABASE_ID: 'test-db-id',
      };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('passes the given timezone through to the client', () => {
      const client = createNotionClient('Asia/Tokyo');
      expect((client as unknown as { timezone: string }).timezone).toBe(
        'Asia/Tokyo'
      );
    });

    it('defaults timezone to UTC when not provided', () => {
      const client = createNotionClient();
      expect((client as unknown as { timezone: string }).timezone).toBe('UTC');
    });
  });
});
