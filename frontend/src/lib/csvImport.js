/** Pure CSV parse, column mapping, and transform utilities for bulk import. */

export const CSV_IMPORT_STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Map columns" },
  { id: 3, label: "Preview" },
  { id: 4, label: "Import" },
];

export const CSV_IMPORT_TARGET_FIELDS = [
  { key: "company", label: "Company", required: true },
  { key: "role_title", label: "Role title", required: true },
  { key: "location", label: "Location", required: false },
  { key: "remote_status", label: "Remote status", required: false },
  { key: "compensation", label: "Compensation", required: false },
  { key: "company_type", label: "Company type", required: false },
  { key: "date_applied", label: "Date applied", required: false },
];

export const CSV_IMPORT_PREVIEW_ROWS = 3;
export const CSV_IMPORT_DROPZONE_HEIGHT_PX = 160;
export const CSV_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const CSV_IMPORT_MAX_MB = CSV_IMPORT_MAX_BYTES / 1024 / 1024;

const COLUMN_ALIASES = {
  company: ["company", "company_name", "employer", "organization", "org"],
  role_title: ["role_title", "role", "title", "job_title", "position"],
  location: ["location", "city", "office"],
  remote_status: ["remote_status", "remote", "work_type"],
  compensation: ["compensation", "salary", "pay"],
  company_type: ["company_type", "type", "industry"],
  date_applied: ["date_applied", "applied", "application_date", "date"],
};

function normalizeHeader(header) {
  return header.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
}

function parseCsvRow(line) {
  const cells = [];
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
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseCsvText(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = parseCsvRow(lines[0]);
  const rows = lines.slice(1).map(parseCsvRow);
  return { headers, rows };
}

export function guessColumnMapping(headers) {
  const mapping = {};
  for (const field of CSV_IMPORT_TARGET_FIELDS) {
    const aliases = COLUMN_ALIASES[field.key] ?? [field.key];
    const match = headers.find((header) => {
      const normalized = normalizeHeader(header);
      return normalized === field.key || aliases.includes(normalized);
    });
    mapping[field.key] = match ?? "";
  }
  return mapping;
}

function escapeCsvField(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function getMappedPreviewRows(parsed, mapping, limit = CSV_IMPORT_PREVIEW_ROWS) {
  const fields = CSV_IMPORT_TARGET_FIELDS.filter((field) => mapping[field.key]);
  return parsed.rows.slice(0, limit).map((row) => {
    const mapped = {};
    for (const field of fields) {
      const sourceHeader = mapping[field.key];
      const index = parsed.headers.indexOf(sourceHeader);
      mapped[field.key] = index >= 0 ? (row[index] ?? "") : "";
    }
    return mapped;
  });
}

export function isMappingValid(mapping) {
  return CSV_IMPORT_TARGET_FIELDS
    .filter((field) => field.required)
    .every((field) => Boolean(mapping[field.key]));
}

export function buildMappedCsvBlob(parsed, mapping) {
  const fields = CSV_IMPORT_TARGET_FIELDS.filter((field) => mapping[field.key]);
  const headerLine = fields.map((field) => field.key).join(",");
  const dataLines = parsed.rows.map((row) =>
    fields
      .map((field) => {
        const index = parsed.headers.indexOf(mapping[field.key]);
        return escapeCsvField(index >= 0 ? row[index] ?? "" : "");
      })
      .join(",")
  );
  const csvText = [headerLine, ...dataLines].join("\n");
  return new Blob([csvText], { type: "text/csv" });
}

export function readCsvFile(file) {
  if (typeof file.text === "function") {
    return file.text().then(parseCsvText);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(parseCsvText(String(reader.result ?? "")));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}
