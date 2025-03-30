import { config } from "dotenv";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import fs from "fs/promises";
import path from "path";
import { exportPlaidVerificationResults } from "./plaid-exporter.js";
import { exportMiddeskBusinesses } from "./middesk-exporter.js";

// Load environment variables
config();

const TIME_ZONE = "America/New_York"; // US Eastern Time

async function runExporters() {
  try {
    // Set date range for Q1 2025
    const startDateStr = "2025-01-01";
    const endDateStr = "2025-03-31";

    console.log("Starting compliance data export process...");
    console.log(`Date range: ${startDateStr} to ${endDateStr}`);

    // Run Plaid exporter
    console.log("\n=== Running Plaid Verification Export ===");
    await exportPlaidVerificationResults(startDateStr, endDateStr);

    // Run Middesk exporter
    console.log("\n=== Running Middesk Business Export ===");
    const startDate = fromZonedTime(`${startDateStr} 00:00:00`, TIME_ZONE);
    const endDate = fromZonedTime(`${endDateStr} 23:59:59`, TIME_ZONE);
    await exportMiddeskBusinesses(startDate, endDate);

    console.log("\nAll exports completed successfully!");
  } catch (error) {
    console.error("Export process failed:", error);
    process.exit(1);
  }
}

// Run both exporters
runExporters();
