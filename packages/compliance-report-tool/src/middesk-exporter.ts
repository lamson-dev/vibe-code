import { config } from "dotenv";
import { format, parseISO } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getBusinesses, getBusinessDetails } from "./services/middesk.js";
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

/**
 * This function is exported to be called explicitly and only runs
 * when this module is executed directly (not when bundled)
 */
export async function runMiddeskExportCLI() {
  try {
    // Get CSV file name from command line arguments
    const csvFileNameArg = process.argv[2];
    
    if (!csvFileNameArg) {
      console.error("Error: Please provide the path to the CSV file as a command line argument.");
      console.error("Usage: tsx src/middesk-exporter.ts <path_to_csv_file>");
      process.exit(1);
    }
    
    // Set date range for Q1 2025
    const startDateStr = "2025-01-01";
    const endDateStr = "2025-03-31";

    console.log("Starting Middesk business export process...");
    console.log(`Date range: ${startDateStr} to ${endDateStr}`);
    console.log(`Using CSV file: ${csvFileNameArg}`);

    // Run Middesk exporter
    console.log("\n=== Running Middesk Business Export ===");
    const startDate = fromZonedTime(`${startDateStr} 00:00:00`, TIME_ZONE);
    const endDate = fromZonedTime(`${endDateStr} 23:59:59`, TIME_ZONE);
    const middeskResults = await exportMiddeskBusinesses(startDate, endDate);

    // Write Middesk results to JSON
    console.log("\n=== Writing Middesk Results ===");
    await writeMiddeskResultsJson(middeskResults, endDate);

    console.log("\nMiddesk export completed successfully!");
  } catch (error) {
    console.error("Middesk export process failed:", error);
    process.exit(1);
  }
}

// Check if this file is being run directly (not as part of a bundle)
// This condition will only be true when the file is executed directly with tsx
// In the bundle context, this module's filename won't match process.argv[1]
if (process.argv[1] && process.argv[1].endsWith('middesk-exporter.ts')) {
  // Load environment variables
  config();
  
  // Run Middesk export CLI
  runMiddeskExportCLI();
}
