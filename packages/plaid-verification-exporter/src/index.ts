import { config } from "dotenv";
import { format } from "date-fns";
import fs from "fs/promises";
import path from "path";
import { validateEnv } from "./utils/env.js";
import { initializePlaidClient } from "./services/plaid.js";
import { getVerificationResults } from "./services/verification.js";
import {
  readOriginalCsv,
  writeAugmentedCsv,
  writeVerificationResultsJson,
} from "./services/csv.js";

// Load environment variables
config();

async function exportVerificationResults(): Promise<void> {
  try {
    // Validate environment variables
    const env = validateEnv();

    // Initialize Plaid client
    const plaidClient = initializePlaidClient(env);

    // Set date range for Q1 2025
    const startDate = "2025-01-01";
    const endDate = "2025-03-31";

    console.log(
      `Fetching verification results from ${startDate} to ${endDate}...`
    );

    // Read original CSV
    console.log("Reading original CSV file...");
    const originalRecords = await readOriginalCsv();

    const customerRefs = originalRecords.map(
      (record) => record.customer_reference
    );
    // Get verification results
    const results = await getVerificationResults(
      plaidClient,
      startDate,
      endDate,
      customerRefs
    );

    // Write augmented CSV
    console.log("Writing augmented CSV with verification results...");
    await writeAugmentedCsv(originalRecords, results);

    // Write results to JSON file
    console.log("Writing results to JSON file...");
    await writeVerificationResultsJson(results);

    console.log("Export completed successfully");
  } catch (error) {
    console.error("Failed to export verification results:", error);
    process.exit(1);
  }
}

// Run the export
exportVerificationResults();
