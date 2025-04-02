#!/bin/bash

# Simple script to run the compliance report tool
# with environment variables hardcoded directly in the script.

# --- Configuration ---
# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Path to the Node.js script in the same directory
NODE_SCRIPT="$SCRIPT_DIR/bundle.cjs"

# --- Environment Variables (Hardcoded) ---
# !!! REPLACE THESE PLACEHOLDERS WITH YOUR ACTUAL CREDENTIALS !!!
export PLAID_CLIENT_ID=""
export PLAID_SECRET=""
export PLAID_ENV="sandbox" # Or "development" or "production"
export MIDDESK_API_KEY=""
export MIDDESK_ENV="sandbox"
# Add any other required environment variables here
# export ANOTHER_VAR="some_value"

echo "Using hardcoded environment variables."

# --- Argument Handling ---
if [ -z "$1" ]; then
  echo "Usage: $0 <path_to_csv_file>"
  echo "Example: $0 gen_test.csv"
  exit 1
fi

# Handle relative or absolute path for the CSV file
if [[ "$1" == /* ]]; then
  # Absolute path provided
  CSV_FILE_PATH="$1"
else
  # Relative path provided, make it absolute
  CSV_FILE_PATH="$SCRIPT_DIR/$1"
fi

# Ensure the Node script exists
if [ ! -f "$NODE_SCRIPT" ]; then
  echo "Error: Node script not found at '$NODE_SCRIPT'"
  echo "Make sure 'bundle.cjs' is in the same directory as this script."
  exit 1
fi

# Ensure the CSV file exists
if [ ! -f "$CSV_FILE_PATH" ]; then
  echo "Error: CSV file not found at '$CSV_FILE_PATH'"
  exit 1
fi

# --- Execute Node Script ---
echo "Running node $NODE_SCRIPT with CSV file: $CSV_FILE_PATH"

# Create a temporary script to require and call the module function
TMP_SCRIPT=$(mktemp)
cat > "$TMP_SCRIPT" << EOL
// Temporary script to call the module function
const runExporters = require('${NODE_SCRIPT}').default;
const csvPath = '${CSV_FILE_PATH}';

// Ensure output directory exists
const fs = require('fs');
const path = require('path');
const outputDir = path.join(process.cwd(), "_output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Running compliance report with file:', csvPath);
runExporters(csvPath).catch(err => {
  console.error('Error running compliance report:', err);
  process.exit(1);
});
EOL

# Execute the temporary script
node "$TMP_SCRIPT"
EXIT_CODE=$?

# Clean up the temporary script
rm "$TMP_SCRIPT"

exit $EXIT_CODE
