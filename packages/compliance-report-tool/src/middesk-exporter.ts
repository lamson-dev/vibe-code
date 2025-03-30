import axios from "axios";
import dotenv from "dotenv";
import { format, parseISO } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format as formatDate } from "date-fns";
import fs from "fs";
import path from "path";

dotenv.config();

const MIDDESK_API_KEY = process.env.MIDDESK_API_KEY;
const MIDDESK_ENV = process.env.MIDDESK_ENV || "sandbox";
const MIDDESK_API_BASE_URL =
  MIDDESK_ENV === "production"
    ? "https://api.middesk.com/v1"
    : "https://api-sandbox.middesk.com/v1";

const TIME_ZONE = "America/New_York"; // US Eastern Time

interface MiddeskBusiness {
  id: string;
  name: string;
  created_at: string;
  // Add other fields as needed
}

interface MiddeskResponse {
  object: string;
  data: MiddeskBusiness[];
  has_more: boolean;
  total_count: number;
}

async function getBusinesses(
  startDate: Date,
  endDate: Date
): Promise<MiddeskBusiness[]> {
  const businesses: MiddeskBusiness[] = [];
  let hasMore = true;
  let page = 1;
  const PER_PAGE = 30; // Maximum allowed by Middesk API

  while (hasMore) {
    try {
      console.log(`Fetching page ${page}...`);
      const response = await axios.get(`${MIDDESK_API_BASE_URL}/businesses`, {
        headers: {
          Authorization: `Bearer ${MIDDESK_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        params: {
          page,
          per_page: PER_PAGE,
          start_date: formatDate(
            toZonedTime(startDate, TIME_ZONE),
            "yyyy-MM-dd"
          ),
          end_date: formatDate(toZonedTime(endDate, TIME_ZONE), "yyyy-MM-dd"),
        },
      });

      const apiResponse = response.data as MiddeskResponse;

      // Check if we have data in the response
      if (!apiResponse || !Array.isArray(apiResponse.data)) {
        console.log("No more businesses to fetch", apiResponse);
        hasMore = false;
        break;
      }

      // No need to filter by date since we're using API parameters
      businesses.push(...apiResponse.data);

      // Check if there are more pages based on the API response
      hasMore = apiResponse.has_more;
      page++;

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(
        "Error fetching businesses:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  return businesses;
}

async function getBusinessDetails(businessId: string): Promise<any> {
  try {
    const response = await axios.get(
      `${MIDDESK_API_BASE_URL}/businesses/${businessId}`,
      {
        headers: {
          Authorization: `Bearer ${MIDDESK_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(
      `Error fetching business details for ID ${businessId}:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

async function exportMiddeskBusinesses(startDate: Date, endDate: Date) {
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
      return;
    }

    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(
      outputDir,
      `middesk-businesses-${format(endDate, "yyyy-QQ")}.json`
    );

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

    fs.writeFileSync(outputFile, JSON.stringify(detailedBusinesses, null, 2));
    console.log(
      `\nExported ${detailedBusinesses.length} businesses to ${outputFile}`
    );
  } catch (error: any) {
    console.error(
      "Error exporting businesses:",
      error.response?.data || error.message
    );
    process.exit(1);
  }
}

// Example usage:
// For Q1 2025 (Jan 1, 2025 to Mar 31, 2025)
// Using US Eastern Time (ET)
const startDate = fromZonedTime("2025-01-01 00:00:00", TIME_ZONE);
const endDate = fromZonedTime("2025-03-31 23:59:59", TIME_ZONE);

console.log("Using date range:", {
  start: formatDate(toZonedTime(startDate, TIME_ZONE), "yyyy-MM-dd HH:mm:ss"),
  end: formatDate(toZonedTime(endDate, TIME_ZONE), "yyyy-MM-dd HH:mm:ss"),
  timeZone: TIME_ZONE,
});

exportMiddeskBusinesses(startDate, endDate);
