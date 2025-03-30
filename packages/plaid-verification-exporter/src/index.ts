import { config } from "dotenv";
import { format } from "date-fns";
import fs from "fs/promises";
import path from "path";
import { validateEnv } from "./utils/env.js";
import { initializePlaidClient } from "./services/plaid.js";
import { getVerificationResults } from "./services/verification.js";

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

    const results = await getVerificationResults(
      plaidClient,
      startDate,
      endDate
    );

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), "output");
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = format(new Date(), "yyyy-MM-dd-HH-mm-ss");
    const outputFile = path.join(
      outputDir,
      `verification-results-${timestamp}.json`
    );

    // Write results to file
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2));

    console.log(
      `Successfully exported ${results.length} verification results to ${outputFile}`
    );
  } catch (error) {
    console.error("Failed to export verification results:", error);
    process.exit(1);
  }
}

// Run the export
exportVerificationResults();
