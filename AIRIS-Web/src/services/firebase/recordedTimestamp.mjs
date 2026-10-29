export function recordedTimestamp(timestamp) {
  if (timestamp === null || timestamp === undefined || timestamp === "") return undefined;
  const value = typeof timestamp?.toDate === "function"
    ? timestamp.toDate()
    : typeof timestamp?.seconds === "number"
      ? new Date(timestamp.seconds * 1000)
      : typeof timestamp?._seconds === "number"
        ? new Date(timestamp._seconds * 1000)
        : typeof timestamp === "number"
          ? new Date(timestamp < 100_000_000_000 ? timestamp * 1000 : timestamp)
          : new Date(timestamp);
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : undefined;
}
