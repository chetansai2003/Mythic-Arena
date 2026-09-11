export class HttpError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}
export function parseInput(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new HttpError(400, 'INVALID_PAYLOAD', 'Check the highlighted fields and try again.', parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
  return parsed.data;
}
