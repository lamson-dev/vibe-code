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
import { readCustomerReferences } from "./plaid-process-csv.js";
import { augmentCsvWithVerificationResults } from "./plaid-exporter.js";
import { processMiddeskData } from "./middesk-process-csv.js";

// Load environment variables
config();

const TIME_ZONE = "America/New_York"; // US Eastern Time
const CSV_FILE_NAME = "scrrep_8zaPSPdunqVjS4.csv.csv";

async function runExporters() {
  try {
    // Set date range for Q1 2025
    const startDateStr = "2025-01-01";
    const endDateStr = "2025-03-31";

    console.log("Starting compliance data export process...");
    console.log(`Date range: ${startDateStr} to ${endDateStr}`);

    // Get customer references for Plaid export
    const customerRefs = await readCustomerReferences(CSV_FILE_NAME);

    // Run Plaid exporter
    console.log("\n=== Running Plaid Verification Export ===");
    const plaidResults = await exportPlaidVerificationResults(
      startDateStr,
      endDateStr,
      customerRefs
    );

    // Write Plaid results to JSON
    console.log("\n=== Writing Plaid Results ===");
    const endDate = fromZonedTime(`${endDateStr} 23:59:59`, TIME_ZONE);
    await writePlaidResultsJson(plaidResults, endDate);

    // Augment CSV with Plaid results
    console.log("\n=== Augmenting CSV with Plaid Results ===");
    await augmentCsvWithVerificationResults(plaidResults, CSV_FILE_NAME);

    // Run Middesk exporter
    console.log("\n=== Running Middesk Business Export ===");
    const startDate = fromZonedTime(`${startDateStr} 00:00:00`, TIME_ZONE);
    const middeskResults = await exportMiddeskBusinesses(startDate, endDate);

    // Write Middesk results to JSON
    console.log("\n=== Writing Middesk Results ===");
    await writeMiddeskResultsJson(middeskResults, endDate);

    // Process Middesk data to CSV
    console.log("\n=== Processing Middesk Data to CSV ===");
    const outputPath = path.join(
      process.cwd(),
      "output",
      `processed-middesk-data-${format(endDate, "yyyy-MM")}.csv`
    );
    await processMiddeskData(middeskResults, outputPath);

    console.log("\nAll exports completed successfully!");
  } catch (error) {
    console.error("Export process failed:", error);
    process.exit(1);
  }
}

// Run both exporters
runExporters();
