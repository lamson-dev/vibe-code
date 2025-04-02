import { format, parseISO, getQuarter } from "date-fns";
import fs from "fs";
import path from "path";

export function formatYearQuarter(dateString: string): string {
  const date = parseISO(dateString);
  const year = date.getFullYear();
  const quarter = getQuarter(date);
  return `Q${quarter} ${year}`;
}

/**
 * Redacts sensitive information in JSON data
 * @param data The data object to redact
 * @param showSensitiveData Whether to show sensitive data
 * @returns A copy of the data with sensitive information redacted
 */
export function redactJsonSensitiveData<T>(data: T, showSensitiveData: boolean = false): T {
  if (showSensitiveData) {
    return data; // Return data as-is if sensitive data should be shown
  }

  // Create a deep copy to avoid modifying the original
  const copy = JSON.parse(JSON.stringify(data));
  
  // Define sensitive field names (case-insensitive)
  const sensitiveFields = ['tin', 'ssn', 'id_number', 'tax_id', 'ein', 'social_security', 'taxpayer_id'];
  
  // Function to redact a string value
  const redactValue = (value: string): string => {
    if (!value) return value;
    
    // For SSN or EIN (9 digits typically)
    if (/^\d{9}$/.test(value.replace(/[^0-9]/g, ''))) {
      return 'XXX-XX-' + value.replace(/[^0-9]/g, '').slice(-4);
    }
    
    // For partial redaction of other values
    if (value.length > 4) {
      return 'XXXX' + value.slice(-4);
    }
    
    // For short values, just redact completely
    return 'REDACTED';
  };
  
  // Recursive function to traverse the object and redact sensitive fields
  const traverse = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key in obj) {
      // Check if this is a sensitive field
      if (obj[key] && typeof obj[key] === 'string' && 
          sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        // Redact the value
        obj[key] = redactValue(obj[key]);
      } 
      // For objects that might have a 'value' field for sensitive data
      else if (obj[key] && typeof obj[key] === 'object' && obj[key].value && 
               sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key].value = redactValue(obj[key].value);
      }
      // Continue traversing if it's an object or array
      else if (obj[key] && typeof obj[key] === 'object') {
        traverse(obj[key]);
      }
    }
  };
  
  // Start traversal on the copied data
  traverse(copy);
  return copy as T;
}

export async function writeResultsJson<T>(
  results: T[],
  endDate: Date,
  prefix: string,
  quarterFormat: boolean = true,
  showSensitiveData: boolean = false
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

    // Redact sensitive data if needed
    const dataToWrite = showSensitiveData 
      ? results
      : redactJsonSensitiveData(results, showSensitiveData);

    fs.writeFileSync(outputFile, JSON.stringify(dataToWrite, null, 2));
    console.log(`\nExported ${results.length} results to ${outputFile}`);
    
    if (!showSensitiveData) {
      console.log("Note: Sensitive data has been redacted in the JSON output.");
    } else {
      console.log("Warning: Full sensitive data is visible in the JSON output.");
    }
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
