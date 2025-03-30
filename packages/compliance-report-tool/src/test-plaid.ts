import { Configuration, PlaidApi, PlaidEnvironments, CountryCode } from "plaid";
import { config } from "dotenv";

// Load environment variables
config();

async function testPlaidConnection() {
  try {
    // Log environment variable presence (not values)
    console.log("Environment variables loaded:");
    console.log(
      "PLAID_CLIENT_ID:",
      process.env.PLAID_CLIENT_ID ? "Present" : "Missing"
    );
    console.log(
      "PLAID_SECRET:",
      process.env.PLAID_SECRET ? "Present" : "Missing"
    );
    console.log("PLAID_ENV:", process.env.PLAID_ENV || "Not set");

    // Initialize Plaid client
    const configuration = new Configuration({
      basePath:
        PlaidEnvironments[
          (process.env.PLAID_ENV as keyof typeof PlaidEnvironments) || "sandbox"
        ],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID || "",
          "PLAID-SECRET": process.env.PLAID_SECRET || "",
        },
      },
    });

    const plaidClient = new PlaidApi(configuration);

    // Make a simple API call to get institutions
    const response = await plaidClient.institutionsGet({
      count: 1,
      offset: 0,
      country_codes: [CountryCode.Us],
      options: {
        include_optional_metadata: true,
      },
    });

    console.log("Successfully connected to Plaid API!");
    console.log("Sample institution:", response.data.institutions[0]);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error connecting to Plaid:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        response: (error as any).response?.data,
      });
    } else {
      console.error("Unknown error:", error);
    }
  }
}

// Run the test
testPlaidConnection();
