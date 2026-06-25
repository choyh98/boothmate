export type UserRole = "company" | "contractor" | "admin";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type SubscriptionStatus =
  | "inactive"
  | "active"
  | "trial"
  | "past_due"
  | "expired"
  | "suspended"
  | "cancelled";

export type QuoteRequestStatus =
  | "draft"
  | "open"
  | "reviewing"
  | "selected"
  | "closed"
  | "cancelled";

export type QuoteStatus =
  | "draft"
  | "submitted"
  | "viewed"
  | "shortlisted"
  | "selected"
  | "rejected"
  | "withdrawn";
