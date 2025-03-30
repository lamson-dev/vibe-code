import { validateEnv } from "./utils/env.js";
import {
  initializePlaidClient,
  getVerificationResults,
} from "./services/plaid.js";
import {
  readOriginalCsv,
  writeAugmentedCsv,
  writeVerificationResultsJson,
} from "./plaid-process-csv.js";
import { VerificationResult } from "./types/index.js";
import { format } from "date-fns";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { writeResultsJson } from "./utils.js";

export async function augmentCsvWithVerificationResults(
  results: VerificationResult[],
  csvFileName: string
): Promise<void> {
  try {
    // Read original CSV for augmentation
    console.log("Reading original CSV file for augmentation...");
    const originalRecords = await readOriginalCsv(csvFileName);

    // Write augmented CSV
    console.log("Writing augmented CSV with verification results...");
    await writeAugmentedCsv(originalRecords, results);

    // Write results to JSON file
    console.log("Writing results to JSON file...");
    await writeVerificationResultsJson(results);
  } catch (error) {
    console.error("Failed to augment CSV with verification results:", error);
    throw error;
  }
}

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
  endDate: Date
): Promise<void> {
  return writeResultsJson(results, endDate, "plaid-verification-results");
}
