# Implementation Plan: Template-Based Habit Scheduler

## Overview

This implementation plan breaks down the Template-Based Habit Scheduler into discrete coding tasks. The system will be built as a simple Node.js application with TypeScript, focusing on webhook handling, habit configuration management, and Notion API integration.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize Node.js project with TypeScript configuration
  - Install required dependencies (@notionhq/client, express, fast-check, jest)
  - Create basic directory structure (src/, config/, tests/)
  - Set up TypeScript compilation and build scripts
  - _Requirements: System setup and foundation_

- [-] 2. Implement core data models and interfaces
  - [x] 2.1 Create TypeScript interfaces for all data models
    - Define HabitConfig, WebhookRequest, WebhookResponse interfaces
    - Define HabitCreationResult, HabitEntry, SystemConfig interfaces
    - Create type definitions for Notion API responses
    - _Requirements: 7.1, 7.3_

  - [ ]\* 2.2 Write property test for data model validation
    - **Property 4: Configuration Processing**
    - **Validates: Requirements 7.1, 7.3**

- [x] 3. Implement configuration management
  - [x] 3.1 Create habit configuration loader
    - Implement loadHabitConfig() function to read habits.json
    - Add JSON schema validation for habit configurations
    - Handle file reading errors gracefully
    - _Requirements: 7.1, 7.2_

  - [ ]\* 3.2 Write unit tests for configuration loading
    - Test valid configuration loading
    - Test invalid JSON handling
    - Test missing file scenarios
    - _Requirements: 7.1, 7.2_

- [-] 4. Implement time calculation utilities
  - [x] 4.1 Create time calculation functions
    - Implement calculateTimeRange() function
    - Add timezone handling using TIMEZONE environment variable
    - Ensure proper ISO string formatting for Notion API
    - _Requirements: 4.1, 4.3_

  - [ ]\* 4.2 Write property test for time calculations
    - **Property 3: Time Calculation Reliability**
    - **Validates: Requirements 4.1, 4.3**

  - [ ]\* 4.3 Write unit tests for time utilities
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

  - [ ]\* 5.2 Write property test for scheduling accuracy
    - **Property 1: Habit Creation Accuracy**
    - **Validates: Requirements 2.2, 2.4**

  - [ ]\* 5.3 Write unit tests for scheduling logic
    - Test all frequency patterns (specific weekdays)
    - Test edge cases (weekends, holidays)
    - Test enabled/disabled states
    - _Requirements: 2.2, 2.4_

- [ ] 6. Checkpoint - Core utilities complete
  - Ensure all configuration, time, and scheduling utilities pass tests
  - Verify TypeScript compilation works correctly
  - Ask the user if questions arise

- [ ] 7. Implement Notion API integration
  - [ ] 7.1 Create Notion client wrapper
    - Set up @notionhq/client with API key configuration
    - Implement createHabitFromTemplate() function
    - Handle Notion API errors and rate limiting
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]\* 7.2 Write property test for template application
    - **Property 2: Template Application Consistency**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]\* 7.3 Write unit tests for Notion integration
    - Test successful habit creation
    - Test API error handling
    - Test template ID validation
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 8. Implement Habit Manager (core component)
  - [ ] 8.1 Create HabitManager class
    - Implement createScheduledHabits() main function
    - Integrate configuration loading, scheduling, and Notion API
    - Add comprehensive error handling and logging
    - _Requirements: 2.1, 2.2, 6.1, 6.3_

  - [ ]\* 8.2 Write integration tests for HabitManager
    - Test end-to-end habit creation flow
    - Test error recovery scenarios
    - Test multiple habit processing
    - _Requirements: 2.1, 2.2, 6.1, 6.3_

- [ ] 9. Implement webhook server with security
  - [ ] 9.1 Create WebhookServer class
    - Set up Express.js server with security validation
    - Implement validateSecret() function for authentication
    - Add proper HTTP status codes and error responses
    - _Requirements: 5.1, 5.2, 5.3, 8.1, 8.2_

  - [ ]\* 9.2 Write property test for webhook responses
    - **Property 6: Webhook Response Consistency**
    - **Validates: Requirements 5.3, 5.4, 8.4**

  - [ ]\* 9.3 Write unit tests for webhook security
    - Test valid secret authentication
    - Test invalid/missing secret rejection
    - Test proper HTTP status codes
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 10. Implement error handling and logging
  - [ ] 10.1 Add comprehensive error handling
    - Implement error aggregation in HabitManager
    - Add structured logging for debugging
    - Ensure graceful degradation on partial failures
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]\* 10.2 Write property test for error robustness
    - **Property 5: Error Handling Robustness**
    - **Validates: Requirements 6.1, 6.3**

- [ ] 11. Create application entry point
  - [ ] 11.1 Implement main.ts application startup
    - Load environment variables and validate configuration
    - Initialize HabitManager and WebhookServer
    - Add graceful shutdown handling
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]\* 11.2 Write integration tests for full application
    - Test complete webhook-to-notion flow
    - Test application startup and shutdown
    - Test environment variable validation
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 12. Final checkpoint and validation
  - [ ] 12.1 Run complete test suite
    - Execute all unit tests and property tests
    - Verify test coverage meets requirements
    - Fix any failing tests or integration issues

  - [ ] 12.2 Create example configuration files
    - Create sample habits.json with example habits
    - Create .env.example with all required environment variables
    - Add basic documentation for setup and usage

  - [ ] 12.3 Final integration testing
    - Test with real Notion API (using test database)
    - Verify webhook security works correctly
    - Test error scenarios and recovery

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end functionality
- Security validation is implemented throughout the webhook handling
- Error handling ensures partial failures don't break the entire system
