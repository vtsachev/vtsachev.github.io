const REQUIRED_HEADERS = ["city", "tz", "country"];

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function isValidIanaTimezone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function getTimezoneEntryKey(entry) {
  return `${(entry.city || "").trim().toLowerCase()}|${(entry.tz || "")
    .trim()
    .toLowerCase()}`;
}

export function parseTimezoneCsv(csvText) {
  const lines = csvText.split(/\r?\n/);
  const nonEmpty = lines
    .map((line, index) => ({ line, lineNo: index + 1 }))
    .filter(({ line }) => line.trim() !== "");

  if (nonEmpty.length === 0) {
    return { headers: [], rows: [] };
  }

  const [{ line: headerLine }, ...dataLines] = nonEmpty;
  const headers = parseCsvLine(headerLine);

  const rows = dataLines.map(({ line, lineNo }) => {
    const values = parseCsvLine(line);
    const entry = { _line: lineNo };

    headers.forEach((header, index) => {
      entry[header] = values[index] ?? "";
    });

    if (values.length > headers.length) {
      entry._extraValues = values.length - headers.length;
    }

    return entry;
  });

  return { headers, rows };
}

export function validateTimezoneRows(headers, rows) {
  const errors = [];

  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headers.includes(header),
  );
  if (missingHeaders.length > 0) {
    errors.push(
      `Missing required header(s): ${missingHeaders.join(", ")}. Expected headers include: ${REQUIRED_HEADERS.join(", ")}`,
    );
  }

  const seen = new Map();

  rows.forEach((row) => {
    if (row._extraValues) {
      errors.push(
        `Line ${row._line}: contains ${row._extraValues} extra CSV value(s) beyond header columns.`,
      );
    }

    REQUIRED_HEADERS.forEach((field) => {
      const value = row[field];
      if (!value || value.trim() === "") {
        errors.push(`Line ${row._line}: missing required field '${field}'.`);
      }
    });

    if (!row.tz || row.tz.trim() === "") {
      return;
    }

    if (!isValidIanaTimezone(row.tz)) {
      errors.push(
        `Line ${row._line}: invalid IANA timezone '${row.tz}'.`,
      );
    }

    const duplicateKey = getTimezoneEntryKey(row);
    if (seen.has(duplicateKey)) {
      errors.push(
        `Line ${row._line}: duplicate city/timezone pair '${row.city} | ${row.tz}' (first seen on line ${seen.get(duplicateKey)}).`,
      );
    } else {
      seen.set(duplicateKey, row._line);
    }
  });

  return errors;
}

function toPublicRow(row) {
  return {
    city: row.city,
    tz: row.tz,
    country: row.country,
  };
}

export function parseAndValidateTimezoneCsv(
  csvText,
  { throwOnError = true } = {},
) {
  const { headers, rows } = parseTimezoneCsv(csvText);
  const errors = validateTimezoneRows(headers, rows);

  if (throwOnError && errors.length > 0) {
    throw new Error(`Timezone CSV validation failed:\n- ${errors.join("\n- ")}`);
  }

  return {
    rows: rows.map(toPublicRow),
    errors,
  };
}
