import { config } from "dotenv";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import fs from "fs/promises";
import path from "path";
import {
  exportPlaidVerificationResults,
  writePlaidResultsJson,
} from "./plaid-exporter.js";
import {
  exportMiddeskBusinesses,
  writeMiddeskResultsJson,
} from "./middesk-exporter.js";
import {
  readCustomerReferences,
  writeOfacCsv,
  writeCipCsv,
  readOriginalCsv,
} from "./plaid-process-csv.js";
import { processMiddeskData } from "./middesk-process-csv.js";
import { formatYearQuarter } from "./utils.js";

// Define the time zone constant
const TIME_ZONE = "America/Los_Angeles"; // US Pacific Time

/**
 * Main CLI function to run when the script is called directly as a standalone executable
 */
export async function mainCLI() {
  // Load environment variables
  config();
  
  // Get CSV file name from command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Error: Please provide the path to the CSV file as a command line argument.");
    console.error("Usage: node bundle.cjs <path_to_csv_file> [--show-sensitive]");
    console.error("Options:");
    console.error("  --show-sensitive    Shows sensitive data (TIN/SSN) in the output");
    process.exit(1);
  }
  
  // Filter out any flags to get the CSV file
  const csvFileNameArg = args.find(arg => !arg.startsWith('--'));
  
  if (!csvFileNameArg) {
    console.error("Error: Please provide the path to the CSV file as a command line argument.");
    console.error("Usage: node bundle.cjs <path_to_csv_file> [--show-sensitive]");
    process.exit(1);
  }
  
  // Check if the show sensitive flag is present
  const showSensitiveData = args.includes('--show-sensitive');

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), "_output");
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (err) {
    // Ignore if directory already exists
  }

  // Run the exporters with the provided CSV file
  await runExporters(csvFileNameArg, showSensitiveData);
}

/**
 * Core function to run the exporters - exported so it can be called
 * explicitly from gen_compliance_report.sh
 */
export async function runExporters(csvFilePath: string, showSensitiveData: boolean = false) {
  try {
    // Set date range for Q1 2025
    const startDateStr = "2025-01-01";
    const endDateStr = "2025-03-31";

    console.log("Starting compliance data export process...");
    console.log(`Date range: ${startDateStr} to ${endDateStr}`);
    console.log(`Using CSV file: ${csvFilePath}`);
    console.log(`Sensitive data will be ${showSensitiveData ? 'visible' : 'redacted'}`);

    // Read original CSV records
    console.log("\n=== Reading Original CSV ===");
    const originalRecords = await readOriginalCsv(csvFilePath);
    console.log(`Found ${originalRecords.length} records`);

    // Get customer references for Plaid export
    const customerRefs = await readCustomerReferences(csvFilePath);

    // 1. Run Plaid exporter
    console.log("\n=== Running Plaid Verification Export ===");
    const plaidResults = await exportPlaidVerificationResults(
      startDateStr,
      endDateStr,
      customerRefs
    );

    const endDate = fromZonedTime(`${endDateStr} 23:59:59`, TIME_ZONE);
    const yearQuarter = formatYearQuarter(endDateStr);

    // Write Plaid results to JSON
    console.log("\n=== Writing Plaid Results ===");
    await writePlaidResultsJson(plaidResults, endDate);

    // 2. Write OFAC CSV (augmented from original records)
    console.log("\n=== Writing OFAC CSV ===");
    const ofacOutputPath = path.join(
      process.cwd(),
      "_output",
      `OFAC Results - ${yearQuarter}.csv`
    );
    await writeOfacCsv(originalRecords, plaidResults, ofacOutputPath);

    // 3. Write initial CIP CSV (from Plaid results)
    console.log("\n=== Writing Initial CIP CSV ===");
    const cipOutputPath = path.join(
      process.cwd(),
      "_output",
      `CIP Results - ${yearQuarter}.csv`
    );
    await writeCipCsv(plaidResults, [], cipOutputPath, endDate, showSensitiveData);

    // 4. Run Middesk exporter
    console.log("\n=== Running Middesk Business Export ===");
    const startDate = fromZonedTime(`${startDateStr} 00:00:00`, TIME_ZONE);
    const middeskResults = await exportMiddeskBusinesses(startDate, endDate);

    // Write Middesk results to JSON
    console.log("\n=== Writing Middesk Results ===");
    await writeMiddeskResultsJson(middeskResults, endDate);

    // 5. Update CIP CSV with business data
    console.log("\n=== Updating CIP CSV with Business Data ===");
    await writeCipCsv(plaidResults, middeskResults, cipOutputPath, endDate, showSensitiveData);

    console.log("\nAll exports completed successfully!");
  } catch (error) {
    console.error("Export process failed:", error);
    process.exit(1);
  }
}

// In the bundled version, this is the entry point
// Only run mainCLI when the script is run directly
if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  mainCLI();
}

// When bundled (bundle.cjs), the main entry point will be the first export
export default runExporters;
