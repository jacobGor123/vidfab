export const ADMIN_STATS_TIMEZONE = "Asia/Shanghai";
export const ADMIN_STATS_TIMEZONE_LABEL = "UTC+8";

const adminDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ADMIN_STATS_TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

const adminDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: ADMIN_STATS_TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export function parseAdminTimestamp(
  value: string | number | Date | null | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  const timestamp =
    typeof value === "string" && !/(?:z|[+-]\d{2}:?\d{2})$/i.test(value)
      ? /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T00:00:00Z`
        : `${value}Z`
      : value;
  const date = value instanceof Date ? value : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function formatAdminDateTime(
  value: string | number | Date | null | undefined,
): string {
  const date = parseAdminTimestamp(value);
  return date ? adminDateTimeFormatter.format(date) : "-";
}

export function formatAdminDate(
  value: string | number | Date | null | undefined,
): string {
  const date = parseAdminTimestamp(value);
  return date ? adminDateFormatter.format(date) : "-";
}

export function formatAdminUtcTitle(
  value: string | number | Date | null | undefined,
): string | undefined {
  const date = parseAdminTimestamp(value);
  return date ? `UTC: ${date.toISOString()}` : undefined;
}
