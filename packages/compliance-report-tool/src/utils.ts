import { format } from "date-fns";
import fs from "fs";
import path from "path";

export async function writeResultsJson<T>(
  results: T[],
  endDate: Date,
  prefix: string,
  quarterFormat: boolean = true
): Promise<void> {
  try {
    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const dateFormat = quarterFormat ? "yyyy-QQ" : "yyyy-MM";
    const outputFile = path.join(
      outputDir,
      `${prefix}-${format(endDate, dateFormat)}.json`
    );

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\nExported ${results.length} results to ${outputFile}`);
  } catch (error) {
    console.error(`Error writing ${prefix} results to JSON:`, error);
    throw error;
  }
}
