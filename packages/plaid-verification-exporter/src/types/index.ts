export interface EnvVars {
  PLAID_CLIENT_ID: string;
  PLAID_SECRET: string;
  PLAID_ENV: "sandbox" | "development" | "production";
}

export interface CsvRecord {
  created_at: string;
  customer_reference: string;
  // Add other fields as needed
}

export interface VerificationResult {
  client_user_id: string;
  created_at: string;
  // Add other fields as needed
}
