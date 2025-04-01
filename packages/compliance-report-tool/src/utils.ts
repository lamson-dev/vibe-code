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
    const outputDir = path.join(process.cwd(), "_output");
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

// --- Levenshtein Distance Implementation ---
// (Simple implementation based on Wagner–Fischer algorithm)
export function calculateLevenshteinDistance(s1: string, s2: string): number {
    s1 = s1 || ""; // Handle null/undefined
    s2 = s2 || ""; // Handle null/undefined
    const m = s1.length;
    const n = s2.length;
    const d: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    if (m === 0) return n;
    if (n === 0) return m;

    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;

    for (let j = 1; j <= n; j++) {
        for (let i = 1; i <= m; i++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            d[i][j] = Math.min(
                d[i - 1][j] + 1,      // deletion
                d[i][j - 1] + 1,      // insertion
                d[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return d[m][n];
}
