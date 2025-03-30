import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import {
  CsvRecord,
  VerificationResult,
  AugmentedCsvRecord,
} from "./types/index.js";
import { format } from "date-fns";

export async function readCustomerReferences(
  csvFileName: string
): Promise<string[]> {
  try {
    const csvPath = path.join(process.cwd(), "input", csvFileName);
    const csvContent = await fs.readFile(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as CsvRecord[];

    // Extract unique customer references
    const uniqueRefs = new Set(
      records.map((record) => record.customer_reference)
    );
    const customerRefs = Array.from(uniqueRefs);

    console.log(`Found ${customerRefs.length} unique customer references`);
    return customerRefs;
  } catch (error) {
    console.error("Error reading CSV file:", error);
    throw error;
  }
}

export async function readOriginalCsv(
  csvFileName: string
): Promise<CsvRecord[]> {
  try {
    const csvPath = path.join(process.cwd(), "input", csvFileName);
    const csvContent = await fs.readFile(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as CsvRecord[];

    return records;
  } catch (error) {
    console.error("Error reading original CSV file:", error);
    throw error;
  }
}

export async function writeAugmentedCsv(
  originalRecords: CsvRecord[],
  verificationResults: VerificationResult[]
): Promise<void> {
  try {
    // Create a map of verification results by client_user_id
    const verificationMap = new Map(
      verificationResults.map((result) => [result.client_user_id, result])
    );

    // Augment the original records with verification data
    const augmentedRecords = originalRecords.map((record) => {
      const verificationResult = verificationMap.get(record.customer_reference);
      if (verificationResult?.user?.name) {
        return {
          ...record,
          first_name: verificationResult.user.name?.given_name || "",
          last_name: verificationResult.user.name?.family_name || "",
        };
      }
      return {
        ...record,
        first_name: "",
        last_name: "",
      };
    });

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), "output");
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFile = path.join(
      outputDir,
      `augmented-verification-results-${timestamp}.csv`
    );

    // Convert records to CSV format
    const originalHeaders = Object.keys(originalRecords[0]);
    const hitsIndex = originalHeaders.indexOf("hits");

    // Insert first_name and last_name after status and hits
    const headers = [
      ...originalHeaders.slice(0, hitsIndex + 1),
      "first_name",
      "last_name",
      ...originalHeaders.slice(hitsIndex + 1),
    ];
    
    const csvRows = augmentedRecords.map((record) =>
      headers.map((header) => record[header as keyof AugmentedCsvRecord] || "")
    );

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    await fs.writeFile(outputFile, csvContent);
    console.log(`Successfully wrote augmented CSV to ${outputFile}`);
  } catch (error) {
    console.error("Error writing augmented CSV:", error);
    throw error;
  }
}

export async function writeVerificationResultsJson(
  results: VerificationResult[]
): Promise<void> {
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), "output");
    await fs.mkdir(outputDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = format(new Date(), "yyyy-MM-dd-HH-mm-ss");
    const outputFile = path.join(
      outputDir,
      `verification-results-${timestamp}.json`
    );

    // Write results to JSON file with pretty printing
    await fs.writeFile(outputFile, JSON.stringify(results, null, 2), "utf-8");
    console.log(`Successfully wrote verification results to ${outputFile}`);
  } catch (error) {
    console.error("Error writing verification results to JSON:", error);
    throw error;
  }
}
