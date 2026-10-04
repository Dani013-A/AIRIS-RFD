const directoryParams = new Set([
  "search",
  "coordinator",
  "program",
  "accountStatus",
  "resumeStatus",
  "interviewStatus",
  "score",
  "sort",
  "page",
]);

export function studentProfileHref(studentId, currentQuery, search, page) {
  const params = new URLSearchParams(currentQuery);
  for (const key of [...params.keys()]) {
    if (!directoryParams.has(key)) params.delete(key);
  }
  if (search.trim()) params.set("search", search.trim());
  else params.delete("search");
  params.set("page", String(page));
  return `/students/${encodeURIComponent(studentId)}?${params.toString()}`;
}

export function studentDirectoryHref(profileQuery) {
  const params = new URLSearchParams(profileQuery);
  for (const key of [...params.keys()]) {
    if (!directoryParams.has(key)) params.delete(key);
  }
  const page = Number(params.get("page"));
  if (!Number.isSafeInteger(page) || page < 1) params.delete("page");
  const query = params.toString();
  return query ? `/students?${query}` : "/students";
}
