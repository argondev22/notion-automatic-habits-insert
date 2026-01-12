# Habit Configuration Guide

This directory contains the configuration files for the Template-Based Habit Scheduler.

## habits.json

The `habits.json` file defines all the habits that should be automatically created in your Notion Timebox database. Each habit configuration includes scheduling, timing, and template information.

### Configuration Structure

Each habit in the array has the following properties:

```json
{
  "name": "Habit Name",
  "templateId": "notion-template-id",
  "frequency": ["monday", "tuesday", "wednesday"],
  "startTime": "07:00",
  "endTime": "08:00",
  "enabled": true
}
```

### Property Descriptions

#### `name` (string, required)

- A descriptive name for the habit
- Used for logging and identification
- Example: `"Morning Exercise"`, `"Weekly Review"`

#### `templateId` (string, required)

- The Notion template ID to use when creating this habit
- Get this from your Notion database templates
- Each habit should have its own template in the Timebox database
- Example: `"template-123"`, `"template-abc"`

#### `frequency` (array of strings, required)

- Specifies which days of the week this habit should be created
- Use lowercase day names: `"monday"`, `"tuesday"`, `"wednesday"`, `"thursday"`, `"friday"`, `"saturday"`, `"sunday"`
- Must contain at least one valid day
- Common patterns:
  - **Daily**: `["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]`
  - **Weekdays**: `["monday", "tuesday", "wednesday", "thursday", "friday"]`
  - **Weekends**: `["saturday", "sunday"]`
  - **Custom**: Any specific combination like `["monday", "wednesday", "friday"]`

#### `startTime` (string, required)

- The start time for the habit in 24-hour format (HH:MM)
- Used to set the EXPECTED property start time in Notion
- Times are interpreted in the timezone specified in your `.env` file
- Example: `"07:00"`, `"18:30"`

#### `endTime` (string, required)

- The end time for the habit in 24-hour format (HH:MM)
- Used to set the EXPECTED property end time in Notion
- Must be after the startTime
- Example: `"08:00"`, `"19:30"`

#### `enabled` (boolean, required)

- Set to `true` to activate the habit
- Set to `false` to temporarily disable without deleting the configuration
- Useful for seasonal habits or temporary breaks
- Disabled habits are completely skipped during processing

### Example Configurations

#### Daily Habit

```json
{
  "name": "Morning Exercise",
  "templateId": "template-123",
  "frequency": [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ],
  "startTime": "07:00",
  "endTime": "08:00",
  "enabled": true
}
```

#### Weekday-Only Habit

```json
{
  "name": "Weekday Standup",
  "templateId": "template-456",
  "frequency": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "startTime": "09:00",
  "endTime": "09:30",
  "enabled": true
}
```

#### Weekly Habit

```json
{
  "name": "Weekly Review",
  "templateId": "template-789",
  "frequency": ["sunday"],
  "startTime": "19:00",
  "endTime": "20:00",
  "enabled": true
}
```

#### Custom Schedule Habit

```json
{
  "name": "Gym Workout",
  "templateId": "template-abc",
  "frequency": ["monday", "wednesday", "friday"],
  "startTime": "18:00",
  "endTime": "19:30",
  "enabled": true
}
```

#### Temporarily Disabled Habit

```json
{
  "name": "Evening Meditation",
  "templateId": "template-ghi",
  "frequency": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "startTime": "21:00",
  "endTime": "21:30",
  "enabled": false
}
```

### Template Requirements

1. **Create Templates in Notion**: Each habit should have its own template in your Timebox database
2. **Template Content**: Templates should be pre-configured with the content you want for each habit
3. **Automatic Properties**: The system will automatically set:
   - `TAG` property to `"HABIT"`
   - `EXPECTED` property to the calculated time range
4. **Preserved Properties**: All other properties from the template will be preserved

### Validation Rules

- All fields are required
- `templateId` must exist in your Notion database
- `frequency` array must contain at least one valid day name
- `startTime` must be before `endTime`
- Times must be in HH:MM format (24-hour)
- Day names must be lowercase and spelled correctly

### Getting Template IDs

To find your Notion template IDs:

1. Go to your Timebox database in Notion
2. Click on the "New" button dropdown
3. Find your habit templates in the list
4. The template ID can be found in the URL or through the Notion API

### Troubleshooting

- **Invalid JSON**: Ensure the file is valid JSON (no comments, proper quotes, commas)
- **Template Not Found**: Verify the templateId exists in your Notion database
- **Time Format**: Use 24-hour format (07:00, not 7:00 AM)
- **Day Names**: Use lowercase, full day names (monday, not Mon or MONDAY)
- **Frequency Empty**: Each habit must have at least one day in the frequency array
