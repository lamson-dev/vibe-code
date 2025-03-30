import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { EnvVars, VerificationResult } from "../types/index.js";

const IDENTITY_VERIFICATION_TEMPLATE_ID = "idvtmp_epgCoTSYzF8A4u";

export function initializePlaidClient(env: EnvVars): PlaidApi {
  const configuration = new Configuration({
    basePath: PlaidEnvironments[env.PLAID_ENV],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID,
        "PLAID-SECRET": env.PLAID_SECRET,
      },
    },
  });

  return new PlaidApi(configuration);
}

export async function getVerificationResults(
  plaidClient: PlaidApi,
  startDate: string,
  endDate: string,
  customerRefs: string[]
): Promise<VerificationResult[]> {
  try {
    // Get verification results for each customer
    const allResults: VerificationResult[] = [];
    for (const customerRef of customerRefs) {
      try {
        const response = await plaidClient.identityVerificationList({
          template_id: IDENTITY_VERIFICATION_TEMPLATE_ID,
          client_user_id: customerRef,
        });

        const results = response.data.identity_verifications || [];
        allResults.push(...results);
      } catch (error) {
        console.error(
          `Error fetching results for customer ${customerRef}:`,
          error
        );
        // Continue with next customer even if one fails
        continue;
      }
    }

    console.log(`Fetched ${allResults.length} total results`);

    // Filter results by date range
    const filteredResults = allResults.filter((result) => {
      const verificationDate = new Date(result.created_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return verificationDate >= start && verificationDate <= end;
    });

    console.log(
      `Filtered to ${filteredResults.length} results within date range`
    );

    // Group results by user_id and get the latest result for each user
    const userResults = new Map();
    filteredResults.forEach((result) => {
      const userId = result.client_user_id;
      const existingResult = userResults.get(userId);

      if (
        !existingResult ||
        new Date(result.created_at) > new Date(existingResult.created_at)
      ) {
        userResults.set(userId, result);
      }
    });

    const latestResults = Array.from(userResults.values());
    console.log(
      `Found ${latestResults.length} unique users with latest results`
    );

    return latestResults;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching verification results:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    } else {
      console.error("Unknown error fetching verification results:", error);
    }
    throw error;
  }
}
