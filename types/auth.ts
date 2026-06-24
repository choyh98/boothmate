export type UserRole = "company" | "contractor" | "admin";

export type SignupRole = Exclude<UserRole, "admin">;

export type AuthFormState = {
  ok: boolean;
  message: string;
};

export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: UserRole;
};

export type Company = {
  id: string;
  owner_id: string;
  company_name: string;
  business_number: string | null;
  industry: string | null;
  website: string | null;
  verification_status: string;
};

export type Contractor = {
  id: string;
  owner_id: string;
  company_name: string;
  business_number: string | null;
  description: string | null;
  service_regions: string[];
  booth_types: string[];
  minimum_budget: number | null;
  verification_status: string;
  subscription_status: string;
  subscription_expires_at: string | null;
};
