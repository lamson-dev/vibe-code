import { format, parseISO, getQuarter } from "date-fns";
import fs from "fs";
import path from "path";

export function formatYearQuarter(dateString: string): string {
  const date = parseISO(dateString);
  const year = date.getFullYear();
  const quarter = getQuarter(date);
  return `Q${quarter} ${year}`;
}

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

    const dateSuffix = quarterFormat
      ? formatYearQuarter(endDate.toISOString())
      : format(endDate, "yyyy-MM");
    const outputFile = path.join(
      outputDir,
      `${prefix}-${dateSuffix}.json`
    );

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\nExported ${results.length} results to ${outputFile}`);
  } catch (error) {
    console.error(`Error writing ${prefix} results to JSON:`, error);
    throw error;
  }
}
