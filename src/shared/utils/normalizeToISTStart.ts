import { startOfDay } from "date-fns"
import { toZonedTime } from "date-fns-tz"

const IST = "Asia/Kolkata"

/**
 * Normalizes a date to the start of day in IST and returns the UTC equivalent
 * @param dateInput - Optional date string or Date object. Defaults to current date if not provided
 * @returns Date object representing midnight IST in UTC
 */
export function normalizeToISTStart(dateInput?: string | Date): Date {
  // Convert input to Date object, or use current date
  const inputDate = dateInput ? new Date(dateInput) : new Date()

  // Convert to IST timezone
  const istDate = toZonedTime(inputDate, IST)

  // Get start of day (midnight) in IST
  const istStartOfDay = startOfDay(istDate)

  // Convert IST midnight back to UTC
  const utcFromIstStart = new Date(istStartOfDay.getTime() - (istStartOfDay.getTimezoneOffset() * 60000));

  return utcFromIstStart
}

/**
 * Helper function to format IST date for display
 */
export function formatISTDate(date: Date): string {
  const istDate = toZonedTime(date, IST)
  return istDate.toLocaleString("en-IN", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

/**
 * Get current IST time
 */
export function getCurrentIST(): Date {
  return toZonedTime(new Date(), IST)
}


export function normalizeDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}