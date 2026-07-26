// Maps a `history` row from its database shape to the shape the API exposes.
//
// Postgres columns are snake_case; the API and the client speak camelCase.
// Without this, GET /api/history handed raw rows straight to the client, so
// `entry.createdAt` and `entry.tailoredCV` were both undefined — history rows
// rendered "NaN days ago" and an empty CV body. Every response that returns a
// history row goes through here so the two shapes cannot drift again.
//
// `tailoredCv` matches the field name POST /api/tailor returns. Unknown columns
// pass through untouched, so adding one to the table does not require a change
// here unless it needs renaming.
export function toHistoryEntry(row) {
  if (!row || typeof row !== 'object') return row;

  const { created_at: createdAt, tailored_cv: tailoredCv, ...rest } = row;

  return {
    ...rest,
    ...(createdAt !== undefined && { createdAt }),
    ...(tailoredCv !== undefined && { tailoredCv }),
  };
}
