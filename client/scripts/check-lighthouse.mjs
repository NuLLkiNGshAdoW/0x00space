import fs from "node:fs";

const reportPath = process.argv[2];
if (!reportPath) {
  console.error("Usage: node scripts/check-lighthouse.mjs <report.json>");
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const thresholds = {
  performance: 0.85,
  accessibility: 0.95,
  "best-practices": 0.9,
  seo: 0.9,
};
let failed = false;

for (const [category, minimum] of Object.entries(thresholds)) {
  const score = report.categories?.[category]?.score;
  const passed = typeof score === "number" && score >= minimum;
  console.log(`${passed ? "PASS" : "FAIL"} ${category}: ${score ?? "missing"} (min ${minimum})`);
  if (!passed) failed = true;
}

const transferBytes = report.audits?.["total-byte-weight"]?.numericValue;
const transferBudgetBytes = 1024 * 1024;
const transferPassed = typeof transferBytes === "number" && transferBytes <= transferBudgetBytes;
console.log(
  `${transferPassed ? "PASS" : "FAIL"} transfer: ${transferBytes ?? "missing"} bytes (max ${transferBudgetBytes})`,
);
if (!transferPassed) failed = true;

if (failed) process.exit(1);
