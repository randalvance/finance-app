export type DatePreset =
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_QUARTER"
  | "LAST_QUARTER"
  | "THIS_YEAR"
  | "LAST_YEAR"
  | "LAST_30_DAYS"
  | "LAST_90_DAYS";

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Calculate date range from a preset value
 * @param preset The preset period to calculate
 * @returns DateRange object with startDate and endDate in YYYY-MM-DD format
 */
export function calculateDateRange (preset: DatePreset): DateRange {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  switch (preset) {
    case "THIS_MONTH": {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    case "LAST_MONTH": {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    case "THIS_QUARTER": {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      const startDate = new Date(year, quarterStartMonth, 1);
      const endDate = new Date(year, quarterStartMonth + 3, 0);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    case "LAST_QUARTER": {
      const currentQuarterStartMonth = Math.floor(month / 3) * 3;
      const lastQuarterStartMonth = currentQuarterStartMonth - 3;
      const startDate = new Date(year, lastQuarterStartMonth, 1);
      const endDate = new Date(year, lastQuarterStartMonth + 3, 0);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    case "THIS_YEAR": {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    case "LAST_YEAR": {
      const startDate = new Date(year - 1, 0, 1);
      const endDate = new Date(year - 1, 11, 31);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    case "LAST_30_DAYS": {
      const endDate = new Date(today);
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    case "LAST_90_DAYS": {
      const endDate = new Date(today);
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 90);
      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
      };
    }

    default: {
      const exhaustiveCheck: never = preset;
      throw new Error(`Unknown preset: ${exhaustiveCheck}`);
    }
  }
}

/**
 * Format a Date object as YYYY-MM-DD
 */
function formatDate (date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
