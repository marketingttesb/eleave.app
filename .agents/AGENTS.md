# e-Leave App — Agent Knowledge Base

## Project Overview
Desktop leave management app for **Tien Tien** (Malaysian company). Staff apply for leave, HODs approve/reject, HR classifies and manages. Runs as a Tauri v2 desktop app.

## Tech Stack
| Layer | Tech |
|-------|------|
| Desktop shell | **Tauri v2** (Rust, tray-icon) |
| Frontend | **React 19** (no CSS framework, inline styles) |
| Build | **Vite 7** |
| Backend | **Supabase** (Postgres + Auth + Realtime + RLS) |
| Libraries | date-fns v4, flatpickr, react-flatpickr |
| Package manager | npm |
| App identifier | `com.tientien.eleaveapp` v0.1.3 |

## Supabase Access
- **Project ref**: `hewfbmshksshvvltvyyu`
- **URL**: `https://hewfbmshksshvvltvyyu.supabase.co`
- **Anon key**: `sb_publishable_TpfeIOJUrkSV2XMMsZXAIA_RiyeGMBP`
- **CLI**: linked locally, MCP configured for opencode
- **MCP config**: `~/.config/opencode/opencode.jsonc` — remote MCP server at `https://mcp.supabase.com/mcp?project_ref=hewfbmshksshvvltvyyu`
- **Migrations**: in `supabase/migrations/` — push with `supabase db push --include-all`
- **RLS**: enabled on all tables; INSERT policies allow authenticated users on most tables

## Project Structure
```
D:\Dev\e-leave\eleave.app\
├── .agents/AGENTS.md              # This file
├── .env                           # Supabase URL + anon key
├── index.html                     # Entry point (Tauri + React)
├── package.json                   # Dependencies & scripts
├── vite.config.js                 # Vite/Tauri dev config
├── scheme.sql                     # Reference DB schema
├── Build.txt                      # Tauri build signing commands
├── todo.txt                       # Completed features checklist
├── supabase/migrations/           # 4 migration files
├── src/
│   ├── main.jsx                   # React entry point
│   ├── App.jsx                    # Root: auth, routing, layout
│   ├── App.css                    # Global styles (minimal)
│   ├── components/
│   │   ├── TopBanner.jsx          # Header: logo, title, user info, logout
│   │   ├── Topbar.jsx             # Nav bar with dropdowns + unread badge
│   │   └── MyMsg.jsx              # Notification inbox with navigation
│   └── pages/                     # 13 page components
├── src-tauri/
│   ├── tauri.conf.json            # Tauri configuration
│   ├── Cargo.toml                 # Rust dependencies
│   ├── src/                       # Rust source (tray, single-instance)
│   ├── icons/
│   └── capabilities/              # Tauri v2 capability files
└── public/
    ├── logo.png                   # Company logo
    └── app-logo.png
```

## User Roles
| Role | DB Flag | Access |
|------|---------|--------|
| Staff | `is_staff` (default true) | Apply leave, view history, dashboard |
| HOD | `is_superior` | Approve/reject subordinate leaves |
| HR | `is_hr` | Manage all staff, leave, depts, reports |
| Super Admin | `is_super_admin` | Access control (role assignment) |

## Database Schema (8 tables)

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name` | text NOT NULL | |
| `position` | text nullable | Job title |
| `email` | text nullable | Cached copy |
| `department_id` | bigint | FK → `departments(id)` ON DELETE SET NULL |
| `report_to` | uuid | FK → `profiles(id)` (superior) |
| `working_days_type` | text | CHECK '5_days' or '6_days', default '5_days' |
| `staff_status` | text | CHECK 'Active' or 'Resigned', default 'Active' |
| `is_staff`, `is_superior`, `is_hr`, `is_super_admin` | boolean | flags |

### `departments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | GENERATED ALWAYS AS IDENTITY |
| `name` | text NOT NULL UNIQUE | |
| `created_at` | timestamptz | default now() |

### `leave_applications`
| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `staff_id` | uuid NOT NULL | FK → `profiles(id)` ON DELETE CASCADE |
| `leave_date` | date NOT NULL | |
| `duration_type` | text NOT NULL | 'Full Day', 'Half Day AM', 'Half Day PM' |
| `duration_value` | numeric(2,1) NOT NULL | 1.0 or 0.5 |
| `reason` | text NOT NULL | |
| `leave_type` | text NOT NULL | Staff's choice or final classification |
| `status` | text | CHECK 'Pending'/'Approved'/'Rejected', default 'Pending' |
| `approver_id` | uuid nullable | FK → `profiles(id)` — assigned HOD |
| `needs_hr_review` | boolean | default false — set true when HOD approves |
| `processed_by` | uuid nullable | FK → `profiles(id)` |
| `processed_at` | timestamptz nullable | |

