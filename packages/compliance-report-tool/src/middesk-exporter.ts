import { config } from "dotenv";
import { format, parseISO } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";
import { getBusinesses, getBusinessDetails } from "./services/middesk.js";
import { processMiddeskData } from "./middesk-process-csv.js";
import { writeResultsJson } from "./utils.js";

const TIME_ZONE = "America/New_York"; // US Eastern Time

export async function writeMiddeskResultsJson(
  businesses: any[],
  endDate: Date
): Promise<void> {
  return writeResultsJson(businesses, endDate, "middesk-businesses");
}

export async function exportMiddeskBusinesses(
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  try {
    console.log("Fetching businesses...");
    console.log(
      `Date range: ${format(
        toZonedTime(startDate, TIME_ZONE),
        "yyyy-MM-dd"
      )} to ${format(
        toZonedTime(endDate, TIME_ZONE),
        "yyyy-MM-dd"
      )} (${TIME_ZONE})`
    );

    const businesses = await getBusinesses(startDate, endDate);
    console.log(
      `Found ${businesses.length} businesses in the specified date range`
    );

    if (businesses.length === 0) {
      console.log(
        "No businesses found in the specified date range. Exiting..."
      );
      return [];
    }

    // Fetch detailed information for each business
    console.log("\nFetching detailed information for each business...");
    const detailedBusinesses = await Promise.all(
      businesses.map(async (business, index) => {
        const createdAt = toZonedTime(parseISO(business.created_at), TIME_ZONE);
        console.log(
          `Processing business ${index + 1}/${businesses.length}: ${
            business.name
          } (Created: ${format(createdAt, "yyyy-MM-dd")})`
        );
        const details = await getBusinessDetails(business.id);
        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
        return details;
      })
    );

    console.log("Middesk export completed successfully");
    return detailedBusinesses;
  } catch (error: any) {
    console.error(
      "Error exporting businesses:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Run export when this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Load environment variables
  config();

  async function runMiddeskExport() {
    try {
      // Set date range for Q1 2025
      const startDateStr = "2025-01-01";
      const endDateStr = "2025-03-31";

      console.log("Starting Middesk business export process...");
      console.log(`Date range: ${startDateStr} to ${endDateStr}`);

      // Run Middesk exporter
      console.log("\n=== Running Middesk Business Export ===");
      const startDate = fromZonedTime(`${startDateStr} 00:00:00`, TIME_ZONE);
      const endDate = fromZonedTime(`${endDateStr} 23:59:59`, TIME_ZONE);
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

      console.log("\nMiddesk export completed successfully!");
    } catch (error) {
      console.error("Middesk export process failed:", error);
      process.exit(1);
    }
  }

  // Run Middesk export
  runMiddeskExport();
}
