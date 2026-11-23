
-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Deals
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  title text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  contact_role text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  value numeric NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead','contacted','discovery','proposal','won','lost')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  source text NOT NULL DEFAULT '',
  service text NOT NULL DEFAULT '',
  openings integer NOT NULL DEFAULT 1,
  next_step text NOT NULL DEFAULT '',
  follow_up_date date,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  stage_changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view deals" ON public.deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can add deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team can edit deals" ON public.deals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Team can delete deals" ON public.deals FOR DELETE TO authenticated USING (true);

-- Activities
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'note' CHECK (type IN ('call','email','meeting','note','stage')),
  body text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activities_deal_id_idx ON public.activities(deal_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view activities" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team can log activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authors can edit activities" ON public.activities FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Authors can delete activities" ON public.activities FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Timestamps + automatic stage history
CREATE OR REPLACE FUNCTION public.deals_before_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deals_before_update BEFORE UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.deals_before_update();

CREATE OR REPLACE FUNCTION public.deals_log_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.activities (deal_id, type, body, created_by)
    VALUES (NEW.id, 'stage', OLD.stage || '>' || NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deals_log_stage_change AFTER UPDATE OF stage ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.deals_log_stage_change();

-- Live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- Example deals
INSERT INTO public.deals (id, company, title, contact_name, contact_role, contact_email, value, stage, priority, source, service, openings, next_step, follow_up_date, notes, created_by, created_at, stage_changed_at) VALUES
('a1000000-0000-4000-8000-000000000001','Kestrel Logistics','Warehouse operations managers','Arjun Mehta','HR Director','arjun@kestrel.example',450000,'lead','medium','LinkedIn','Permanent',3,'Send intro email with salary benchmark report', current_date + 1,'Expanding to 2 new warehouses in Pune.',NULL, now() - interval '3 days', now() - interval '3 days'),
('a1000000-0000-4000-8000-000000000002','Orchid Health Clinics','Nurse supervisors for new branches','Dr. Sana Kapoor','COO','sana@orchid.example',540000,'lead','low','Event','Contract / Temp',6,'Connect on LinkedIn after HR summit', current_date + 3,'',NULL, now() - interval '5 days', now() - interval '5 days'),
('a1000000-0000-4000-8000-000000000003','Nimbus Fintech','Backend engineers (Java)','Priya Raman','Head of Talent','priya@nimbus.example',960000,'contacted','high','Referral','Permanent',4,'Follow-up call to confirm hiring timeline', current_date - 1,'Referred by Lumen EdTech founder.',NULL, now() - interval '9 days', now() - interval '4 days'),
('a1000000-0000-4000-8000-000000000004','BrightLeaf Foods','Quality analysts for plant','Rohit Sharma','Plant Manager','rohit@brightleaf.example',240000,'contacted','medium','Cold call','Permanent',2,'Second email with FMCG case study', current_date,'',NULL, now() - interval '6 days', now() - interval '2 days'),
('a1000000-0000-4000-8000-000000000005','Vertex Cloud Systems','DevOps leads','Meera Iyer','VP Engineering','meera@vertex.example',1200000,'discovery','high','Inbound / website','Executive search',3,'Discovery call: roles, budget, decision process', current_date + 2,'Filled our website form after seeing tech salary guide.',NULL, now() - interval '12 days', now() - interval '1 day'),
('a1000000-0000-4000-8000-000000000006','Saffron Retail','Store managers across Mumbai','Kabir Singh','CHRO','kabir@saffron.example',1500000,'proposal','high','Existing client','Permanent',10,'Chase signed terms (8.33% fee proposed)', current_date,'Past client from 2024. Wants exclusivity for 3 months.',NULL, now() - interval '20 days', now() - interval '3 days'),
('a1000000-0000-4000-8000-000000000007','Atlas Engineering','Project engineers on contract','Neha Joshi','Talent Partner','neha@atlas.example',800000,'proposal','medium','Email campaign','Contract / Temp',5,'Respond to fee counter-offer (they asked for 7%)', current_date + 4,'',NULL, now() - interval '15 days', now() - interval '5 days'),
('a1000000-0000-4000-8000-000000000008','Lumen EdTech','Regional sales managers','Vikram Rao','Founder','vikram@lumen.example',720000,'won','medium','Referral','Permanent',3,'Kick-off call with hiring managers', current_date + 1,'Terms signed at 8.33%. Replacement guarantee 90 days.',NULL, now() - interval '30 days', now() - interval '2 days'),
('a1000000-0000-4000-8000-000000000009','Cobalt Insurance','Claims executives','Anita Desai','HR Manager','anita@cobalt.example',360000,'lost','low','Cold call','Permanent',4,'Check back next quarter', current_date + 60,'Chose in-house hiring for now.',NULL, now() - interval '25 days', now() - interval '6 days');

INSERT INTO public.activities (deal_id, type, body, created_by, created_at) VALUES
('a1000000-0000-4000-8000-000000000003','call','Spoke to Priya — 4 Java roles opening next month. Asked for a call back on timeline.',NULL, now() - interval '4 days'),
('a1000000-0000-4000-8000-000000000005','email','Sent tech salary guide and suggested a 30-min discovery call.',NULL, now() - interval '2 days'),
('a1000000-0000-4000-8000-000000000006','meeting','Met Kabir at their office. Agreed scope: 10 store managers, 6 weeks.',NULL, now() - interval '5 days'),
('a1000000-0000-4000-8000-000000000006','email','Proposal and terms of business sent. 8.33% fee, 60-day replacement.',NULL, now() - interval '3 days'),
('a1000000-0000-4000-8000-000000000008','note','Terms signed. Job descriptions received for all 3 roles.',NULL, now() - interval '2 days');
