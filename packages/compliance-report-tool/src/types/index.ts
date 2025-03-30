import { IdentityVerification } from "plaid";

export interface EnvVars {
  PLAID_CLIENT_ID: string;
  PLAID_SECRET: string;
  PLAID_ENV: "sandbox" | "development" | "production";
}

export interface CsvRecord {
  customer_reference: string;
}

export interface VerificationResult extends IdentityVerification {}

export interface AugmentedCsvRecord extends CsvRecord {
  first_name?: string;
  last_name?: string;
}

export interface MiddeskBusiness {
  object: string;
  id: string;
  name: string;
  created_at: string;
  external_id?: string;
  status: string;
  tin: {
    tin: string;
  };
  review: {
    tasks: Array<{
      category: string;
      key: string;
      label: string;
      message: string;
      status: string;
      sources?: Array<{
        type: string;
        metadata?: {
          full_address?: string;
        };
      }>;
    }>;
  };
}

export interface MiddeskCsvRow {
  "#": string;
  "Business Name": string;
  "Business Physical Address": string;
  EIN: string;
  "First Name": string;
  "Last Name": string;
  "Physical Address": string;
  DOB: string;
  SSN: string;
  "Beneficial Owner": string;
  "Controlling Party": string;
  "Onboard Date": string;
  created_at: string;
  status: string;
}

export interface ProcessedMiddeskRecord {
  business_id: string;
  business_name: string;
  business_address: string;
  ein: string;
  created_at: string;
  status: string;
  first_name: string;
  last_name: string;
  person_address: string;
  dob: string;
  ssn: string;
  beneficial_owner: string;
  controlling_party: string;
  onboard_date: string;
}
