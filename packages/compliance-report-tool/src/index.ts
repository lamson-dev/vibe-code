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

// Load environment variables
config();

const TIME_ZONE = "America/Los_Angeles"; // US Pacific Time

// Get CSV file name from command line arguments
const csvFileNameArg = process.argv[2];

if (!csvFileNameArg) {
  console.error("Error: Please provide the path to the CSV file as a command line argument.");
  console.error("Usage: npm run report -- <path_to_csv_file>");
  process.exit(1);
}

const CSV_FILE_NAME = csvFileNameArg;

async function runExporters() {
  try {
    // Set date range for Q1 2025
    const startDateStr = "2025-01-01";
    const endDateStr = "2025-03-31";

    console.log("Starting compliance data export process...");
    console.log(`Date range: ${startDateStr} to ${endDateStr}`);

    // Read original CSV records
    console.log("\n=== Reading Original CSV ===");
    const originalRecords = await readOriginalCsv(CSV_FILE_NAME);
    console.log(`Found ${originalRecords.length} records`);

    // Get customer references for Plaid export
    const customerRefs = await readCustomerReferences(CSV_FILE_NAME);

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
      "output",
      `OFAC Results - ${yearQuarter}.csv`
    );
    await writeOfacCsv(originalRecords, plaidResults, ofacOutputPath);

    // 3. Write initial CIP CSV (from Plaid results)
    console.log("\n=== Writing Initial CIP CSV ===");
    const cipOutputPath = path.join(
      process.cwd(),
      "output",
      `CIP Results - ${yearQuarter}.csv`
    );
    await writeCipCsv(plaidResults, [], cipOutputPath, endDate);

    // 4. Run Middesk exporter
    console.log("\n=== Running Middesk Business Export ===");
    const startDate = fromZonedTime(`${startDateStr} 00:00:00`, TIME_ZONE);
    const middeskResults = await exportMiddeskBusinesses(startDate, endDate);

    // Write Middesk results to JSON
    console.log("\n=== Writing Middesk Results ===");
    await writeMiddeskResultsJson(middeskResults, endDate);

    // 5. Update CIP CSV with business data
    console.log("\n=== Updating CIP CSV with Business Data ===");
    await writeCipCsv(plaidResults, middeskResults, cipOutputPath, endDate);

    // console.log("\nAll exports completed successfully!");
  } catch (error) {
    console.error("Export process failed:", error);
    process.exit(1);
  }
}

// Run both exporters
runExporters();