### `leave_eligibility`
| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `uid` | uuid NOT NULL | FK → `profiles(id)` ON DELETE CASCADE |
| `year` | integer NOT NULL | UNIQUE with uid |
| `eligibility` | real nullable | Annual leave entitlement |
| `balance` | real nullable | Remaining annual leave |
| `mc_eligibility` | real | default 14 |
| `mc_balance` | real | default 14 |

### `leave_types`, `leave_durations`
Reference/lookup tables with `type_name`/`duration_name` and `duration_value`.

### `public_holidays`
| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `holiday_date` | date NOT NULL UNIQUE | |
| `holiday_name` | text NOT NULL | |

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | default uuid_generate_v4() |
| `user_id` | uuid | FK → `auth.users(id)` ON DELETE CASCADE |
| `title`, `message` | text NOT NULL | |
| `type` | text | 'application', 'approval', 'manual_change' |
| `is_read` | boolean | default false |
| `related_user_id` | uuid nullable | For navigation target |
| `related_created_at` | timestamptz nullable | For navigation target |
| `created_at` | timestamptz | default now() |

## Leave Approval Workflow (3-step)

1. **Staff applies** → `status: 'Pending'`, `approver_id` = staff's `report_to`
2. **HOD approves/rejects** via `LeaveApproval.jsx`
   - **Approve** → `status: 'Approved'`, `needs_hr_review: true`, `leave_type` unchanged, **no balance deduction**
   - **Reject** → `status: 'Rejected'`, `leave_type: 'Rejected'`, `needs_hr_review: false`
3. **HR classifies** via `ManagePersonalLeave.jsx`
   - Sets final `leave_type` to **'Annual Leave'** (deducts balance) or **'Unpaid Leave'** (no deduction)
   - Clears `needs_hr_review`

**Important:** Balance deduction for Annual Leave only happens when HR classifies (not when HOD approves).

## All Pages (13)

### Staff (`is_staff`)
| Page | File | Purpose |
|------|------|---------|
| Dashboard | `src/pages/Dashboard.jsx` | Home — AL/MC eligibility/used/balance cards + upcoming public holidays table |
| Apply Leave | `src/pages/ApplyLeave.jsx` | Date range (From/To + Duration), weekend/holiday/overlap validation, confirmation step; right panel: mini dashboard + history |
| Leave History | `src/pages/LeaveHistory.jsx` | Full table of user's leaves with status badges; can delete pending |

### HOD (`is_superior`)
| Page | File | Purpose |
|------|------|---------|
| Leave Approval | `src/pages/LeaveApproval.jsx` | 3-column: (1) pending batches by applicant, (2) per-date Approve/Reject + reason, (3) dept absence overview |

### HR (`is_hr`)
| Page | File | Purpose |
|------|------|---------|
| Manage Staff | `src/pages/ManageStaff.jsx` | Staff directory with search/filter; add/edit profiles, set dept/superior/working days/eligibility/balance |
| Manage Personal Leave | `src/pages/ManagePersonalLeave.jsx` | Staff directory + leave history/eligibility; add/edit/delete records; classify pending HR review |
| Manage Departments | `src/pages/ManageDepartments.jsx` | CRUD departments (inline edit) |
| Yearly Public Holidays | `src/pages/YearlyPublicHolidays.jsx` | CRUD holidays, filterable by year |
| Daily Report | `src/pages/DailyReport.jsx` | Daily leave grouped by dept/staff; printable + CSV with BOM for Excel |
| Monthly Report | `src/pages/MonthlyReport.jsx` | Monthly report with month/year dropdown; export/print |

### Super Admin (`is_super_admin`)
| Page | File | Purpose |
|------|------|---------|
| Access Control | `src/pages/ManageAccess.jsx` | Toggle `is_superior`/`is_hr`/`is_super_admin` checkboxes; prevents removing last super admin |

### Utility (all logged-in)
| Page | File | Purpose |
|------|------|---------|
| My Messages | `src/components/MyMsg.jsx` | Notification inbox with read/unread, mark all read, click-to-navigate |
| Update Password | `src/pages/UpdatePassword.jsx` | Self-service password update via Supabase Auth |
| System Settings | `src/pages/SystemSettings.jsx` | Toggle Windows autostart (Tauri plugin) |

