import { PlaidApi } from "plaid";
import { VerificationResult } from "../types/index.js";
import { readCustomerReferences } from "./csv.js";

export async function getVerificationResults(
  plaidClient: PlaidApi,
  startDate: string,
  endDate: string,
  limit: number = 100
): Promise<VerificationResult[]> {
  try {
    // Read customer references from CSV
    const customerRefs = await readCustomerReferences();
    console.log(
      `Processing verification results for ${customerRefs.length} customers`
    );

    // Get verification results for each customer
    const allResults: VerificationResult[] = [];
    for (const customerRef of customerRefs) {
      try {
        const response = await plaidClient.identityVerificationList({
          template_id: "idvtmp_epgCoTSYzF8A4u",
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
