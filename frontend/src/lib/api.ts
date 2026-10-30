import type { StaffRole } from "../types";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code = "error",
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  role: StaffRole;
  can_edit: boolean;
  must_change_password: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface LoginResponse {
  message: string;
  token: string;
  must_change_password: boolean;
  user: ApiUser;
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: ApiUser;
}

export type RegisterPayload = {
  username: string;
  password: string;
  password_confirm: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  job_title?: string;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Token ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      "Cannot reach the API. Is the Django server running on port 8000?",
      0,
      "network_error",
    );
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const err = (data ?? {}) as {
      message?: string;
      error?: string;
      details?: unknown;
    };
    throw new ApiError(
      err.message || `Request failed (${response.status})`,
      response.status,
      err.error || "error",
      err.details,
    );
  }

  return data as T;
}

export function loginRequest(username: string, password: string) {
  return request<LoginResponse>("/api/auth/login/", {
    method: "POST",
    body: { username, password },
  });
}

export function registerRequest(payload: RegisterPayload) {
  return request<RegisterResponse>("/api/auth/register/", {
    method: "POST",
    body: payload,
  });
}

export function meRequest(token: string) {
  return request<ApiUser>("/api/auth/me/", { token });
}

export function updateMeRequest(
  token: string,
  data: Partial<
    Pick<
      ApiUser,
      | "username"
      | "first_name"
      | "last_name"
      | "email"
      | "phone"
      | "job_title"
    >
  >,
) {
  return request<ApiUser>("/api/auth/me/", {
    method: "PATCH",
    token,
    body: data,
  });
}

export function changePasswordRequest(body: {
  username: string;
  old_password: string;
  new_password: string;
  new_password_confirm: string;
}) {
  return request<{ message: string; token: string }>(
    "/api/auth/change-password/",
    {
      method: "POST",
      body,
    },
  );
}

export function logoutRequest(token: string) {
  return request<{ message: string }>("/api/auth/logout/", {
    method: "POST",
    token,
  });
}

/** Pull a readable message from DRF field errors when present. */
export function apiErrorMessage(err: unknown, fallback: string) {
  if (!(err instanceof ApiError)) return fallback;
  if (err.details && typeof err.details === "object") {
    const details = err.details as Record<string, unknown>;
    const first = Object.values(details).flat()[0];
    if (typeof first === "string") return first;
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
  }
  return err.message || fallback;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function toApiPath(urlOrPath: string) {
  if (urlOrPath.startsWith("/")) return urlOrPath;
  if (urlOrPath.startsWith(API_BASE)) return urlOrPath.slice(API_BASE.length);
  try {
    return new URL(urlOrPath).pathname + new URL(urlOrPath).search;
  } catch {
    return urlOrPath;
  }
}

export async function fetchAllPages<T>(
  firstPath: string,
  token?: string | null,
): Promise<T[]> {
  const rows: T[] = [];
  let nextPath: string | null = firstPath;
  while (nextPath) {
    const page: Paginated<T> = await request(nextPath, { token });
    rows.push(...page.results);
    nextPath = page.next ? toApiPath(page.next) : null;
  }
  return rows;
}

/** List platform users (admin). Hospital filter removed in API v1.4. */
export function listHospitalUsers(token: string, _hospitalId?: number | null) {
  return fetchAllPages<ApiUser>(
    `/api/users/?page_size=100&ordering=username`,
    token,
  );
}

export function getUserRequest(token: string, userId: number) {
  return request<ApiUser>(`/api/users/${userId}/`, { token });
}

export function resetUserPasswordRequest(
  token: string,
  userId: number,
  newPassword: string,
) {
  return request<{ message: string }>(`/api/users/${userId}/reset-password/`, {
    method: "POST",
    token,
    body: { new_password: newPassword },
  });
}

export function patchUserRequest(
  token: string,
  userId: number,
  data: Partial<
    Pick<
      ApiUser,
      | "first_name"
      | "last_name"
      | "email"
      | "phone"
      | "job_title"
      | "role"
      | "is_active"
    >
  >,
) {
  return request<ApiUser>(`/api/users/${userId}/`, {
    method: "PATCH",
    token,
    body: data,
  });
}

export function apiDisplayName(user: ApiUser) {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full || user.username;
}

export function formatApiDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const JOB_TITLE_LABELS: Record<string, string> = {
  RGN: "Registered General Nurse",
  OTN: "Operating Theatre Nurse",
  SCRUB_NURSE: "Scrub Nurse",
  HCA: "Health Care Assistant",
  ANAESTHETIC_NURSE: "Anaesthetic Nurse",
  OTHER: "Other",
};
