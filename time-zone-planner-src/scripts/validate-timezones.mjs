import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAndValidateTimezoneCsv } from "../src/data/timezoneCatalog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvFiles = ["timezones.csv", "country-capitals.csv"];

let hasErrors = false;

for (const fileName of csvFiles) {
  const csvPath = path.resolve(__dirname, `../src/data/${fileName}`);
  const csvText = await readFile(csvPath, "utf8");
  const { rows, errors } = parseAndValidateTimezoneCsv(csvText, {
    throwOnError: false,
  });

  if (errors.length > 0) {
    hasErrors = true;
    console.error(`Timezone CSV validation failed for ${fileName}:\n`);
    errors.forEach((error) => {
      console.error(`- ${error}`);
    });
    console.error("");
    continue;
  }

  console.log(`Timezone CSV is valid (${rows.length} rows): ${csvPath}`);
}

if (hasErrors) {
  process.exit(1);
}
