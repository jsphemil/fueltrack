# Project: Bike Mileage Tracker

## Objective
Build a simple, reliable mileage tracking app that tracks fuel, distance, and expenses accurately.

## Core Principles
- Keep logic simple and easy to understand
- Avoid unnecessary libraries
- Prioritize data accuracy over UI complexity

## Development Rules
- Always check existing code before adding new code
- Make minimal changes instead of rewriting
- Ensure all calculations are correct and validated

## Workflow
1. Understand the requirement
2. Review existing implementation
3. Identify minimal change required
4. Implement safely
5. Validate edge cases

## Validation Rules
- No negative values for fuel, distance, or cost
- All required inputs must be present
- Calculations must be consistent across app

## File Usage Rules

- Always read relevant project files before making changes
- Do NOT assume code structure without checking files
- Prefer modifying existing code instead of creating new files
- Ensure consistency with existing project patterns

## Skills

Skills are stored in /skills directory.
Always refer to the relevant skill before solving a problem.

### UI Issues
Use: Debug UI Issue
Location: /skills/debug-ui.md

### API and Data Logic
Use: API and Business Logic Handling
Location: /skills/api-logic.md

### Data Validation
Use: Data Validation and Integrity
Location: /skills/validation.md

## Decision Rules

- If the issue is related to UI rendering, layout, or visual behavior → use UI Issues skill
- If the issue involves calculations, data processing, validation, or API behavior → use API and Data Logic skill

- ALWAYS validate data before applying any business logic
- ALWAYS use Data Validation skill when handling inputs or calculations

- If both UI and data are involved → solve data logic first, then UI
- Prefer minimal changes and avoid rewriting existing working code

## Full-Stack Requirements

For any feature or bug fix, always consider:

- Frontend changes (UI, forms, display)
- Backend/API changes (data handling, calculations)
- Data validation (input correctness, constraints)
- Data consistency (ensure no mismatch across app)

Do NOT implement partial solutions that fix only one layer.

Ensure all related layers are aligned before completing the task.


## Roadmap Rules

- Always refer to ROADMAP.md before starting any feature or change

- Only pick tasks from the "Planned" section unless explicitly instructed otherwise

- When starting a task:
  - Move it from Planned → In Progress

- When completed:
  - Move it from In Progress → Completed

- Do NOT duplicate tasks that already exist in the roadmap

- If a new requirement is discovered:
  - Add it under the appropriate section in Planned before implementation

- Maintain the existing roadmap structure and grouping (do not reorganize unnecessarily)


## Implementation Checklist

Before completing any task, ensure:

- Frontend is updated (UI reflects the change correctly)
- Backend/API logic is implemented or updated
- Data validation is applied consistently
- No existing functionality is broken
- Edge cases are handled (empty inputs, invalid values)
- Changes are consistent with existing project patterns

Do NOT mark a task as complete unless all the above are satisfied.

## Scope Control

- Focus only on files directly related to the task
- Do NOT scan or modify unrelated parts of the codebase
- Prefer small, targeted changes over broad refactoring
- Avoid rewriting existing working logic unless necessary
- Keep responses concise and implementation-focused
