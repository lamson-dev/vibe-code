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
