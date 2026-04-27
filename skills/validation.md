# Skill: Data Validation and Integrity

## When to use
- Handling user input (fuel, distance, cost)
- Before saving data to database
- Before performing calculations
- Fixing inconsistent or incorrect data

## Steps
1. Check all required fields are present
2. Validate data types (numbers, not strings where applicable)
3. Ensure values are within valid range (no negative values)
4. Handle empty or null inputs
5. Standardize data format before processing
6. Return clear error messages for invalid inputs

## Rules
- Do NOT allow invalid data into the system
- Do NOT assume inputs are correct
- Always validate before calculations
- Keep validation logic reusable and consistent
