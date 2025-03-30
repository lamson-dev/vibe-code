import { IdentityVerification } from "plaid";

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

export type VerificationResult = IdentityVerification;

export interface AugmentedCsvRecord extends CsvRecord {
  first_name?: string;
  last_name?: string;
}
