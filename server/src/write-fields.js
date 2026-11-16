/** Split a write payload into columns that exist and names that do not. */
export function partitionWrite(data, columnNames) {
  const known = columnNames instanceof Set ? columnNames : new Set(columnNames || []);
  const payload = {};
  const unknown = [];
  for (const [key, value] of Object.entries(data || {})) {
    if (known.has(key)) payload[key] = value;
    else unknown.push(key);
  }
  return { payload, unknown };
}

/** Thrown by insert/update so a misspelled field is not saved as a silent success. */
export function unknownFieldError(table, fields) {
  const error = new Error(`Unknown fields for ${table}: ${fields.join(", ")}`);
  error.status = 422;
  error.fields = fields;
  return error;
}
