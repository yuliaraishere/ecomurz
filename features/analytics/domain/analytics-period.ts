/**
 * Analytics Period Domain
 * Timezone: Asia/Tokyo (UTC+9)
 * Strictly bounded date intervals for reporting queries.
 */

export type AnalyticsPeriod =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'CUSTOM';

export const SUPPORTED_PERIODS: AnalyticsPeriod[] = [
  'TODAY',
  'YESTERDAY',
  'LAST_7_DAYS',
  'LAST_30_DAYS',
  'THIS_MONTH',
  'LAST_MONTH',
  'THIS_YEAR',
  'CUSTOM',
];

export const REPORTING_TIMEZONE = 'Asia/Tokyo';
export const TOKYO_OFFSET_HOURS = 9;
export const TOKYO_OFFSET_MS = TOKYO_OFFSET_HOURS * 60 * 60 * 1000;
export const CUSTOM_MAX_DAYS = 366;

export interface DateRange {
  startDate: Date;
  endDate: Date;
  period: AnalyticsPeriod;
  timeZone: string;
}

/**
 * Converts a UTC Date into Year, Month (0-indexed), Date, Day in Asia/Tokyo.
 */
export function getTokyoParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  const tokyoTime = new Date(date.getTime() + TOKYO_OFFSET_MS);
  return {
    year: tokyoTime.getUTCFullYear(),
    month: tokyoTime.getUTCMonth(),
    day: tokyoTime.getUTCDate(),
    hours: tokyoTime.getUTCHours(),
    minutes: tokyoTime.getUTCMinutes(),
  };
}

/**
 * Creates a UTC Date corresponding to a specific Tokyo calendar day and time.
 */
export function createTokyoDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0
): Date {
  const utcEquivalent = Date.UTC(year, month, day, hours, minutes, seconds, ms);
  return new Date(utcEquivalent - TOKYO_OFFSET_MS);
}

/**
 * Calculates the start and end Date objects in UTC for a given period in Asia/Tokyo.
 */
export function resolveDateRange(
  period: AnalyticsPeriod,
  customStart?: string | Date | null,
  customEnd?: string | Date | null,
  referenceDate: Date = new Date()
): DateRange {
  const { year, month, day } = getTokyoParts(referenceDate);

  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'TODAY': {
      startDate = createTokyoDate(year, month, day, 0, 0, 0, 0);
      endDate = createTokyoDate(year, month, day, 23, 59, 59, 999);
      break;
    }
    case 'YESTERDAY': {
      startDate = createTokyoDate(year, month, day - 1, 0, 0, 0, 0);
      endDate = createTokyoDate(year, month, day - 1, 23, 59, 59, 999);
      break;
    }
    case 'LAST_7_DAYS': {
      // Past 7 completed/ongoing days including today
      startDate = createTokyoDate(year, month, day - 6, 0, 0, 0, 0);
      endDate = createTokyoDate(year, month, day, 23, 59, 59, 999);
      break;
    }
    case 'LAST_30_DAYS': {
      // Past 30 completed/ongoing days including today
      startDate = createTokyoDate(year, month, day - 29, 0, 0, 0, 0);
      endDate = createTokyoDate(year, month, day, 23, 59, 59, 999);
      break;
    }
    case 'THIS_MONTH': {
      startDate = createTokyoDate(year, month, 1, 0, 0, 0, 0);
      // Last day of this month
      const nextMonthFirst = createTokyoDate(year, month + 1, 1, 0, 0, 0, 0);
      endDate = new Date(nextMonthFirst.getTime() - 1);
      break;
    }
    case 'LAST_MONTH': {
      startDate = createTokyoDate(year, month - 1, 1, 0, 0, 0, 0);
      const thisMonthFirst = createTokyoDate(year, month, 1, 0, 0, 0, 0);
      endDate = new Date(thisMonthFirst.getTime() - 1);
      break;
    }
    case 'THIS_YEAR': {
      startDate = createTokyoDate(year, 0, 1, 0, 0, 0, 0);
      const nextYearFirst = createTokyoDate(year + 1, 0, 1, 0, 0, 0, 0);
      endDate = new Date(nextYearFirst.getTime() - 1);
      break;
    }
    case 'CUSTOM': {
      if (!customStart || !customEnd) {
        return resolveDateRange('LAST_30_DAYS', null, null, referenceDate);
      }

      const parsedStart = typeof customStart === 'string' ? new Date(customStart) : customStart;
      const parsedEnd = typeof customEnd === 'string' ? new Date(customEnd) : customEnd;

      if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
        return resolveDateRange('LAST_30_DAYS', null, null, referenceDate);
      }

      const startParts = getTokyoParts(parsedStart);
      const endParts = getTokyoParts(parsedEnd);

      startDate = createTokyoDate(startParts.year, startParts.month, startParts.day, 0, 0, 0, 0);
      endDate = createTokyoDate(endParts.year, endParts.month, endParts.day, 23, 59, 59, 999);

      if (startDate > endDate) {
        const temp = startDate;
        startDate = endDate;
        endDate = temp;
      }

      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > CUSTOM_MAX_DAYS) {
        endDate = new Date(startDate.getTime() + CUSTOM_MAX_DAYS * 24 * 60 * 60 * 1000 - 1);
      }
      break;
    }
    default: {
      return resolveDateRange('LAST_30_DAYS', null, null, referenceDate);
    }
  }

  return {
    startDate,
    endDate,
    period,
    timeZone: REPORTING_TIMEZONE,
  };
}

/**
 * Formats a Date into YYYY-MM-DD string in Asia/Tokyo timezone.
 */
export function formatTokyoDateKey(date: Date): string {
  const { year, month, day } = getTokyoParts(date);
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}