## ApplyLeave Date Range Logic
- `isWeekend(date)` helper:
  - `5_days` → skip Sat (6) & Sun (0)
  - `6_days` + dept name includes "Paka" → skip Fri (5)
  - `6_days` + dept name includes "Kuantan" → skip Sun (0)
- Auto-skips weekends, public holidays, overlapping dates, duplicate AM/PM slots
- Range uses `addDays` from date-fns to iterate

## Notifications System
- **Real-time**: Supabase Realtime channel subscribed for `public:notifications:{userId}` INSERT events
- **Desktop**: Tauri notification plugin (browser alert fallback)
- **Navigation by type**:
  | Type | Title | Sent To | Redirect |
  |------|-------|---------|---------|
  | `'application'` | "New Leave Request" | HOD (`report_to`) | Approval page |
  | `'approval'` | "Leave Application Processed" | Applicant (staff) | **Leave History** (always) |
  | `'hr_review'` | "HR Action Required" | All HR staff | Manage Personal Leave (target staff) |
  | `'manual_change'` | "Leave Record Adjusted" / "Leave Record Removed" | Affected staff | **Leave History** (always) |
- **Triggers**:
  - Staff applies → notification to HOD (`'application'`)
  - HOD processes → notification to applicant (`'approval'`) + ALL HR staff if any dates approved (`'hr_review'`)
  - HR adds/updates/deletes → notification to affected staff (`'manual_change'`)
  - Bundle edit → single `'manual_change'` notification for all updated records
- **Unread badge** in Topbar menu

## ManagePersonalLeave (HR Page) Features

### Bundle Edit
- Checkboxes on each leave record row for multi-select
- "Bulk Edit" button appears when records are selected
- Opens modal to set common **Leave Type** and **Status** for all selected records
- Balance adjustments calculated per-record (refunds old deductions, applies new)
- Sends **single** `manual_change` notification listing affected dates
- Works in tandem with "Show Pending Only" filter (select pending items only)

### Pending HR Review Popup
- When selecting a staff member who has pending HR review items, a modal pops up
- Buttons: **Classify Now** (filters to show pending only) or **Dismiss**
- Visual indicator (⚠️ badge) on staff directory items showing count of pending items

## Balance Management
- Stored in `leave_eligibility` (uid, year UNIQUE)
- **Annual Leave**: deducted only when HR classifies as 'Annual Leave'
- **Sick Leave (MC)**: deducted when HR creates/approves Sick Leave - MC record
- `adjustLeaveBalance(staffId, year, diffValue, isMc)` function handles creation/update/cross-year/refund
- Initial eligibility via `sync_staff_leave_eligibility` RPC on staff registration

## Tauri Desktop Features
- **Close to tray** / **Minimize to tray**: window hides instead of quitting; "running in background" notification once
- **Single instance**: subsequent launches focus existing window
- **System tray**: double-click restore; right-click Show/Quit
- **Auto-start**: enabled by default on first run (localStorage check)
- **Auto-updater**: checks GitHub releases via Tauri updater plugin (public key signing)
- **Plugins**: autostart, notification, opener, updater, single-instance, tray-icon

## Tauri Config
- Window: 800x600
- CSP: null (no restrictions)
- Build commands: `npm run dev` (dev), `npm run build` (production)
- Updater: GitHub releases, public key signing

## RLS / Auth
- **Auth**: Supabase Auth with email/password. New staff created by HR via temporary client (avoids overwriting admin session).
- **RLS**: Enabled on all 8 tables.
  - Staff can view/insert own leaves; approvers UPDATE where `approver_id = auth.uid()`
  - HR can SELECT all (via `is_hr()` DB function)
  - Notifications: users receive their own, can update own, can insert
- **DB functions**: `is_hr()`, `create_initial_leave_eligibility`, `sync_staff_leave_eligibility`, `delete_staff_permanently`

## Important Rules
- `leave_applications` CHECK constraint: `status IN ('Pending', 'Approved', 'Rejected')`
- HR may lack explicit UPDATE policy — updates rely on permissive policies
- Balance deduction for Annual Leave ONLY when HR classifies

## Vite Dev Config
- Plugin: `@vitejs/plugin-react`
- Dev port: 1420 (strict), HMR port: 1421
- Ignores `src-tauri/` for file watching
