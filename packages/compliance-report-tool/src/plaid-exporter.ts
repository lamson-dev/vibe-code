import { validateEnv } from "./utils/env.js";
import {
  initializePlaidClient,
  getVerificationResults,
} from "./services/plaid.js";
import { readCustomerReferences } from "./plaid-process-csv.js";
import { VerificationResult } from "./types/index.js";
import { writeResultsJson } from "./utils.js";
import { config } from "dotenv";
import { fromZonedTime } from "date-fns-tz";


const TIME_ZONE = "America/New_York"; // US Eastern Time

export async function exportPlaidVerificationResults(
  startDate: string,
  endDate: string,
  customerRefs: string[]
): Promise<VerificationResult[]> {
  try {
    // Validate environment variables
    const env = validateEnv();

    // Initialize Plaid client
    const plaidClient = initializePlaidClient(env);

    console.log(
      `Fetching Plaid verification results from ${startDate} to ${endDate}...`
    );

    // Get verification results
    const results = await getVerificationResults(
      plaidClient,
      startDate,
      endDate,
      customerRefs
    );

    console.log("Plaid export completed successfully");
    return results;
  } catch (error) {
    console.error("Failed to export Plaid verification results:", error);
    throw error;
  }
}

export async function writePlaidResultsJson(
  results: any[],
  endDate: Date,
  showSensitiveData: boolean = false
): Promise<void> {
  return writeResultsJson(results, endDate, "plaid-verification-results", true, showSensitiveData);
}

/**
 * This function is exported to be called explicitly and only runs
 * when this module is executed directly (not when bundled)
 */
export async function runPlaidExportCLI() {
  try {
    // Get CSV file name from command line arguments or use default
    const csvFileNameArg = process.argv[2];
    
    if (!csvFileNameArg) {
      console.error("Error: Please provide the path to the CSV file as a command line argument.");
      console.error("Usage: tsx src/plaid-exporter.ts <path_to_csv_file>");
      process.exit(1);
    }
    
    // Set date range for Q1 2025
    const startDateStr = "2025-01-01";
    const endDateStr = "2025-03-31";

    console.log("Starting Plaid verification export process...");
    console.log(`Date range: ${startDateStr} to ${endDateStr}`);
    console.log(`Using CSV file: ${csvFileNameArg}`);

    // Get customer references for Plaid export
    const customerRefs = await readCustomerReferences(csvFileNameArg);

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

    console.log("\nPlaid export completed successfully!");
  } catch (error) {
    console.error("Plaid export process failed:", error);
    process.exit(1);
  }
}

// Check if this file is being run directly (not as part of a bundle)
// This condition will only be true when the file is executed directly with tsx
if (process.argv[1] && process.argv[1].endsWith('plaid-exporter.ts')) {
  // Load environment variables
  config();
  
  // Run Plaid export
  runPlaidExportCLI();
}
