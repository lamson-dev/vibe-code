import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const MIDDESK_API_KEY = process.env.MIDDESK_API_KEY;
const MIDDESK_ENV = process.env.MIDDESK_ENV || "sandbox";
const MIDDESK_API_BASE_URL =
  MIDDESK_ENV === "production"
    ? "https://api.middesk.com/v1"
    : "https://api-sandbox.middesk.com/v1";

async function testMiddeskAccess() {
  try {
    // Test 1: Check if API key is set
    if (!MIDDESK_API_KEY) {
      console.error("❌ Error: MIDDESK_API_KEY is not set in .env file");
      return;
    }
    console.log("✅ API Key is set");
    console.log(`API Key format: ${MIDDESK_API_KEY.substring(0, 8)}...`);
    console.log(`Environment: ${MIDDESK_ENV}`);
    console.log(`API URL: ${MIDDESK_API_BASE_URL}`);

    // Test 2: Try to fetch a single business (using a test ID)
    console.log("\nTesting API access...");
    const response = await axios.get(`${MIDDESK_API_BASE_URL}/businesses`, {
      headers: {
        Authorization: `Bearer ${MIDDESK_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      params: {
        page: 1,
        per_page: 1,
      },
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Don't reject if status is less than 500
      },
    });

    // Test 3: Check response structure
    if (response.data && response.data.data) {
      console.log("✅ Successfully connected to Middesk API");
      console.log("✅ Response structure is valid");

      // Test 4: Display sample data
      if (response.data.data.length > 0) {
        const sampleBusiness = response.data.data[0];
        console.log("\nSample Business Data:");
        console.log("----------------------");
        console.log(`ID: ${sampleBusiness.id}`);
        console.log(`Name: ${sampleBusiness.name}`);
        console.log(`Created At: ${sampleBusiness.created_at}`);
      } else {
        console.log("\nNo businesses found in your account.");
      }

      // Test 5: Display pagination info
      if (response.data.meta) {
        console.log("\nPagination Info:");
        console.log("----------------");
        console.log(`Total Pages: ${response.data.meta.total_pages}`);
        console.log(`Total Records: ${response.data.meta.total_records}`);
        console.log(`Current Page: ${response.data.meta.current_page}`);
      }
    } else if (response.data.errors) {
      console.error("❌ Error: API returned errors");
      console.log(
        "Error details:",
        JSON.stringify(response.data.errors, null, 2)
      );
    } else {
      console.error("❌ Error: Unexpected response structure");
      console.log("Response data:", JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    console.error("\n❌ Error testing Middesk API:");
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status Code: ${error.response.status}`);
      console.error(`Status Text: ${error.response.statusText}`);
      console.error(`Response Headers:`, error.response.headers);
      console.error(
        `Response Data:`,
        JSON.stringify(error.response.data, null, 2)
      );
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received from server");
      console.error("Request details:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error(`Error: ${error.message}`);
    }
  }
}

// Run the tests
console.log("Starting Middesk API Tests...\n");
testMiddeskAccess();
