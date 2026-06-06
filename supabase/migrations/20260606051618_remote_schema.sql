


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_initial_leave_eligibility"("p_uid" "uuid", "p_year" integer, "p_eligibility" numeric, "p_balance" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.leave_eligibility (uid, year, eligibility, balance)
    VALUES (p_uid, p_year, p_eligibility, p_balance);
END;
$$;


ALTER FUNCTION "public"."create_initial_leave_eligibility"("p_uid" "uuid", "p_year" integer, "p_eligibility" numeric, "p_balance" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_staff_permanently"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- If you need to delete from Supabase Auth as well:
    DELETE FROM auth.users WHERE id = target_user_id;
    
    -- If you have a separate profiles/staff table:
    -- DELETE FROM public.staff WHERE id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."delete_staff_permanently"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_hr"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_hr = true
  );
END;
$$;


ALTER FUNCTION "public"."is_hr"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_staff_leave_eligibility"("p_uid" "uuid", "p_year" integer, "p_eligibility" numeric, "p_balance" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    INSERT INTO public.leave_eligibility (uid, year, eligibility, balance, modified_at)
    VALUES (p_uid, p_year, p_eligibility, p_balance, now())
    ON CONFLICT (uid, year) 
    DO UPDATE SET 
        eligibility = EXCLUDED.eligibility,
        balance = EXCLUDED.balance,
        modified_at = now();
END;
$$;


ALTER FUNCTION "public"."sync_staff_leave_eligibility"("p_uid" "uuid", "p_year" integer, "p_eligibility" numeric, "p_balance" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


ALTER TABLE "public"."departments" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."departments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."leave_applications" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "staff_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "leave_date" "date" NOT NULL,
    "duration_type" "text" NOT NULL,
    "duration_value" numeric(2,1) NOT NULL,
    "leave_type" "text" NOT NULL,
    "status" "text" DEFAULT 'Pending'::"text",
    "processed_by" "uuid",
    "processed_at" timestamp with time zone,
    "approver_id" "uuid",
    CONSTRAINT "leave_applications_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Approved'::"text", 'Rejected'::"text"])))
);


ALTER TABLE "public"."leave_applications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."leave_applications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."leave_applications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."leave_applications_id_seq" OWNED BY "public"."leave_applications"."id";



CREATE TABLE IF NOT EXISTS "public"."leave_durations" (
    "id" integer NOT NULL,
    "duration_name" "text" NOT NULL,
    "duration_value" numeric(2,1) NOT NULL
);


ALTER TABLE "public"."leave_durations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."leave_durations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."leave_durations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."leave_durations_id_seq" OWNED BY "public"."leave_durations"."id";



CREATE TABLE IF NOT EXISTS "public"."leave_eligibility" (
    "uid" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "year" integer NOT NULL,
    "eligibility" real,
    "balance" real,
    "modified_at" timestamp with time zone DEFAULT "now"(),
    "id" bigint NOT NULL,
    "mc_eligibility" real DEFAULT 14,
    "mc_balance" real DEFAULT 14
);


ALTER TABLE "public"."leave_eligibility" OWNER TO "postgres";


ALTER TABLE "public"."leave_eligibility" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."leave_eligibility_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."leave_types" (
    "id" integer NOT NULL,
    "type_name" "text" NOT NULL
);


