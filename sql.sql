-- Supabase Schema Dump (Reconstructed from online database)
-- Date: 2026-05-25

-- Enable RLS for all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_durations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;

-- Functions
CREATE OR REPLACE FUNCTION public.is_hr()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_hr = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_staff_permanently(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- If you need to delete from Supabase Auth as well:
    DELETE FROM auth.users WHERE id = target_user_id;
    
    -- If you have a separate profiles/staff table:
    -- DELETE FROM public.staff WHERE id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_initial_leave_eligibility(p_uid uuid, p_year integer, p_eligibility real, p_balance real)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO public.leave_eligibility (uid, year, eligibility, balance)
    VALUES (p_uid, p_year, p_eligibility, p_balance);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_staff_leave_eligibility(p_uid uuid, p_year integer, p_eligibility real, p_balance real)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO public.leave_eligibility (uid, year, eligibility, balance, modified_at)
    VALUES (p_uid, p_year, p_eligibility, p_balance, now())
    ON CONFLICT (uid, year) 
    DO UPDATE SET 
        eligibility = EXCLUDED.eligibility,
        balance = EXCLUDED.balance,
        modified_at = now();
END;
$function$;

-- Tables
CREATE TABLE public.departments (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
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
    CONSTRAINT leave_applications_pkey PRIMARY KEY (id)
);

CREATE TABLE public.leave_durations (
    id integer NOT NULL DEFAULT nextval('leave_durations_id_seq'::regclass),
    duration_name text NOT NULL UNIQUE,
    duration_value numeric NOT NULL,
    CONSTRAINT leave_durations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.leave_eligibility (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    uid uuid DEFAULT auth.uid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    year integer NOT NULL,
    eligibility real,
    balance real,
    modified_at timestamp with time zone DEFAULT now(),
    CONSTRAINT leave_eligibility_pkey PRIMARY KEY (id),
    CONSTRAINT leave_eligibility_uid_year_key UNIQUE (uid, year)
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
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE public.public_holidays (
    id bigint NOT NULL DEFAULT nextval('public_holidays_id_seq'::regclass),
    holiday_date date NOT NULL UNIQUE,
    holiday_name text NOT NULL,
    CONSTRAINT public_holidays_pkey PRIMARY KEY (id)
);

-- Foreign Key Constraints
ALTER TABLE public.leave_applications ADD CONSTRAINT leave_applications_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.profiles(id);
ALTER TABLE public.leave_applications ADD CONSTRAINT leave_applications_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id);
ALTER TABLE public.leave_applications ADD CONSTRAINT leave_applications_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id);

ALTER TABLE public.leave_eligibility ADD CONSTRAINT leave_eligibility_uid_fkey FOREIGN KEY (uid) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_department FOREIGN KEY (department_id) REFERENCES public.departments(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_report_to_fkey FOREIGN KEY (report_to) REFERENCES public.profiles(id);

-- RLS Policies

-- departments
CREATE POLICY "Allow delete for authenticated users" ON public.departments FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow read access for everyone" ON public.departments FOR SELECT TO public USING (true);
CREATE POLICY "Allow update for authenticated users" ON public.departments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- leave_applications
CREATE POLICY "Approvers can update assigned applications" ON public.leave_applications FOR UPDATE TO authenticated USING (approver_id = auth.uid()) WITH CHECK (approver_id = auth.uid());
CREATE POLICY "HR can view all leave applications" ON public.leave_applications FOR SELECT TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE is_hr = true));
CREATE POLICY "Staff can view and insert own leave" ON public.leave_applications FOR ALL TO authenticated USING (auth.uid() = staff_id) WITH CHECK (auth.uid() = staff_id);

-- leave_durations
CREATE POLICY "Allow public read for leave durations" ON public.leave_durations FOR SELECT TO authenticated USING (true);

-- leave_eligibility
CREATE POLICY "HR boleh lihat dan urus semua rekod" ON public.leave_eligibility FOR ALL TO public USING (is_hr());
CREATE POLICY "Staff boleh lihat kelayakan sendiri" ON public.leave_eligibility FOR SELECT TO public USING (auth.uid() = uid);

-- leave_types
CREATE POLICY "Allow Admin full control on leave types" ON public.leave_types FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE is_super_admin = true));
CREATE POLICY "Allow public read for leave types" ON public.leave_types FOR SELECT TO authenticated USING (true);

-- profiles
CREATE POLICY "Full access for profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "HR and Admin can manage all profiles" ON public.profiles FOR ALL TO public USING ((((auth.jwt() ->> 'sub'::text))::uuid = id) OR (is_hr = true) OR (is_super_admin = true));
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO public USING (auth.uid() = id);

-- public_holidays
CREATE POLICY "Allow public read for public holidays" ON public.public_holidays FOR SELECT TO authenticated USING (true);
