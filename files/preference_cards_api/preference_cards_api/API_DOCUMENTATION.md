# Surgical Preference Cards API: Reference

Base URL (dev): `http://127.0.0.1:8000/api/`
Format: JSON (`Content-Type: application/json`), except file uploads (`multipart/form-data`).
Interactive version of this document: `/api/docs/` (Swagger UI).

All example responses below were captured from the running API against the seeded sample data
on a fresh database. IDs are therefore the same ones you will get after
`migrate` + `seed_sample_data` on an empty database.

---

## Contents

1. [Conventions](#1-conventions)
2. [Route index](#2-route-index)
3. [Accounts and authentication](#3-accounts-and-authentication)
4. [User management](#4-user-management)
5. [Behaviour shared by all data endpoints](#5-behaviour-shared-by-all-data-endpoints)
6. [Directory: hospitals, specialties, doctors, surgeons, procedures](#6-directory)
7. [Item lists: sutures, instruments, packs](#7-item-lists)
8. [Preference cards](#8-preference-cards)
9. [Card items, notes, attachments](#9-card-items-notes-attachments)
10. [Error catalogue](#10-error-catalogue)
11. [Sample data](#11-sample-data)
12. [Security still to do](#12-security-still-to-do)

---

## 1. Conventions

### Authentication (current state)
There is **no access control yet**: every endpoint except `/auth/me/` and `/auth/logout/` works
with no credentials. Token login exists so clients can already sign in, and **when a token is
sent it is used** to fill `created_by`, `updated_by`, `uploaded_by` and `verified_by`.

```
Authorization: Token 6eac2c5183d054279d9ac8791c363c277adf515b
```

An *invalid* token header is rejected with `401` even on open endpoints. Omit the header entirely
(or call `/auth/logout/` first) if you do not want to send one.

### Pagination
Every list endpoint is paginated.

| Query param | Default | Notes |
|---|---|---|
| `page` | 1 | Out-of-range page → `404` |
| `page_size` | 25 | Max 200 |

```json
{
  "count": 3,
  "next": "http://127.0.0.1:8000/api/hospitals/?page=2&page_size=1",
  "previous": null,
  "results": [ { "...": "..." } ]
}
```

### Search, filter, order
| Param | Meaning |
|---|---|
| `?search=text` | Case-insensitive match across the resource's search fields (listed per resource) |
| `?<field>=value` | Exact filter on the fields listed per resource, e.g. `?status=ACTIVE` |
| `?ordering=field` / `?ordering=-field` | Sort ascending / descending, e.g. `?ordering=-updated_at` |

Combine freely: `/api/cards/?specialty=2&status=ACTIVE&search=hernia&ordering=-updated_at`.
An invalid filter value returns `400` (see the error format below).

### Soft delete
Every table keeps `created_at`, `updated_at`, `deleted_at`, `row_version` (bumps on each save).
`DELETE` never removes a row. It sets `deleted_at`. Deleted rows disappear from lists and
detail lookups (`404`). Extra query param on list and detail:

| `?deleted=` | Result |
|---|---|
| `exclude` (default) | Live rows only |
| `include` | Live and deleted rows |
| `only` | Deleted rows only (use this to find something to restore) |

`POST /<resource>/{id}/restore/` undoes a delete.

### Error format (every error, every endpoint)
```json
{
  "status_code": 400,
  "error": "validation_error",
  "message": "One or more fields are invalid.",
  "details": { "field_name": ["What is wrong."] }
}
```
`details` appears only for validation errors. Non-field problems appear under `non_field_errors`.
All error codes are in [section 10](#10-error-catalogue).

### Formats
Dates `YYYY-MM-DD`. Timestamps ISO-8601 with offset (server zone `Africa/Harare`, +02:00).
Phone numbers are text (leading zeros preserved). Trailing slashes are required on all URLs.

---

## 2. Route index

| Method | URL | Purpose |
|---|---|---|
| POST | `/auth/register/` | Create an account (returns a token) |
| POST | `/auth/login/` | Sign in with username or email |
| POST | `/auth/logout/` | Invalidate the caller's token (token required) |
| GET / PATCH | `/auth/me/` | Own profile (token required) |
| POST | `/auth/change-password/` | Change password (proves old password) |
| GET | `/users/` | List users |
| GET / PATCH / DELETE | `/users/{id}/` | Read, edit, deactivate a user |
| POST | `/users/{id}/reset-password/` | Admin password reset |
| GET / POST | `/hospitals/` | List, create |
| GET / PUT / PATCH / DELETE | `/hospitals/{id}/` | Read, replace, edit, soft-delete |
| POST | `/hospitals/{id}/restore/` | Undo delete |
| GET / POST | `/specialties/` ; `/specialties/{id}/` ; `…/restore/` | as above |
| GET / POST | `/doctors/` ; `/doctors/{doctor_id}/` ; `…/restore/` | as above |
| GET / POST | `/surgeons/` ; `/surgeons/{id}/` ; `…/restore/` | as above |
| GET / POST | `/procedures/` ; `/procedures/{id}/` ; `…/restore/` | as above |
| GET / POST | `/sutures/` ; `/sutures/{suture_id}/` ; `…/restore/` | as above |
| GET / POST | `/instruments/` ; `/instruments/{instrument_id}/` ; `…/restore/` | as above |
| GET / POST | `/packs/` ; `/packs/{pack_id}/` ; `…/restore/` | as above |
| GET / POST | `/cards/` | List (compact), create (optionally with items and notes) |
| GET / PUT / PATCH / DELETE | `/cards/{id}/` | Full card, update, soft-delete |
| POST | `/cards/{id}/verify/` | Mark verified and active |
| POST | `/cards/{id}/archive/` | Retire the card |
| POST | `/cards/{id}/restore/` | Undo delete |
| GET / POST | `/card-items/` ; `/card-items/{card_item_id}/` ; `…/restore/` | Items on cards |
| GET / POST | `/card-notes/` ; `/card-notes/{id}/` ; `…/restore/` | Starred notes |
| GET / POST | `/card-attachments/` ; `/card-attachments/{id}/` ; `…/restore/` | File uploads |
| GET | `/` | Route index (this API root) |
| GET | `/docs/`, `/schema/` | Swagger UI, OpenAPI schema |

The primary-key field name follows your models: `id` for most tables, but `doctor_id`,
`suture_id`, `instrument_id`, `pack_id` and `card_item_id` where the model defines them.
In URLs the value is always just the number.

---

## 3. Accounts and authentication

### POST `/auth/register/`: create an account
No token needed. Signs the new user in immediately.

**Body**

| Field | Required | Notes |
|---|---|---|
| `username` | yes | Unique (letters, digits, `@ . + - _`) |
| `password` | yes | Django rules: 8+ chars, not too common, not all digits, not similar to username |
| `password_confirm` | yes | Must equal `password` |
| `email` | no | Unique if supplied (case-insensitive) |
| `first_name`, `last_name`, `phone` | no | |
| `job_title` | no | `RGN`, `OTN`, `SCRUB_NURSE`, `HCA`, `ANAESTHETIC_NURSE`, `OTHER` |
| `role` | no | `ADMIN`, `EDITOR`, `VIEWER` (default `VIEWER`) |
| `hospital` | no | Hospital ID (must exist and be live) |

```json
{
  "username": "nurse_grace", "password": "Sterile#Field9", "password_confirm": "Sterile#Field9",
  "email": "grace@example.org", "first_name": "Grace", "last_name": "Chuma",
  "job_title": "OTN", "hospital": 1
}
```

**201 Created**
```json
{
  "message": "Account created.",
  "token": "44f08db5b03e19f3fd572b3392fd6423540156c3",
  "user": {
    "id": 6, "username": "nurse_grace", "first_name": "Grace", "last_name": "Chuma",
    "email": "grace@example.org", "phone": "", "job_title": "OTN", "role": "VIEWER",
    "can_edit": false, "hospital": 1, "hospital_name": "Parirenyatwa Group of Hospitals",
    "must_change_password": false, "is_active": true,
    "date_joined": "2026-09-30T20:38:46.141382+02:00", "last_login": null
  }
}
```
Self-registered accounts have `must_change_password: false`. Passwords are hashed and never returned.

**400 errors**

| Cause | `details` |
|---|---|
| Passwords differ | `{"password_confirm": ["Passwords do not match."]}` |
| Weak password | `{"password": ["This password is too common.", "This password is entirely numeric."]}` |
| Username taken | `{"username": ["A user with that username already exists."]}` |
| Email taken | `{"email": ["A user with this email already exists."]}` |
| Missing field | `{"username": ["This field is required."]}` |
| Bad hospital | `{"hospital": ["Invalid pk \"99\" - object does not exist."]}` |

> While security is off, `role` may be chosen at registration. Restrict this before go-live.

---

### POST `/auth/login/`: sign in
**Body**: `{"username": "editor_tendai", "password": "Theatre#2026"}`
`username` accepts the username **or** the email address.

**200 OK**
```json
{
  "message": "Login successful.",
  "token": "6eac2c5183d054279d9ac8791c363c277adf515b",
  "must_change_password": false,
  "user": {
    "id": 2, "username": "editor_tendai", "first_name": "Tendai", "last_name": "Mufunde",
    "email": "editor_tendai@example.org", "phone": "+263771000002", "job_title": "OTN",
    "role": "EDITOR", "can_edit": true, "hospital": 1,
    "hospital_name": "Parirenyatwa Group of Hospitals", "must_change_password": false,
    "is_active": true, "date_joined": "2026-09-30T20:37:52+02:00",
    "last_login": "2026-09-30T20:37:58+02:00"
  }
}
```
Each user has one token; logging in again returns the same one until it is revoked (logout or
password change). If `must_change_password` is `true`, the client should send the user to
the change-password screen.

| Status | Body | When |
|---|---|---|
| 401 | `{"status_code":401,"error":"authentication_failed","message":"Invalid username or password."}` | Unknown user or wrong password |
| 403 | `{"status_code":403,"error":"account_disabled","message":"This account has been deactivated. Contact an administrator."}` | Correct password, but `is_active` is false |
| 400 | `details: {"password": ["This field is required."]}` | Missing field |

---

### POST `/auth/logout/`: sign out
Needs `Authorization: Token <key>`. Deletes the token.

**200** `{"message": "Logged out. The token is no longer valid."}`
**401** `{"status_code":401,"error":"not_authenticated","message":"Authentication credentials were not provided."}`
(or `"message":"Invalid token."` with code `authentication_failed` for a wrong/expired token)

---

### GET `/auth/me/`: own profile
Needs a token. **200**: the same `user` object as in the login response.
**401** as above when no/invalid token.

### PATCH `/auth/me/`: edit own profile
Needs a token. Editable: `first_name`, `last_name`, `email`, `phone`, `job_title`.
`role`, `hospital` and `is_active` are ignored here (use `/users/{id}/`).
**200**: updated user. **400**: e.g. `{"email": ["A user with this email already exists."]}`.

---

### POST `/auth/change-password/`: change password
No token needed. The old password proves identity. Clears `must_change_password`, revokes the
old token and issues a fresh one.

**Body**
```json
{
  "username": "nurse_grace", "old_password": "Sterile#Field9",
  "new_password": "Brand#New2027x", "new_password_confirm": "Brand#New2027x"
}
```
**200**
```json
{ "message": "Password changed.", "token": "099758b683fe8eb82ff2479a7858b02846a0a93c" }
```
| Status | When |
|---|---|
| 401 `"Invalid username or old password."` | Unknown user / wrong old password |
| 400 `{"new_password_confirm": ["Passwords do not match."]}` | Confirmation differs |
| 400 `{"new_password": ["This password is too short. It must contain at least 8 characters."]}` | Fails password rules |

---

## 4. User management

Users are created through `/auth/register/` (so `POST /users/` returns `405 method_not_allowed`).
`PUT` is not offered. Use `PATCH`.

| Method | URL | Result |
|---|---|---|
| GET | `/users/` | Paginated list. Filters: `hospital`, `role`, `job_title`, `is_active`. Search: `username`, `first_name`, `last_name`, `email` |
| GET | `/users/{id}/` | One user |
| PATCH | `/users/{id}/` | Editable: `first_name`, `last_name`, `email`, `phone`, `job_title`, `role`, `hospital`, `is_active`. Read-only: `username`, `must_change_password`, dates |
| DELETE | `/users/{id}/` | **Deactivates** (`is_active=false`, token revoked). `204 No Content`. Reactivate with `PATCH {"is_active": true}` |
| POST | `/users/{id}/reset-password/` | Body `{"new_password": "..."}`. Sets it, forces `must_change_password=true`, revokes the token. `200 {"message": "Password reset for viewer_rudo. They must change it at next login."}` |

Errors: `404` unknown user, `400` invalid role/hospital/email/weak password.

---

## 5. Behaviour shared by all data endpoints

These apply to hospitals, specialties, doctors, surgeons, procedures, sutures, instruments,
packs, cards, card-items, card-notes and card-attachments.

| Request | Success | Notes |
|---|---|---|
| `GET /<res>/` | `200` paginated list | Search / filter / order as described above |
| `POST /<res>/` | `201` with the created object | Housekeeping fields (`created_at`, `updated_at`, `deleted_at`, `row_version`) are read-only |
| `GET /<res>/{id}/` | `200` | `404` if missing or deleted |
| `PUT /<res>/{id}/` | `200` | Full replace: required fields must be sent |
| `PATCH /<res>/{id}/` | `200` | Partial update. `row_version` increases |
| `DELETE /<res>/{id}/` | `204` no body | Soft delete. `409` if other live rows still depend on it (message lists what); `400` if already deleted |
| `POST /<res>/{id}/restore/` | `200` with the object | `400` "This record is not deleted…"; `404` unknown id |

Foreign-key inputs (e.g. `specialty`, `surgeon`, `card`) only accept **live** rows. Sending a
missing or deleted ID gives `400 {"specialty": ["Invalid pk \"99\" - object does not exist."]}`.

Typical validation messages: `"This field is required."`, `"This field may not be blank."`,
`"Ensure this field has no more than 150 characters."`, `"\"XYZ\" is not a valid choice."`,
`"Date has wrong format. Use one of these formats instead: YYYY-MM-DD."`.

Dependency blocks on delete (`409`):

| Deleting | Blocked while |
|---|---|
| Hospital | it has active users |
| Specialty | it has live doctors or procedures |
| Doctor | it has a live surgeon profile |
| Surgeon | it has live cards |
| Procedure | it has live cards |
| Suture / instrument / pack | it is used on a live card |

```json
{ "status_code": 409, "error": "conflict",
  "message": "Cannot delete: still in use by 1 doctor, 3 procedures." }
```

---

## 6. Directory

### Hospitals: `/hospitals/`
| Field | Type | Notes |
|---|---|---|
| `id` | int | read-only |
| `name` | string(150) | **required** |
| `short_code` | string(20) | **required**, unique |
| `city` | string(50) | optional |
| `is_active` | bool | default `true` |

Filters `is_active`, `city` · Search `name`, `short_code`, `city`

```json
{ "id": 2, "created_at": "2026-09-30T20:38:34.384295+02:00", "updated_at": "2026-09-30T20:38:34.384317+02:00",
  "deleted_at": null, "row_version": 1, "name": "Mpilo Central Hospital", "short_code": "MCH",
  "city": "Bulawayo", "is_active": true }
```
Error: duplicate code → `400 {"short_code": ["hospital with this short code already exists."]}`.

### Specialties: `/specialties/`
Fields: `name` **required** (unique, 100), `short_code` (20), `sort_order` (int, default 0), `is_active`.
Filters `is_active` · Search `name`, `short_code`. Default order: `sort_order`, `name`.
Error: duplicate name → `{"name": ["specialty with this name already exists."]}`.

### Doctors: `/doctors/`
Personal and contact details. Primary key `doctor_id`.

| Field | Notes |
|---|---|
| `title` | `Prof`, `Dr`, `Mr` … (20) |
| `doctor_name` | **required** (100) |
| `specialty` | **required**, specialty ID |
| `sub_specialty`, `practice_or_hospital`, `address`, `city` | optional text |
| `phone_primary`, `phone_secondary` | optional text |
| `is_group_practice` | bool |
| `notes` | optional text |
| *read-only extras* | `specialty_name`, `is_surgeon` |

Filters `specialty`, `city`, `is_group_practice` · Search `doctor_name`, `title`, `sub_specialty`, `practice_or_hospital`, `city`

### Surgeons: `/surgeons/`
Surgical details for a doctor who operates (one surgeon profile per doctor).

| Field | Notes |
|---|---|
| `doctor` | **required**, doctor ID. One-to-one: `{"doctor": ["surgeon with this doctor already exists."]}` if taken |
| `display_name` | **required**, as written on the card (`Mr Machawira`) |
| `glove_size` | e.g. `7½` |
| `general_notes` | habits that apply to every card |
| *read-only extras* | `doctor_name`, `specialty` (id), `specialty_name` |

Filters `doctor`, `specialty` · Search `display_name`, `doctor_name`

### Procedures: `/procedures/`
Stored once under a specialty and shared by every surgeon.

| Field | Notes |
|---|---|
| `specialty` | **required** |
| `name` | **required** (150). The pair (specialty, name) is unique |
| `aliases` | optional, `;`-separated alternative names |
| *read-only extra* | `specialty_name` |

Filters `specialty` · Search `name`, `aliases`

```
GET /api/procedures/?search=VV strip
```
```json
{ "count": 1, "next": null, "previous": null, "results": [
  { "id": 9, "specialty_name": "Vascular Surgery", "name": "Varicose vein stripping",
    "aliases": "VV strip; varicose vein stripping", "specialty": 4,
    "created_at": "…", "updated_at": "…", "deleted_at": null, "row_version": 1 } ] }
```
Duplicate → `400 {"non_field_errors": ["The fields specialty, name must make a unique set."]}`.
This also fires if a *soft-deleted* procedure already has that name. Restore it instead.

---

## 7. Item lists

What a card can call for (no stock quantities). Each response also carries a read-only `label`,
a human-readable description.

### Sutures: `/sutures/` (key `suture_id`)
| Field | Notes |
|---|---|
| `material` | **required** (`Silk`, `Nylon`, `Prolene` …) |
| `size` | **required** (`0`, `2/0`, `3/0` …) |
| `item_type` | **required** (`Tie`, `Needled suture` …) |
| `needle_type` | `Cutting`, `Round body`, `None` … |
| `needle_length_mm` | integer ≥ 0 |
| `is_absorbable` | bool |
| `expiry_date` | date |

Filters `material`, `size`, `item_type`, `needle_type`, `is_absorbable` · Search same text fields
Example label: `"2/0 Vicryl Needled suture Round body 26mm"`.

### Instruments: `/instruments/` (key `instrument_id`)
Fields: `name` **required**, `category` (Forceps, Retractor, Clip), `type_or_variant` (Curved,
Self-retaining), `is_reusable` (default true), `condition_status` (Sterile, In use, Needs repair),
`last_sterilized_date`.
Filters `category`, `is_reusable`, `condition_status` · Search `name`, `category`, `type_or_variant`

### Packs: `/packs/` (key `pack_id`)
Fields: `pack_name` **required**, `pack_type` (Instrument tray, Gown pack), `contents_description`,
`is_reusable` (default false), `sterile_until`, `last_sterilized_date`.
Filters `pack_type`, `is_reusable` · Search `pack_name`, `pack_type`, `contents_description`

---

## 8. Preference cards

One surgeon's preferences for one procedure.

**Rule:** only **one live card per surgeon + procedure**. Archived and soft-deleted cards don't count,
so a new version can be created after archiving the old one.

### GET `/cards/`: compact list
Filters: `surgeon`, `procedure`, `specialty`, `status` (`DRAFT`, `ACTIVE`, `UNDER_REVIEW`, `ARCHIVED`),
`anaesthesia_type` (`GA`, `SPINAL`, `EPIDURAL`, `LOCAL`, `SEDATION`, `REGIONAL`, `OTHER`),
`compiled_by`, `verified_by`, `review_due_before=YYYY-MM-DD`, `review_due_after=YYYY-MM-DD`.
Search: card title, procedure name and aliases, surgeon display name, doctor name.
Default order: surgeon name, procedure name.

```
GET /api/cards/?page_size=2
```
```json
{
  "count": 10,
  "next": "http://127.0.0.1:8000/api/cards/?page=2&page_size=2",
  "previous": null,
  "results": [
    { "id": 9, "title": "TURP", "card_title": "", "surgeon": 5, "surgeon_name": "Dr Dube",
      "procedure": 10, "procedure_name": "TURP", "specialty": 5, "specialty_name": "Urology",
      "status": "ACTIVE", "version_no": 2, "anaesthesia_type": "SPINAL",
      "card_date": "2026-08-31", "review_due_on": "2027-02-27", "item_count": 2,
      "updated_at": "2026-09-30T20:38:36.532447+02:00" },
    { "id": 4, "title": "Inguinal hernia repair (mesh)", "surgeon_name": "Dr Ncube",
      "status": "UNDER_REVIEW", "item_count": 5, "review_due_on": "2026-09-27", "…": "…" }
  ]
}
```
Useful queries: cards overdue for review `?review_due_before=2026-09-30`; one surgeon's live cards
`?surgeon=2&status=ACTIVE`; free-text `?search=lap chole`.

### GET `/cards/{id}/`: full card
Includes computed `title` (card title, else procedure name), `effective_glove_size` (card's, else
the surgeon's), and nested `items`, `notes`, `attachments` (live rows only; each item also carries
`item_label` and the full `item_detail` of the suture / instrument / pack). Trimmed example, card 3:

```json
{
  "id": 3,
  "title": "Laparoscopic cholecystectomy",
  "effective_glove_size": "8",
  "surgeon": 2, "surgeon_name": "Dr Ncube",
  "procedure": 4, "procedure_name": "Laparoscopic cholecystectomy",
  "specialty": 2, "specialty_name": "General Surgery",
  "card_title": "", "patient_position": "Supine, reverse Trendelenburg 20°, tilt left",
  "position_aids": "Gel pads, foot board", "anaesthesia_type": "GA", "glove_size": "",
  "skin_prep": "Chlorhexidine 2% alcoholic", "diathermy_settings": "Monopolar 30W cut / 30W coag",
  "estimated_minutes": 75, "status": "ACTIVE", "version_no": 2,
  "card_date": "2026-08-31", "review_due_on": "2027-01-28",
  "compiled_by": 2, "compiled_by_name": "Tendai Mufunde",
  "verified_by": 1, "verified_by_name": "Chipo Mandaza", "verified_at": "2026-09-10T20:38:36+02:00",
  "created_by": 2, "updated_by": 2,
  "created_at": "…", "updated_at": "…", "deleted_at": null, "row_version": 1,
  "items": [
    { "card_item_id": 9, "card": 3, "item_source": "pack", "item_id": 3, "quantity": 1,
      "item_notes": "", "item_label": "Laparoscopy set",
      "item_detail": { "pack_id": 3, "pack_name": "Laparoscopy set", "pack_type": "Instrument tray",
                       "contents_description": "Trocars, graspers, scope cover", "is_reusable": true,
                       "sterile_until": "2026-10-15", "last_sterilized_date": "2026-09-15", "…": "…" } }
  ],
  "notes": [
    { "id": 4, "card": 3, "note_type": "WARNING", "body": "Latex allergy protocol if flagged on theatre list.",
      "sort_order": 1, "created_by": 2 }
  ],
  "attachments": []
}
```

### POST `/cards/`: create
| Field | Required | Notes |
|---|---|---|
| `surgeon` | yes | Surgeon ID |
| `procedure` | yes | Procedure ID |
| `card_title`, `patient_position`, `position_aids`, `skin_prep`, `diathermy_settings` | no | text |
| `anaesthesia_type` | no | choices above |
| `glove_size` | no | only when different from the surgeon's |
| `estimated_minutes` | no | integer |
| `status` | no | default `DRAFT` |
| `version_no` | no | default 1 |
| `card_date`, `review_due_on` | no | dates |
| `compiled_by` | no | user ID |
| `items` | no | array of `{item_source, item_id, quantity, item_notes}`, **create only** |
| `notes` | no | array of `{note_type, body, sort_order}`, **create only** |

`item_source` is `suture`, `instrument` or `pack`; `item_id` is the ID in that table.
`note_type`: `GENERAL`, `WARNING`, `PREFERENCE`, `POSITIONING`, `POST_OP`.
Read-only (set by the server): `created_by`, `updated_by` (from the token, else `null`),
`verified_by`, `verified_at`.

```json
{
  "surgeon": 1, "procedure": 3, "anaesthesia_type": "GA", "patient_position": "Supine",
  "items": [ { "item_source": "pack", "item_id": 1, "quantity": 1 } ],
  "notes": [ { "note_type": "WARNING", "body": "Check for nasal packing allergy." } ]
}
```
**201 Created**: the full card (same shape as GET detail), e.g.
```json
{ "id": 11, "title": "Septoplasty", "status": "DRAFT", "version_no": 1, "surgeon": 1, "procedure": 3,
  "created_by": null, "row_version": 1,
  "items": [ { "card_item_id": 45, "item_source": "pack", "item_id": 1, "quantity": 1,
               "item_label": "Major instrument tray" } ],
  "notes": [ { "id": 14, "note_type": "WARNING", "body": "Check for nasal packing allergy.", "sort_order": 1 } ] }
```
Creation is atomic: if any item or note is invalid, nothing is saved.

**400 errors**
```json
{ "status_code": 400, "error": "validation_error", "message": "One or more fields are invalid.",
  "details": { "non_field_errors": [
    "A live card already exists for this surgeon and procedure (card #3). Edit that card, or archive it first." ] } }
```
Others: `{"surgeon": ["This field is required."]}`; `{"items": {"0": {"item_id": ["No pack with ID 9999."]}}}` (errors are keyed by the position of the bad item in the array, starting at 0);
`{"anaesthesia_type": ["\"XYZ\" is not a valid choice."]}`.

### PUT / PATCH `/cards/{id}/`
Returns the full updated card. `updated_by` is set when a token is sent.
Sending `items` or `notes` here → `400 {"non_field_errors": ["Items and notes can only be sent when creating a card. To change them use /api/card-items/ and /api/card-notes/."]}`.
Moving a card back from `ARCHIVED` to a live status is refused with the "live card already exists"
message when another live card holds that surgeon + procedure.

### DELETE `/cards/{id}/`
`204`. The card and its children disappear from all default lists. Nothing is destroyed.

### POST `/cards/{id}/restore/`
`200` full card. `409` if another live card now owns the surgeon + procedure:
`"Cannot restore: card #12 is now the live card for this surgeon and procedure. Archive it first."`

### POST `/cards/{id}/verify/`
Marks the card as checked: `status → ACTIVE`, `verified_at = now`, `verified_by`.
* With a token: the signed-in user is the verifier, no body needed.
* Without a token: send `{"verified_by": <user id>}`.

```json
{ "id": 2, "status": "ACTIVE", "verified_by": 1, "verified_by_name": "Chipo Mandaza",
  "verified_at": "2026-09-30T20:38:55.794453+02:00", "…": "full card" }
```
`400` when no verifier supplied: `{"verified_by": "Required when the request has no auth token."}`;
`400` for an unknown/inactive user; `400` `"Archived cards cannot be verified. Un-archive it first."`

### POST `/cards/{id}/archive/`
Sets `status = ARCHIVED` and returns the full card. Frees the surgeon + procedure slot.
`400 "This card is already archived."`

---

## 9. Card items, notes, attachments

These three lists only show rows whose parent card is live.

### Card items: `/card-items/` (key `card_item_id`)
| Field | Notes |
|---|---|
| `card` | **required** |
| `item_source` | **required**: `suture`, `instrument`, `pack` |
| `item_id` | **required**: ID in the matching table; must exist and be live |
| `quantity` | integer ≥ 1 (default 1). The only quantity in the system |
| `item_notes` | optional (255) |
| *read-only* | `item_label`, `item_detail` |

Filters `card`, `item_source`, `item_id` · Search `item_notes`

```
POST /api/card-items/   {"card": 3, "item_source": "pack", "item_id": 9999, "quantity": 1}
→ 400 {"details": {"item_id": ["No pack with ID 9999."]}}

POST /api/card-items/   {"card": 3, "item_source": "pack", "item_id": 1, "quantity": 0}
→ 400 {"details": {"quantity": ["Ensure this value is greater than or equal to 1."]}}
```
`item_source` value not in the list → `{"item_source": ["\"widget\" is not a valid choice."]}`.

### Card notes: `/card-notes/`
The starred lines shown in the warning box at the top of a printed card.
Fields: `card` **required**, `body` **required**, `note_type` (default `GENERAL`), `sort_order` (default 0).
`created_by` is set from the token when sent.
Filters `card`, `note_type` · Search `body`

```
POST /api/card-notes/  {"card": 3, "note_type": "POST_OP", "body": "Dressing before transfer."}
→ 201 {"id": 15, "card": 3, "note_type": "POST_OP", "body": "Dressing before transfer.",
       "sort_order": 0, "created_by": null, "created_at": "…", "…": "…"}
```

### Card attachments: `/card-attachments/`
Upload with **`multipart/form-data`**.

| Field | Notes |
|---|---|
| `card` | **required**, cannot be changed later |
| `file` | **required**, cannot be replaced later (delete and re-upload) |
| `caption` | optional |
| `attachment_type` | `POSITIONING`, `TRAY_LAYOUT`, `ORIGINAL_CARD`, `OTHER` (default) |
| *server-filled* | `file_name`, `mime_type`, `file_size_bytes`, `uploaded_by` |

Filters `card`, `attachment_type` · Search `file_name`, `caption`

```bash
curl -X POST http://127.0.0.1:8000/api/card-attachments/ \
  -F card=3 -F file=@tray.png -F caption="Tray layout" -F attachment_type=TRAY_LAYOUT
```
**201**
```json
{ "id": 3, "card": 3, "file": "http://127.0.0.1:8000/media/card_attachments/2026/09/tray.png",
  "file_name": "tray.png", "mime_type": "image/png", "file_size_bytes": 12,
  "caption": "Tray layout", "attachment_type": "TRAY_LAYOUT", "uploaded_by": null,
  "created_at": "…", "updated_at": "…", "deleted_at": null, "row_version": 1 }
```
`PATCH` may change `caption` and `attachment_type` only. Sending `file` or `card` →
`400 "The file and card cannot be changed. Delete this attachment and upload a new one."`
Missing file → `{"file": ["No file was submitted."]}`. Deleting is soft; the file stays on disk.
Uploaded files are served from `/media/…` while `DEBUG` is on.

---

## 10. Error catalogue

| HTTP | `error` | When |
|---|---|---|
| 400 | `validation_error` | Invalid or missing fields, bad filter value, business-rule breach (duplicate live card, bad item reference, deleting an already-deleted row, restoring a live row) |
| 401 | `not_authenticated` | `/auth/me/` or `/auth/logout/` called with no token |
| 401 | `authentication_failed` | Wrong username/password, wrong old password, or invalid token header |
| 403 | `account_disabled` | Login with the correct password for a deactivated user |
| 404 | `not_found` | Unknown id, deleted row (unless `?deleted=include`), page out of range |
| 405 | `method_not_allowed` | e.g. `POST /users/`, `PUT /users/{id}/` |
| 409 | `conflict` | Delete blocked by live dependents; restore would duplicate a live card; database uniqueness breach |
| 415 | `unsupported_media_type` | Body sent in an unsupported content type |
| 500 | (Django default) | Unexpected server error |

There is no `403 permission_denied` yet because no permissions are enforced.

---

## 11. Sample data

```bash
python manage.py seed_sample_data            # add (safe to re-run; existing rows are updated, not duplicated)
python manage.py seed_sample_data --reset    # delete EVERYTHING, then reload
```
All names are fictional. Dates are relative to the day you run it.

| Loaded | Count | Examples |
|---|---|---|
| Hospitals | 3 | 1 Parirenyatwa Group (PGH), 2 Mpilo Central (MCH), 3 Mutare Provincial (MPH) |
| Users | 5 | `superadmin`, `admin_chipo` (ADMIN), `editor_tendai` (EDITOR), `scrub_farai` (EDITOR), `viewer_rudo` (VIEWER). **Password for all: `Theatre#2026`** |
| Specialties | 16 | 1 ENT Surgery, 2 General Surgery, 3 Orthopaedic, 4 Vascular, 5 Urology, 6 O&G … |
| Doctors / surgeons | 8 / 6 | Surgeon 1 Mr Machawira (ENT), 2 Dr Ncube (General), 3 Prof Moyo (Ortho), 4 Mr Chikwanha (Vascular), 5 Dr Dube (Urology), 6 Dr Sithole (O&G). Doctors 7 and 8 have no surgeon profile |
| Procedures | 23 | 1 Tonsillectomy, 2 Grommet insertion, 3 Septoplasty, 4 Lap cholecystectomy, 5 Open appendicectomy, 9 Varicose vein stripping, 10 TURP, 12 Caesarean section … |
| Sutures | 10 | 1 2/0 Silk Tie … 4 2/0 Vicryl … 9 1 PDS II |
| Instruments | 13 | 1 Dissecting forceps (toothed) … 10 Boyle-Davis mouth gag |
| Packs | 7 | 1 Major instrument tray, 2 Minor tray, 3 Laparoscopy set … |
| Cards | 10 | see below |
| Notes / items / attachments | ~20 / ~45 / 2 | Attachments are 1×1 placeholder images |

| Card | Surgeon · Procedure | Status | Shows off |
|---|---|---|---|
| 1 | Machawira · Tonsillectomy | ACTIVE | verified, review **overdue**, attachment |
| 2 | Machawira · Grommet insertion | DRAFT | not yet verified, try `/verify/` |
| 3 | Ncube · Laparoscopic cholecystectomy | ACTIVE | items from all three item lists, notes |
| 4 | Ncube · Inguinal hernia repair | UNDER_REVIEW | review overdue |
| 5 | Ncube · Open appendicectomy (v1) | ARCHIVED | old version kept next to… |
| 6 | Ncube · Open appendicectomy (v2) | ACTIVE | …its live replacement |
| 7 | Moyo · Total hip replacement | ACTIVE | lots of items, attachment |
| 8 | Chikwanha · Varicose vein stripping | ACTIVE | alias search (`?search=VV strip`) |
| 9 | Dube · TURP | ACTIVE | |
| 10 | Sithole · Caesarean section | ACTIVE | |

Quick walk-through:
```bash
curl "http://127.0.0.1:8000/api/cards/?status=ACTIVE&search=hernia"
curl  http://127.0.0.1:8000/api/cards/3/
curl -X POST http://127.0.0.1:8000/api/cards/2/verify/ -H "Content-Type: application/json" -d '{"verified_by":1}'
curl -X DELETE http://127.0.0.1:8000/api/specialties/1/        # → 409, still in use
```

---

## 12. Security still to do

Intentionally left open for this phase:

* **Permissions**: every endpoint is `AllowAny`. The model's roles (`ADMIN` create/manage users and restore, `EDITOR` create and update cards, `VIEWER` read only) are stored but not enforced.
* `role` and `hospital` can be chosen at self-registration and edited through `PATCH /users/{id}/`; `reset-password` is open.
* **Hospital scoping**: users are not yet limited to their own hospital's data.
* Token auth has no expiry; there is no rate limiting or lockout on login.
* `CORS_ALLOW_ALL_ORIGINS = True`, `DEBUG = True`, `ALLOWED_HOSTS = *`, development `SECRET_KEY`.
* Uploads have no type or size limits and are served by Django's dev static handler.
* Enforce `must_change_password` (the flag is returned at login, but nothing blocks API use).

The code is arranged so these can be added later without reshaping endpoints: set
`DEFAULT_PERMISSION_CLASSES` and add per-viewset permission classes based on `user.role`.
