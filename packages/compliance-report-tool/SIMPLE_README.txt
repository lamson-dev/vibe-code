Compliance Report Tool - Simple Instructions
======================================

This package contains just two files:
1. bundle.cjs - The compiled JavaScript code that runs the compliance tool
2. gen_compliance_report.sh - A shell script to run the tool easily

To use this tool, follow these steps:

1. Make sure you have Node.js v18 or newer installed on your computer
   (You can check this by running "node -v" in your terminal)

2. Open the gen_compliance_report.sh file in a text editor and add your API credentials:
   - Find the section with environment variables
   - Replace the empty quotes with your actual credentials:
     export PLAID_CLIENT_ID="your_plaid_client_id"
     export PLAID_SECRET="your_plaid_secret"
     export PLAID_ENV="sandbox"  # or "development" or "production"
     export MIDDESK_API_KEY="your_middesk_api_key"
     export MIDDESK_ENV="sandbox"

3. Make the script executable:
   Open a terminal in the folder where you saved these files and run:
   chmod +x gen_compliance_report.sh

4. Run the tool with your CSV file:
   ./gen_compliance_report.sh path/to/your/input.csv

   Note: You must provide a CSV file as an argument. The tool does not use a hardcoded
   filename anymore. You can use the provided gen_test.csv file for testing:
   ./gen_compliance_report.sh gen_test.csv

5. Data Privacy Options:
   By default, sensitive data like TINs (EINs) and SSNs are redacted in the output.
   If you need to see this sensitive information, add the --show-sensitive flag:
   
   ./gen_compliance_report.sh gen_test.csv --show-sensitive
   
   WARNING: Using this flag will display full, unredacted sensitive data in the output files.

That's it! No need to install dependencies or run build steps.

Troubleshooting:
- If you see "permission denied", make sure you ran the chmod command
- If you see "command not found", make sure you're in the correct directory
- If Node.js isn't installed, download it from https://nodejs.org/
- If you see API credential errors, make sure you've added your API keys to the script 