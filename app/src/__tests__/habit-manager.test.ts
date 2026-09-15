/**
 * Tests for HabitManager
 * Covers: skipped-vs-failed reporting (Fix 6) and config load memoization (Fix 8)
 */

import { HabitManager } from '../habit-manager';
import { loadHabitConfig } from '../config/loader';
import { NotionClientWrapper } from '../notion-client';
import { HabitConfig, CreateResult, HabitEntry } from '../types';

jest.mock('../config/loader');
const mockLoadHabitConfig = loadHabitConfig as jest.MockedFunction<
  typeof loadHabitConfig
>;

describe('HabitManager', () => {
  const allDays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  // Scheduled every day so these are due regardless of the actual test date.
  const dueHabitCreated: HabitConfig = {
    name: 'Due Habit (created)',
    templateId: 'template-a',
    frequency: [...allDays],
    startTime: '07:00',
    endTime: '08:00',
    enabled: true,
  };

  const dueHabitFailed: HabitConfig = {
    name: 'Due Habit (fails)',
    templateId: 'template-c',
    frequency: [...allDays],
    startTime: '09:00',
    endTime: '10:00',
    enabled: true,
  };

  // Disabled habits are never due, regardless of the current date.
  const disabledHabit: HabitConfig = {
    name: 'Disabled Habit',
    templateId: 'template-b',
    frequency: [...allDays],
    startTime: '11:00',
    endTime: '12:00',
    enabled: false,
  };

  function createMockNotionClient(): jest.Mocked<NotionClientWrapper> {
    return {
      validateConnection: jest.fn().mockResolvedValue({ valid: true }),
      createHabitWithRetry: jest.fn(),
    } as unknown as jest.Mocked<NotionClientWrapper>;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('skipped vs failed reporting', () => {
    it('distinguishes habits not due (skipped) from habits whose creation attempt failed', async () => {
      mockLoadHabitConfig.mockResolvedValue([
        dueHabitCreated,
        dueHabitFailed,
        disabledHabit,
      ]);

      const notionClient = createMockNotionClient();
      (notionClient.createHabitWithRetry as jest.Mock).mockImplementation(
        async (habit: HabitConfig): Promise<CreateResult> => {
          if (habit.name === dueHabitCreated.name) {
            const entry: HabitEntry = {
              id: 'page-1',
              title: habit.name,
              templateUsed: habit.templateId,
              timeRange: '07:00 - 08:00',
            };
            return { success: true, habitName: habit.name, entry };
          }
          return { success: false, habitName: habit.name, error: 'boom' };
        }
      );

      const manager = new HabitManager(notionClient, undefined, 'UTC');
      const result = await manager.createScheduledHabits();

      expect(result.created.map(h => h.title)).toEqual([dueHabitCreated.name]);
      expect(result.skipped).toEqual([disabledHabit.name]);
      expect(result.failed).toEqual([dueHabitFailed.name]);
      expect(result.errors).toEqual([`${dueHabitFailed.name}: boom`]);
      expect(result.success).toBe(false);
    });

    it('reports every loaded habit as skipped when none are due', async () => {
      mockLoadHabitConfig.mockResolvedValue([disabledHabit]);

      const notionClient = createMockNotionClient();
      const manager = new HabitManager(notionClient, undefined, 'UTC');
      const result = await manager.createScheduledHabits();

      expect(result.created).toEqual([]);
      expect(result.skipped).toEqual([disabledHabit.name]);
      expect(result.failed).toEqual([]);
      expect(result.success).toBe(true);
    });
  });

  describe('config load memoization', () => {
    it('loads the config file at most once per instance', async () => {
      mockLoadHabitConfig.mockResolvedValue([dueHabitCreated]);

      const notionClient = createMockNotionClient();
      (notionClient.createHabitWithRetry as jest.Mock).mockResolvedValue({
        success: true,
        habitName: dueHabitCreated.name,
        entry: {
          id: 'page-1',
          title: dueHabitCreated.name,
          templateUsed: dueHabitCreated.templateId,
          timeRange: '07:00 - 08:00',
        },
      });

      const manager = new HabitManager(notionClient, undefined, 'UTC');
      await manager.validateSystem();
      await manager.createScheduledHabits();

      expect(mockLoadHabitConfig).toHaveBeenCalledTimes(1);
    });

    it('does not cache a failed load -- it must throw again on every call', async () => {
      mockLoadHabitConfig.mockRejectedValue(new Error('disk error'));

      const notionClient = createMockNotionClient();
      const manager = new HabitManager(notionClient, undefined, 'UTC');

      const first = await manager.createScheduledHabits();
      const second = await manager.createScheduledHabits();

      expect(first.success).toBe(false);
      expect(second.success).toBe(false);
      expect(mockLoadHabitConfig).toHaveBeenCalledTimes(2);
    });
  });
});
