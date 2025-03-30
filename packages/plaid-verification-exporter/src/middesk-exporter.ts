import axios from "axios";
import dotenv from "dotenv";
import { format, parseISO } from "date-fns";
import fs from "fs";
import path from "path";

dotenv.config();

const MIDDESK_API_KEY = process.env.MIDDESK_API_KEY;
const MIDDESK_ENV = process.env.MIDDESK_ENV || "sandbox";
const MIDDESK_API_BASE_URL =
  MIDDESK_ENV === "production"
    ? "https://api.middesk.com/v1"
    : "https://api-sandbox.middesk.com/v1";

interface MiddeskBusiness {
  id: string;
  name: string;
  created_at: string;
  // Add other fields as needed
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
        },
      });

      // Check if we have data in the response
      if (
        !response.data ||
        response.data.object !== "list" ||
        !Array.isArray(response.data.data)
      ) {
        console.log("No more businesses to fetch", response.data);
        hasMore = false;
        break;
      }

      // Filter businesses by date range
      const filteredBusinesses = response.data.data.filter(
        (business: MiddeskBusiness) => {
          const businessDate = parseISO(business.created_at);
          return businessDate >= startDate && businessDate <= endDate;
        }
      );

      businesses.push(...filteredBusinesses);

      // If we got less than PER_PAGE items, we've reached the end
      hasMore = response.data.length === PER_PAGE;
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
      `Date range: ${format(startDate, "yyyy-MM-dd")} to ${format(
        endDate,
        "yyyy-MM-dd"
      )}`
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
      `middesk-businesses-${format(startDate, "yyyy-QQ")}.json`
    );

    // Fetch detailed information for each business
    console.log("\nFetching detailed information for each business...");
    const detailedBusinesses = await Promise.all(
      businesses.map(async (business, index) => {
        console.log(
          `Processing business ${index + 1}/${businesses.length}: ${
            business.name
          }`
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
const startDate = new Date("2025-01-01");
const endDate = new Date("2025-03-31");

exportMiddeskBusinesses(startDate, endDate);
