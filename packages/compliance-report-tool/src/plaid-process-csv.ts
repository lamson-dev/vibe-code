import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import {
  CsvRecord,
  VerificationResult,
  AugmentedCsvRecord,
  MiddeskBusiness,
} from "./types/index.js";
import { format } from "date-fns";
import { formatYearQuarter, calculateLevenshteinDistance } from "./utils.js";
import { fileURLToPath } from "url";
import { config } from "dotenv";

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
  endDate: Date
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

      return [
        (index + 1).toString(),
        middeskResult?.name || "",
        bizPhysicalAddress || "",
        middeskResult?.tin?.tin || "",
        name?.given_name || "",
        name?.family_name || "",
        physicalAddress,
        user.date_of_birth || "",
        user.id_number?.value || "",
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
  } catch (error) {
    console.error("Error writing CIP CSV:", error);
    throw error;
  }
}

// Run process when this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Load environment variables
  config();

  async function runPlaidProcess() {
    try {
      const CSV_FILE_NAME = "scrrep_8zaPSPdunqVjS4.csv.csv";
      const endDate = new Date("2025-03-31");
      const yearQuarter = formatYearQuarter(endDate.toISOString());

      console.log("Starting Plaid CSV processing...");
      console.log(`Processing file: ${CSV_FILE_NAME}`);

      // Read original CSV
      console.log("\n=== Reading Original CSV ===");
      const originalRecords = await readOriginalCsv(CSV_FILE_NAME);
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
        `middesk-results-${formatYearQuarter(endDate.toISOString())}.json`
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
      await writeCipCsv(verificationResults, middeskResults, cipOutputPath, endDate);

      console.log("\nPlaid CSV processing completed successfully!");
    } catch (error) {
      console.error("Plaid CSV processing failed:", error);
      process.exit(1);
    }
  }

  // Run Plaid process
  runPlaidProcess();
}
