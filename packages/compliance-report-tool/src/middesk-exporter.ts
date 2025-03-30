import { format, parseISO } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format as formatDate } from "date-fns";
import fs from "fs";
import path from "path";
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
      `Date range: ${formatDate(
        toZonedTime(startDate, TIME_ZONE),
        "yyyy-MM-dd"
      )} to ${formatDate(
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
          } (Created: ${formatDate(createdAt, "yyyy-MM-dd")})`
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
