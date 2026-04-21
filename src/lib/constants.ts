export const DELIVERY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const BILL_STATUSES = ["unpaid", "paid", "partial"] as const;

export const TRANSACTION_STATUSES = ["recorded", "confirmed", "pending", "cancelled"] as const;
export const PAYMENT_METHODS = ["upi", "cash"] as const;

export const MONTH_LABELS = [
  "",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

export const APP_CONFIG = {
  appName: "Mohite Newspaper Agency",
};

export const ADMIN_SESSION_COOKIE = "news-admin-session";
export const CUSTOMER_SESSION_COOKIE = "news-customer-session";
