import axios from "axios";
import { format as formatDate } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { config } from "dotenv";

config();


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

export async function getBusinesses(
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

export async function getBusinessDetails(businessId: string): Promise<any> {
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
