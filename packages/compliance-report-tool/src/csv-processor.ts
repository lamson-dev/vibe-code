import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

interface CsvRow {
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

interface MiddeskBusiness {
  id: string;
  name: string;
  physical_address: {
    street_line1: string;
    city: string;
    state: string;
    postal_code: string;
  };
  ein: string;
  created_at: string;
  status: string;
}

function processCsv(inputPath: string, outputPath: string) {
  // Read the CSV file
  const fileContent = fs.readFileSync(inputPath, "utf-8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  }) as CsvRow[];

  // Process each record
  const processedRecords = records.map((record) => {
    // Create a Middesk business object from the CSV data
    const middeskBusiness: MiddeskBusiness = {
      id: record["#"],
      name: record["Business Name"],
      physical_address: {
        street_line1: record["Business Physical Address"].split(",")[0].trim(),
        city: record["Business Physical Address"].split(",")[1]?.trim() || "",
        state:
          record["Business Physical Address"]
            .split(",")[2]
            ?.trim()
            .split(" ")[0] || "",
        postal_code:
          record["Business Physical Address"]
            .split(",")[2]
            ?.trim()
            .split(" ")[1] || "",
      },
      ein: record["EIN"],
      created_at: record["created_at"],
      status: record["status"],
    };

    return {
      business_id: middeskBusiness.id,
      business_name: middeskBusiness.name,
      business_address: `${middeskBusiness.physical_address.street_line1}, ${middeskBusiness.physical_address.city}, ${middeskBusiness.physical_address.state} ${middeskBusiness.physical_address.postal_code}`,
      ein: middeskBusiness.ein,
      created_at: middeskBusiness.created_at,
      status: middeskBusiness.status,
      // Keep the original person information
      first_name: record["First Name"],
      last_name: record["Last Name"],
      person_address: record["Physical Address"],
      dob: record["DOB"],
      ssn: record["SSN"],
      beneficial_owner: record["Beneficial Owner"],
      controlling_party: record["Controlling Party"],
      onboard_date: record["Onboard Date"],
    };
  });

  // Write to new CSV
  const output = stringify(processedRecords, {
    header: true,
    columns: [
      "business_id",
      "business_name",
      "business_address",
      "ein",
      "created_at",
      "status",
      //   "first_name",
      //   "last_name",
      //   "person_address",
      //   "dob",
      //   "ssn",
      //   "beneficial_owner",
      //   "controlling_party",
      "onboard_date",
    ],
  });

  fs.writeFileSync(outputPath, output);
  console.log(`Processed CSV written to ${outputPath}`);
}

// Example usage
const inputFile = path.join(
  process.cwd(),
  "input",
  "Dummy CIP Results-Table 1.csv"
);
const outputFile = path.join(
  process.cwd(),
  "output",
  "processed-middesk-data.csv"
);
processCsv(inputFile, outputFile);