ALTER TABLE "public"."leave_types" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."leave_types_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."leave_types_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."leave_types_id_seq" OWNED BY "public"."leave_types"."id";



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "full_name" "text" NOT NULL,
    "position" "text",
    "working_days_type" "text" DEFAULT '5_days'::"text",
    "is_staff" boolean DEFAULT true,
    "is_superior" boolean DEFAULT false,
    "is_hr" boolean DEFAULT false,
    "is_super_admin" boolean DEFAULT false,
    "department_id" bigint,
    "email" "text",
    "report_to" "uuid",
    "staff_status" "text" DEFAULT 'Active'::"text",
    CONSTRAINT "profiles_staff_status_check" CHECK (("staff_status" = ANY (ARRAY['Active'::"text", 'Resigned'::"text"]))),
    CONSTRAINT "profiles_working_days_type_check" CHECK (("working_days_type" = ANY (ARRAY['5_days'::"text", '6_days'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."public_holidays" (
    "id" bigint NOT NULL,
    "holiday_date" "date" NOT NULL,
    "holiday_name" "text" NOT NULL
);


ALTER TABLE "public"."public_holidays" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."public_holidays_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."public_holidays_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."public_holidays_id_seq" OWNED BY "public"."public_holidays"."id";



ALTER TABLE ONLY "public"."leave_applications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."leave_applications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."leave_durations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."leave_durations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."leave_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."leave_types_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."public_holidays" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."public_holidays_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_applications"
    ADD CONSTRAINT "leave_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_durations"
    ADD CONSTRAINT "leave_durations_duration_name_key" UNIQUE ("duration_name");



ALTER TABLE ONLY "public"."leave_durations"
    ADD CONSTRAINT "leave_durations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_eligibility"
    ADD CONSTRAINT "leave_eligibility_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_eligibility"
    ADD CONSTRAINT "leave_eligibility_uid_year_key" UNIQUE ("uid", "year");



ALTER TABLE ONLY "public"."leave_types"
    ADD CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_types"
    ADD CONSTRAINT "leave_types_type_name_key" UNIQUE ("type_name");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_holidays"
    ADD CONSTRAINT "public_holidays_holiday_date_key" UNIQUE ("holiday_date");



ALTER TABLE ONLY "public"."public_holidays"
    ADD CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "fk_profiles_department" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leave_applications"
    ADD CONSTRAINT "leave_applications_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."leave_applications"
    ADD CONSTRAINT "leave_applications_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."leave_applications"
    ADD CONSTRAINT "leave_applications_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_eligibility"
    ADD CONSTRAINT "leave_eligibility_uid_fkey" FOREIGN KEY ("uid") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_report_to_fkey" FOREIGN KEY ("report_to") REFERENCES "public"."profiles"("id");



CREATE POLICY "Allow Admin full control on leave types" ON "public"."leave_types" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_super_admin" = true))));



CREATE POLICY "Allow delete for authenticated users" ON "public"."departments" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow insert for authenticated users" ON "public"."departments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow public read for leave durations" ON "public"."leave_durations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow public read for leave types" ON "public"."leave_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow public read for public holidays" ON "public"."public_holidays" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow read access for everyone" ON "public"."departments" FOR SELECT USING (true);



CREATE POLICY "Allow update for authenticated users" ON "public"."departments" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Approvers can update assigned applications" ON "public"."leave_applications" FOR UPDATE TO "authenticated" USING (("approver_id" = "auth"."uid"())) WITH CHECK (("approver_id" = "auth"."uid"()));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Full access for profiles" ON "public"."profiles" USING (true) WITH CHECK (true);



CREATE POLICY "HR and Admin can manage all profiles" ON "public"."profiles" USING ((( SELECT ((("auth"."jwt"() ->> 'sub'::"text"))::"uuid" = "profiles"."id")) OR ("is_hr" = true) OR ("is_super_admin" = true)));



CREATE POLICY "HR and Admins can manage public holidays" ON "public"."public_holidays" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_hr" = true) OR ("profiles"."is_super_admin" = true)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_hr" = true) OR ("profiles"."is_super_admin" = true))))));



CREATE POLICY "HR boleh lihat dan urus semua rekod" ON "public"."leave_eligibility" USING ("public"."is_hr"());



CREATE POLICY "HR can view all leave applications" ON "public"."leave_applications" FOR SELECT TO "authenticated" USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_hr" = true))));



CREATE POLICY "Public holidays are viewable by everyone authenticated" ON "public"."public_holidays" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Staff boleh lihat kelayakan sendiri" ON "public"."leave_eligibility" FOR SELECT USING (("auth"."uid"() = "uid"));



CREATE POLICY "Staff can view and insert own leave" ON "public"."leave_applications" TO "authenticated" USING (("auth"."uid"() = "staff_id"));



CREATE POLICY "System/Users can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can receive their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leave_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leave_durations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leave_eligibility" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leave_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."public_holidays" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."create_initial_leave_eligibility"("p_uid" "uuid", "p_year" integer, "p_eligibility" numeric, "p_balance" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."create_initial_leave_eligibility"("p_uid" "uuid", "p_year" integer, "p_eligibility" numeric, "p_balance" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_initial_leave_eligibility"("p_uid" "uuid", "p_year" integer, "p_eligibility" numeric, "p_balance" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_staff_permanently"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_staff_permanently"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_staff_permanently"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_hr"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_hr"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_hr"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_staff_leave_eligibility"("p_uid" "uuid", "p_year" integer, "p_eligibility" numeric, "p_balance" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."sync_staff_leave_eligibility"("p_uid" "uuid", "p_year" integer, "p_eligibility" numeric, "p_balance" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_staff_leave_eligibility"("p_uid" "uuid", "p_year" integer, "p_eligibility" numeric, "p_balance" numeric) TO "service_role";


















GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."leave_applications" TO "anon";
GRANT ALL ON TABLE "public"."leave_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_applications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leave_applications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leave_applications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leave_applications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."leave_durations" TO "anon";
GRANT ALL ON TABLE "public"."leave_durations" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_durations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leave_durations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leave_durations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leave_durations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."leave_eligibility" TO "anon";
GRANT ALL ON TABLE "public"."leave_eligibility" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_eligibility" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leave_eligibility_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leave_eligibility_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leave_eligibility_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."leave_types" TO "anon";
GRANT ALL ON TABLE "public"."leave_types" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leave_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leave_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leave_types_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."public_holidays" TO "anon";
GRANT ALL ON TABLE "public"."public_holidays" TO "authenticated";
GRANT ALL ON TABLE "public"."public_holidays" TO "service_role";



GRANT ALL ON SEQUENCE "public"."public_holidays_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."public_holidays_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."public_holidays_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


