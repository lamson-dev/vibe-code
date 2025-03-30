# Plaid Verification Exporter

A Node.js script to export Plaid Identity Verification results for a specified date range.

## Features

- Fetches verification results from Plaid API
- Exports results to JSON files with timestamps
- Configurable date range
- Environment-based configuration

## Prerequisites

- Node.js 16 or higher
- Plaid API credentials

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your Plaid credentials:
   - `PLAID_CLIENT_ID`: Your Plaid client ID
   - `PLAID_SECRET`: Your Plaid secret
   - `PLAID_ENV`: Your Plaid environment (sandbox/development/production)

## Usage

Run the script:
```bash
npm start
```

The script will:
1. Fetch verification results for Q1 2025 (Jan 1 - Mar 31)
2. Create an `output` directory if it doesn't exist
3. Save the results in a JSON file with timestamp

## Output

Results will be saved in the `output` directory with filenames like:
`verification-results-2024-03-14-12-34-56.json`

## Error Handling

- The script will log errors to the console
- Failed API calls will be logged with details
- The script will exit with status code 1 on failure 