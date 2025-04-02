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
# Initialize variables
CSV_FILE_PATH=""
SHOW_SENSITIVE=false
WRITE_JSON=false

# Display usage
function print_usage {
  echo "Usage: $0 <path_to_csv_file> [options]"
  echo "Example: $0 gen_test.csv --write-json"
  echo ""
  echo "Options:"
  echo "  --show-sensitive    Shows sensitive data (TIN/SSN) in the output"
  echo "  --write-json        Writes JSON files (otherwise only CSV files are created)"
}

# Handle arguments
if [ $# -eq 0 ]; then
  echo "Error: No CSV file specified"
  print_usage
  exit 1
fi

# Parse arguments
for arg in "$@"; do
  if [ "$arg" == "--show-sensitive" ]; then
    SHOW_SENSITIVE=true
  elif [ "$arg" == "--write-json" ]; then
    WRITE_JSON=true
  elif [ "${arg:0:2}" != "--" ]; then
    CSV_FILE_PATH="$arg"
  fi
done

# Ensure CSV file path is provided
if [ -z "$CSV_FILE_PATH" ]; then
  echo "Error: No CSV file specified"
  print_usage
  exit 1
fi

# Handle relative or absolute path for the CSV file
if [[ "$CSV_FILE_PATH" == /* ]]; then
  # Absolute path provided
  FULL_CSV_PATH="$CSV_FILE_PATH"
else
  # Relative path provided, make it absolute
  FULL_CSV_PATH="$SCRIPT_DIR/$CSV_FILE_PATH"
fi

# Ensure the Node script exists
if [ ! -f "$NODE_SCRIPT" ]; then
  echo "Error: Node script not found at '$NODE_SCRIPT'"
  echo "Make sure 'bundle.cjs' is in the same directory as this script."
  exit 1
fi

# Ensure the CSV file exists
if [ ! -f "$FULL_CSV_PATH" ]; then
  echo "Error: CSV file not found at '$FULL_CSV_PATH'"
  exit 1
fi

# --- Execute Node Script ---
echo "Running node $NODE_SCRIPT with CSV file: $FULL_CSV_PATH"
if [ "$SHOW_SENSITIVE" = true ]; then
  echo "Note: Sensitive data (TIN, SSN) will be visible in the output"
else
  echo "Note: Sensitive data (TIN, SSN) will be redacted (use --show-sensitive to show)"
fi

if [ "$WRITE_JSON" = true ]; then
  echo "Note: JSON files will be written to the _output directory"
else
  echo "Note: JSON files will not be written (use --write-json to write JSON files)"
fi

# Create a temporary script to require and call the module function
TMP_SCRIPT=$(mktemp)
cat > "$TMP_SCRIPT" << EOL
// Temporary script to call the module function
const runExporters = require('${NODE_SCRIPT}').default;
const csvPath = '${FULL_CSV_PATH}';
const showSensitive = ${SHOW_SENSITIVE};
const writeJson = ${WRITE_JSON};

// Ensure output directory exists
const fs = require('fs');
const path = require('path');
const outputDir = path.join(process.cwd(), "_output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Running compliance report with file:', csvPath);
runExporters(csvPath, showSensitive, writeJson).catch(err => {
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
