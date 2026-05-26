-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.departments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.leave_applications (
  id bigint NOT NULL DEFAULT nextval('leave_applications_id_seq'::regclass),
  created_at timestamp with time zone DEFAULT now(),
  staff_id uuid NOT NULL,
  reason text NOT NULL,
  leave_date date NOT NULL,
  duration_type text NOT NULL,
  duration_value numeric NOT NULL,
  leave_type text NOT NULL,
  status text DEFAULT 'Pending'::text CHECK (status = ANY (ARRAY['Pending'::text, 'Approved'::text, 'Rejected'::text])),
  processed_by uuid,
  processed_at timestamp with time zone,
  approver_id uuid,
  CONSTRAINT leave_applications_pkey PRIMARY KEY (id),
  CONSTRAINT leave_applications_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id),
  CONSTRAINT leave_applications_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id),
  CONSTRAINT leave_applications_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.leave_durations (
  id integer NOT NULL DEFAULT nextval('leave_durations_id_seq'::regclass),
  duration_name text NOT NULL UNIQUE,
  duration_value numeric NOT NULL,
  CONSTRAINT leave_durations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.leave_eligibility (
  uid uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  year integer NOT NULL,
  eligibility real,
  balance real,
  modified_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT leave_eligibility_pkey PRIMARY KEY (id),
  CONSTRAINT leave_eligibility_uid_fkey FOREIGN KEY (uid) REFERENCES public.profiles(id)
);
CREATE TABLE public.leave_types (
  id integer NOT NULL DEFAULT nextval('leave_types_id_seq'::regclass),
  type_name text NOT NULL UNIQUE,
  CONSTRAINT leave_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  full_name text NOT NULL,
  position text,
  working_days_type text DEFAULT '5_days'::text CHECK (working_days_type = ANY (ARRAY['5_days'::text, '6_days'::text])),
  is_staff boolean DEFAULT true,
  is_superior boolean DEFAULT false,
  is_hr boolean DEFAULT false,
  is_super_admin boolean DEFAULT false,
  department_id bigint,
  email text,
  report_to uuid,
  staff_status text DEFAULT 'Active'::text CHECK (staff_status = ANY (ARRAY['Active'::text, 'Resigned'::text])),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT fk_profiles_department FOREIGN KEY (department_id) REFERENCES public.departments(id),
  CONSTRAINT profiles_report_to_fkey FOREIGN KEY (report_to) REFERENCES public.profiles(id)
);
CREATE TABLE public.public_holidays (
  id bigint NOT NULL DEFAULT nextval('public_holidays_id_seq'::regclass),
  holiday_date date NOT NULL UNIQUE,
  holiday_name text NOT NULL,
  CONSTRAINT public_holidays_pkey PRIMARY KEY (id)
);