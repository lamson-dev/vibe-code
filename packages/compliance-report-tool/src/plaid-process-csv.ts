import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import {
  CsvRecord,
  VerificationResult,
  AugmentedCsvRecord,
  MiddeskBusiness,
} from "./types/index.js";
import { formatYearQuarter, calculateLevenshteinDistance } from "./utils.js";
import { config } from "dotenv";

/**
 * Redacts sensitive information
 * @param value The value to potentially redact
 * @param showSensitiveData Whether to show sensitive data
 * @returns The original value or a redacted version
 */
function redactSensitiveInfo(value: string, showSensitiveData: boolean): string {
  if (!value || showSensitiveData) {
    return value;
  }

  // For SSN or EIN (9 digits typically)
  if (/^\d{9}$/.test(value.replace(/[^0-9]/g, ''))) {
    return 'XXX-XX-' + value.replace(/[^0-9]/g, '').slice(-4);
  }

  // For partial redaction of other values
  if (value.length > 4) {
    return 'XXXX' + value.slice(-4);
  }

  // For short values, just redact completely
  return 'REDACTED';
}

export async function readCustomerReferences(
  csvFileName: string
): Promise<string[]> {
  try {
    const csvPath = path.resolve(process.cwd(), csvFileName);
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
    const csvPath = path.resolve(process.cwd(), csvFileName);
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

export async function writeOfacCsv(
  originalRecords: CsvRecord[],
  verificationResults: VerificationResult[],
  outputPath: string
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

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

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

    await fs.writeFile(outputPath, csvContent);
    console.log(`Successfully wrote OFAC CSV to ${outputPath}`);
  } catch (error) {
    console.error("Error writing OFAC CSV:", error);
    throw error;
  }
}

export async function writeCipCsv(
  verificationResults: VerificationResult[],
  middeskResults: MiddeskBusiness[],
  outputPath: string,
  endDate: Date,
  showSensitiveData: boolean = false
): Promise<void> {
  try {
    // Create a map of Middesk results by external_id
    const middeskMap = new Map(
      middeskResults.map((result) => [
        result.external_id, // Use external_id as the key
        result,
      ])
    );

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Convert records to CSV format
    const headers = [
      "#",
      "Business Name",
      "Business Physical Address",
      "EIN",
      "First Name",
      "Last Name",
      "Physical Address",
      "DOB",
      "SSN",
      "Beneficial Owner",
      "Controlling Party",
      "Onboard Date",
      "created_at",
      "status",
    ];

    const yearQuarter = formatYearQuarter(endDate.toISOString());

    const csvRows = verificationResults.map((result, index) => {
      const user = result.user;
      const name = user.name;
      const address = user.address;
      const customerReference = result.client_user_id;

      let middeskResult: MiddeskBusiness | undefined = undefined;

      // Attempt 1: Check if plaidClientId includes the externalId
      if (customerReference) {
        for (const [externalId, business] of middeskMap.entries()) {
          // Ensure externalId is not null/empty before checking includes
          if (externalId && customerReference.includes(externalId)) {
            middeskResult = business;
            break; // Found a match via includes()
          }
        }
      }

      // Attempt 2: Fallback to Levenshtein distance if no includes() match
      if (!middeskResult && customerReference) {
        let bestMatch: MiddeskBusiness | undefined = undefined;
        let minDistance = Infinity;
        const MAX_ALLOWED_DISTANCE = 2; // Allow up to 2 edits (adjust if needed)

        for (const [externalId, business] of middeskMap.entries()) {
          const distance = calculateLevenshteinDistance(customerReference ?? "", business.name ?? "");
          if (distance < minDistance && distance <= MAX_ALLOWED_DISTANCE) {
            minDistance = distance;
            bestMatch = business;
          }
        }
        // Only assign if a reasonably close match was found
        if (bestMatch) {
          middeskResult = bestMatch;
        }
      }

      // Format physical address
      const physicalAddress = [
        address?.street,
        address?.street2,
        address?.city,
        address?.region,
        address?.postal_code,
        address?.country,
      ]
        .filter(Boolean)
        .join(" ");

      // Find the address task with a successful match
      const addressTask = middeskResult?.review.tasks.find(
        (task) =>
          task.category === "address" &&
          task.key === "address_verification" &&
          task.status === "success"
      );

      // Get the physical address from the task's sources if available
      const bizPhysicalAddress =
        addressTask?.sources?.[0]?.metadata?.full_address || "N/A";

      // Redact sensitive data if needed
      const tinValue = middeskResult?.tin?.tin || "";
      const ssnValue = user.id_number?.value || "";
      
      const redactedTin = redactSensitiveInfo(tinValue, showSensitiveData);
      const redactedSsn = redactSensitiveInfo(ssnValue, showSensitiveData);

      return [
        (index + 1).toString(),
        middeskResult?.name || "",
        bizPhysicalAddress || "",
        redactedTin,
        name?.given_name || "",
        name?.family_name || "",
        physicalAddress,
        user.date_of_birth || "",
        redactedSsn,
        "",
        "",
        yearQuarter,
        middeskResult?.created_at || "",
        middeskResult?.status || "",
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    await fs.writeFile(outputPath, csvContent);
    console.log(`Successfully wrote CIP CSV to ${outputPath}`);
    
    if (!showSensitiveData) {
      console.log("Note: Sensitive data (TIN, SSN) has been redacted. Use --show-sensitive flag to see full data.");
    } else {
      console.log("Warning: Full sensitive data (TIN, SSN) is visible in the output file.");
    }
  } catch (error) {
    console.error("Error writing CIP CSV:", error);
    throw error;
  }
}

/**
 * This function is exported to be called explicitly and only runs
 * when this module is executed directly (not when bundled)
 */
export async function runPlaidProcessCLI() {
  try {
    // Get CSV file name from command line arguments
    const csvFileNameArg = process.argv[2];
    
    if (!csvFileNameArg) {
      console.error("Error: Please provide the path to the CSV file as a command line argument.");
      console.error("Usage: tsx src/plaid-process-csv.ts <path_to_csv_file> [--show-sensitive]");
      process.exit(1);
    }
    
    // Check if --show-sensitive flag is present
    const showSensitiveData = process.argv.includes('--show-sensitive');
    
    const endDate = new Date("2025-03-31");
    const yearQuarter = formatYearQuarter(endDate.toISOString());

    console.log("Starting Plaid CSV processing...");
    console.log(`Processing file: ${csvFileNameArg}`);
    console.log(`Sensitive data will be ${showSensitiveData ? 'visible' : 'redacted'}`);

    // Read original CSV
    console.log("\n=== Reading Original CSV ===");
    const originalRecords = await readOriginalCsv(csvFileNameArg);
    console.log(`Found ${originalRecords.length} records`);

    // Read verification results
    console.log("\n=== Reading Verification Results ===");
    const verificationResultsPath = path.join(
      process.cwd(),
      "_output",
      `plaid-verification-results-${formatYearQuarter(endDate.toISOString())}.json`
    );
    const verificationResultsContent = await fs.readFile(
      verificationResultsPath,
      "utf-8"
    );
    const verificationResults = JSON.parse(verificationResultsContent);
    console.log(`Found ${verificationResults.length} verification results`);

    // Read Middesk results
    console.log("\n=== Reading Middesk Results ===");
    const middeskResultsPath = path.join(
      process.cwd(),
      "_output",
      `middesk-businesses-${formatYearQuarter(endDate.toISOString())}.json`
    );
    const middeskResultsContent = await fs.readFile(
      middeskResultsPath,
      "utf-8"
    );
    const middeskResults = JSON.parse(middeskResultsContent);
    console.log(`Found ${middeskResults.length} Middesk results`);

    // Write OFAC CSV (from original records)
    console.log("\n=== Writing OFAC CSV ===");
    const ofacOutputPath = path.join(
      process.cwd(),
      "_output",
      `OFAC Results - ${yearQuarter}.csv`
    );
    await writeOfacCsv(originalRecords, verificationResults, ofacOutputPath);

    // Write CIP CSV (from verification results and Middesk data)
    console.log("\n=== Writing CIP CSV ===");
    const cipOutputPath = path.join(
      process.cwd(),
      "_output",
      `CIP Results - ${yearQuarter}.csv`
    );
    await writeCipCsv(verificationResults, middeskResults, cipOutputPath, endDate, showSensitiveData);

    console.log("\nPlaid CSV processing completed successfully!");
  } catch (error) {
    console.error("Plaid CSV processing failed:", error);
    process.exit(1);
  }
}

// Check if this file is being run directly (not as part of a bundle)
// This condition will only be true when the file is executed directly with tsx
if (process.argv[1] && process.argv[1].endsWith('plaid-process-csv.ts')) {
  // Load environment variables
  config();
  
  // Run Plaid process
  runPlaidProcessCLI();
}
