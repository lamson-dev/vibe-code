import fs from "fs";
import path from "path";
import { stringify } from "csv-stringify/sync";
import { parseISO, getQuarter } from "date-fns";
import { MiddeskBusiness } from "./types/index.js";


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

/**
 * This function is exported to be called explicitly and only runs
 * when this module is executed directly (not when bundled)
 */
export async function runMiddeskProcessCLI() {
  // Get CSV file name from command line arguments
  const csvFileNameArg = process.argv[2];
      
  if (!csvFileNameArg) {
    console.error("Error: Please provide the path to the CSV file as a command line argument.");
    console.error("Usage: tsx src/middesk-process-csv.ts <path_to_csv_file>");
    process.exit(1);
  }

  console.log(`Using CSV file: ${csvFileNameArg}`);
  
  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), "_output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
      
  // Use provided file or search for most recent file
  let inputFile = '';
  try {
    // Check if the file exists directly
    if (fs.existsSync(csvFileNameArg)) {
      inputFile = csvFileNameArg;
    } else {
      // Try to find a middesk-businesses JSON file in the output directory
      const yearQuarter = formatYearQuarter(new Date().toISOString());
      inputFile = path.join(
        process.cwd(),
        "_output",
        `middesk-businesses-${yearQuarter}.json`
      );
      
      if (!fs.existsSync(inputFile)) {
        console.error(`Could not find a middesk-businesses file in ${outputDir}`);
        console.error("Please run middesk:export first or provide a valid file path");
        process.exit(1);
      }
    }
    
    const outputFile = path.join(
      process.cwd(),
      "_output",
      "processed-middesk-data.csv"
    );
    
    console.log(`Processing input file: ${inputFile}`);
    console.log(`Output will be written to: ${outputFile}`);
    
    processMiddeskData(inputFile, outputFile);
  } catch (error) {
    console.error("Error processing Middesk data:", error);
    process.exit(1);
  }
}

// Check if this file is being run directly (not as part of a bundle)
// This condition will only be true when the file is executed directly with tsx
if (process.argv[1] && process.argv[1].endsWith('middesk-process-csv.ts')) {
  runMiddeskProcessCLI();
}
