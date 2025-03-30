import { validateEnv } from "./utils/env.js";
import { initializePlaidClient } from "./services/plaid.js";
import { getVerificationResults } from "./services/verification.js";
import {
  readOriginalCsv,
  writeAugmentedCsv,
  writeVerificationResultsJson,
} from "./services/csv.js";

export async function exportPlaidVerificationResults(
  startDate: string,
  endDate: string
): Promise<void> {
  try {
    // Validate environment variables
    const env = validateEnv();

    // Initialize Plaid client
    const plaidClient = initializePlaidClient(env);

    console.log(
      `Fetching Plaid verification results from ${startDate} to ${endDate}...`
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

    console.log("Plaid export completed successfully");
  } catch (error) {
    console.error("Failed to export Plaid verification results:", error);
    throw error;
  }
}
