export const parseSLDate = (val: any): Date => {
  if (!val) return new Date();

  // If Firebase Timestamp-like
  if (val && typeof val.toDate === "function") {
    return val.toDate();
  }

  // If Firebase Timestamp raw object
  if (val && typeof val === "object" && ("_seconds" in val || "seconds" in val)) {
    const s = val._seconds ?? val.seconds;
    const ns = val._nanoseconds ?? val.nanoseconds ?? 0;
    return new Date(s * 1000 + ns / 1000000);
  }

  if (typeof val === "string") {
    // Matches DD/MM/YYYY, hh:mm:ss a or DD/MM/YYYY, h:mm:ss a
    const match = val.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm|AM|PM)$/i);
    if (match) {
      const [_, day, month, year, hoursStr, minutes, seconds, ampm] = match;
      let hours = parseInt(hoursStr, 10);
      if (ampm.toLowerCase() === "pm" && hours < 12) hours += 12;
      if (ampm.toLowerCase() === "am" && hours === 12) hours = 0;
      return new Date(`${year}-${month}-${day}T${hours.toString().padStart(2, '0')}:${minutes}:${seconds}+05:30`);
    }
  }

  return new Date(val);
};

export const formatSLDate = (val: any): string => {
  if (!val) return "";
  const date = parseSLDate(val);
  if (isNaN(date.getTime())) return String(val);

  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    };
    // format as "DD/MM/YYYY, hh:mm:ss am/pm"
    const formatter = new Intl.DateTimeFormat("en-GB", options);
    return formatter.format(date);
  } catch (e) {
    return date.toLocaleString();
  }
};

export const formatSLDateOnly = (val: any): string => {
  if (!val) return "";
  const date = parseSLDate(val);
  if (isNaN(date.getTime())) return String(val);

  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    };
    const formatter = new Intl.DateTimeFormat("en-GB", options);
    return formatter.format(date);
  } catch (e) {
    return date.toLocaleDateString();
  }
};
