# Implementation Plan: Template-Based Habit Scheduler

## Overview

This implementation plan breaks down the Template-Based Habit Scheduler into discrete coding tasks. The system is built as a simple Node.js application with TypeScript, focusing on a one-shot CLI entry point (invoked by a GitHub Actions scheduled workflow — no server, no webhook), habit configuration management, and Notion API integration.

> **Note (architecture change):** The system originally shipped with an always-on Express webhook server (tasks 8/8.1 below, historically). It has since been overhauled into a cron-only, one-shot CLI with no HTTP surface at all, invoked directly by a GitHub Actions scheduled workflow (see `.github/workflows/run-habits.yml`). Task descriptions below have been updated to describe the current architecture; numbering is preserved for traceability rather than renumbered.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize Node.js project with TypeScript configuration
  - Install required dependencies (@notionhq/client, express, fast-check, jest)
  - Create basic directory structure (src/, config/, tests/)
  - Set up TypeScript compilation and build scripts
  - _Requirements: System setup and foundation_

- [x] 2. Implement core data models and interfaces
  - [x] 2.1 Create TypeScript interfaces for all data models
    - Define HabitConfig interface
    - Define HabitCreationResult, HabitEntry, SystemConfig interfaces
    - Create type definitions for Notion API responses
    - (Historical note: this originally also defined WebhookRequest/WebhookResponse interfaces; those were removed when the webhook server was replaced by the one-shot CLI)
    - _Requirements: 7.1, 7.3_

  - [x] 2.2 Write unit tests for data model validation
    - Test type guards and interface validation
    - Test all core data model interfaces
    - _Requirements: 7.1, 7.3_

- [x] 3. Implement configuration management
  - [x] 3.1 Create habit configuration loader
    - Implement loadHabitConfig() function to read habits.json
    - Add JSON schema validation for habit configurations
    - Handle file reading errors gracefully
    - _Requirements: 7.1, 7.2_

  - [x] 3.2 Write unit tests for configuration loading
    - Test valid configuration loading
    - Test invalid JSON handling
    - Test missing file scenarios
    - _Requirements: 7.1, 7.2_

- [x] 4. Implement time calculation utilities
  - [x] 4.1 Create time calculation functions
    - Implement calculateTimeRange() function
    - Add timezone handling using TIMEZONE environment variable
    - Ensure proper ISO string formatting for Notion API
    - _Requirements: 4.1, 4.3_

  - [x] 4.2 Write unit tests for time utilities
    - Test various time formats and edge cases
    - Test timezone conversion accuracy
    - Test date boundary conditions
    - _Requirements: 4.1, 4.3_

- [x] 5. Implement scheduling logic
  - [x] 5.1 Create habit scheduling functions
    - Implement isDueToday() function with frequency pattern support
    - Support specific weekday arrays only (no special keywords)
    - Handle enabled/disabled habit states
    - _Requirements: 2.2, 2.4_

  - [x] 5.2 Write unit tests for scheduling logic
    - Test all frequency patterns (specific weekdays)
    - Test edge cases (weekends, holidays)
    - Test enabled/disabled states
    - _Requirements: 2.2, 2.4_

- [x] 6. Implement Notion API integration
  - [x] 6.1 Create Notion client wrapper
    - Set up @notionhq/client with API key configuration
    - Implement createHabitFromTemplate() function
    - Handle Notion API errors and rate limiting
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Implement Habit Manager (core component)
  - [x] 7.1 Create HabitManager class
    - Implement createScheduledHabits() main function
    - Integrate configuration loading, scheduling, and Notion API
    - Add comprehensive error handling and logging
    - _Requirements: 2.1, 2.2, 6.1, 6.3_

- [x] 8. ~~Implement webhook server with security~~ Superseded: remove the webhook server entirely
  - [x] 8.1 ~~Create WebhookServer class~~ Delete `webhook-server.ts` and its Express/body-parser dependencies
    - (Historical: this task originally set up an Express.js server with `X-Webhook-Secret` validation, a `POST /webhook` endpoint, and a `GET /health` endpoint)
    - The webhook server, its auth logic, and the `/health` endpoint have been removed entirely — no replacement HTTP surface exists
    - Add a GitHub Actions scheduled workflow (`.github/workflows/run-habits.yml`) as the sole trigger instead
    - _Requirements: 5.1, 5.2, 5.3, 8.1, 8.2_

- [x] 9. Create application entry point
  - [x] 9.1 Implement main.ts as a one-shot CLI entry point
    - Load environment variables (`NOTION_API_KEY`, `TIMEBOX_DATABASE_ID`, optional `TIMEZONE`/`HABIT_CONFIG_PATH`) and validate configuration
    - Initialize HabitManager, run `validateSystem()` and `createScheduledHabits()`, then log a run summary
    - Exit with status code 0 on success or 1 on failure/errors (no signal handling or graceful shutdown — the process runs to completion and exits)
    - _Requirements: 1.1, 1.2, 1.3_

- [ ]\* 10. Write property-based tests for correctness properties
  - [ ]\* 10.1 Write property test for habit creation accuracy
    - **Property 1: Habit Creation Accuracy**
    - **Validates: Requirements 2.2, 2.4**

  - [ ]\* 10.2 Write property test for template application consistency
    - **Property 2: Template Application Consistency**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]\* 10.3 Write property test for time calculation reliability
    - **Property 3: Time Calculation Reliability**
    - **Validates: Requirements 4.1, 4.3**

  - [ ]\* 10.4 Write property test for configuration processing
    - **Property 4: Configuration Processing**
    - **Validates: Requirements 7.1, 7.3**

  - [ ]\* 10.5 Write property test for error handling robustness
    - **Property 5: Error Handling Robustness**
    - **Validates: Requirements 6.1, 6.3**

  - [ ]\* 10.6 Write property test for run outcome consistency
    - **Property 6: Run Outcome Consistency**
    - **Validates: Requirements 5.3, 5.4, 8.4**

- [ ]\* 11. Write integration tests
  - [ ]\* 11.1 Write integration tests for HabitManager
    - Test end-to-end habit creation flow
    - Test error recovery scenarios
    - Test multiple habit processing
    - _Requirements: 2.1, 2.2, 6.1, 6.3_

  - [ ]\* 11.2 ~~Write integration tests for WebhookServer~~ Superseded: no webhook server exists to test
    - (Historical: this task originally covered webhook security validation and webhook-to-Notion flow tests; there is no webhook server anymore)
    - _Requirements: 5.1, 5.2, 5.3, 8.1, 8.2_

  - [ ]\* 11.3 Write full application integration tests
    - Test complete scheduled-run-to-Notion flow (one-shot CLI invocation → habit creation → Notion API)
    - Test CLI startup, exit-code behavior, and process completion (no shutdown handling to test — the process simply exits)
    - Test environment variable validation
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 12. Create example configuration and documentation
  - [x] 12.1 Create .env.example file
    - Document all required environment variables
    - Provide example values for development
    - _Requirements: 7.1, 7.3_

  - [x] 12.2 Update habits.json with comprehensive examples
    - Ensure example configuration covers all use cases
    - Add comments explaining configuration options
    - _Requirements: 7.1, 7.2_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end functionality
- There is no webhook/HTTP surface to secure; the trigger boundary is GitHub Actions' own `schedule`/`workflow_dispatch` mechanisms (see task 8 above)
- Error handling ensures partial failures don't break the entire system
- Most core functionality is already implemented and tested
- Main remaining work is optional comprehensive testing (property-based and integration tests marked with `*`)
