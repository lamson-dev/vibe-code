import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import path from "path";
import { stringify } from "csv-stringify/sync";
import { parseISO, getQuarter } from "date-fns";
import { MiddeskBusiness } from "./types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


function formatYearQuarter(dateString: string): string {
  const date = parseISO(dateString);
  const year = date.getFullYear();
  const quarter = getQuarter(date);
  return `Q${quarter}-${year}`;
}

function processBusinesses(businesses: MiddeskBusiness[]) {
  return businesses.map((business) => {
    // Find the address task with a successful match
    const addressTask = business.review.tasks.find(
      (task) =>
        task.category === "address" &&
        task.key === "address_verification" &&
        task.status === "success"
    );

    // Get the physical address from the task's sources if available
    const physicalAddress =
      addressTask?.sources?.[0]?.metadata?.full_address || "N/A";

    return {
      "#": business.id,
      "Business Name": business.name,
      "Business Physical Address": physicalAddress,
      EIN: business.tin?.tin || "MISSING",
      "Onboard Date": formatYearQuarter(business.created_at),
      created_at: business.created_at,
      status: business.status,
    };
  });
}

export async function processMiddeskData(
  input: string | MiddeskBusiness[],
  outputPath: string
): Promise<void> {
  try {
    // Get businesses data either from file or direct input
    const businesses: MiddeskBusiness[] =
      typeof input === "string"
        ? JSON.parse(fs.readFileSync(input, "utf-8"))
        : input;

    // Process the records
    const processedRecords = processBusinesses(businesses);

    // Write to CSV
    const output = stringify(processedRecords, {
      header: true,
      columns: [
        "#",
        "Business Name",
        "Business Physical Address",
        "EIN",
        "Onboard Date",
        "created_at",
        "status",
      ],
    });

    fs.writeFileSync(outputPath, output);
    console.log(`Processed CSV written to ${outputPath}`);
  } catch (error) {
    console.error("Error processing Middesk data:", error);
    throw error;
  }
}

// Example usage when running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inputFile = path.join(
    process.cwd(),
    "_output",
    "middesk-businesses-2025-01.json"
  );
  const outputFile = path.join(
    process.cwd(),
    "_output",
    "processed-middesk-data.csv"
  );
  processMiddeskData(inputFile, outputFile);
}
