import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import { CsvRecord } from "../types/index.js";

export async function readCustomerReferences(): Promise<string[]> {
  try {
    const csvPath = path.join(
      process.cwd(),
      "input",
      "scrrep_8zaPSPdunqVjS4.csv.csv"
    );
    const csvContent = await fs.readFile(csvPath, "utf-8");
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as CsvRecord[];

    // Extract unique customer references
    const uniqueRefs = new Set(
      records.map((record) => record.customer_reference)
    );
    const customerRefs = Array.from(uniqueRefs);

    console.log(`Found ${customerRefs.length} unique customer references`);
    return customerRefs;
  } catch (error) {
    console.error("Error reading CSV file:", error);
    throw error;
  }
}
