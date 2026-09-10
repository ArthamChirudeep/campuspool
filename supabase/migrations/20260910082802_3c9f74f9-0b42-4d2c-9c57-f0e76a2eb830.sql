-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','student');
CREATE TYPE public.ride_direction AS ENUM ('to_campus','from_campus');
CREATE TYPE public.ride_status AS ENUM ('open','full','completed','cancelled');
CREATE TYPE public.request_status AS ENUM ('pending','accepted','declined','cancelled');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT 'Student',
  avatar_url text,
  phone text,
  department text,
  study_year int,
  home_area text,
  bio text,
  is_driver boolean NOT NULL DEFAULT false,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text,
  rating numeric(3,2) NOT NULL DEFAULT 4.80,
  rides_count int NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- first signed-in user can claim admin when none exists
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin() TO authenticated;

-- ============ CAMPUS SETTINGS ============
CREATE TABLE public.campus_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  campus_name text NOT NULL,
  campus_short text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  endorsement_note text NOT NULL,
  demo_mode_enabled boolean NOT NULL DEFAULT true,
  fuel_price_per_litre numeric(6,2) NOT NULL DEFAULT 105.00,
  km_per_litre numeric(5,2) NOT NULL DEFAULT 15.00,
  co2_kg_per_km numeric(6,4) NOT NULL DEFAULT 0.1710,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campus_settings TO authenticated, anon;
GRANT INSERT, UPDATE ON public.campus_settings TO authenticated;
GRANT ALL ON public.campus_settings TO service_role;
ALTER TABLE public.campus_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.campus_settings FOR SELECT USING (true);
CREATE POLICY "admins update settings" ON public.campus_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.campus_settings (id, campus_name, campus_short, address, city, lat, lng, endorsement_note)
VALUES (true,'CVR College of Engineering','CVR','Vastunagar, Mangalpally, Ibrahimpatnam, Rangareddy, Telangana 501510','Hyderabad',17.19680,78.60690,
'CampusPool @ CVR is an independent student project. It is not officially endorsed by or affiliated with CVR College of Engineering.');

-- ============ AREAS ============
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  corridor text,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.areas TO authenticated, anon;
GRANT ALL ON public.areas TO service_role;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "areas readable" ON public.areas FOR SELECT USING (true);

INSERT INTO public.areas (name, lat, lng, corridor, sort_order) VALUES
 ('Ibrahimpatnam',17.18990,78.63160,'NH65 South',1),
 ('Hayathnagar',17.32530,78.60550,'NH65 South',2),
 ('Vanasthalipuram',17.32430,78.57940,'NH65 South',3),
 ('LB Nagar',17.34570,78.55220,'Inner Ring',4),
 ('Nagole',17.36730,78.55860,'Inner Ring',5),
 ('Uppal',17.39800,78.55900,'Inner Ring',6),
 ('Kothapet',17.35960,78.53900,'Dilsukhnagar Corridor',7),
 ('Dilsukhnagar',17.36870,78.52470,'Dilsukhnagar Corridor',8),
 ('Saroornagar',17.34660,78.53350,'Dilsukhnagar Corridor',9),
 ('Karmanghat',17.33120,78.53210,'Dilsukhnagar Corridor',10);

-- ============ RIDES ============
CREATE TABLE public.rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction public.ride_direction NOT NULL DEFAULT 'to_campus',
  origin_name text NOT NULL,
  origin_lat double precision NOT NULL,
  origin_lng double precision NOT NULL,
  dest_name text NOT NULL,
  dest_lat double precision NOT NULL,
  dest_lng double precision NOT NULL,
  departure_time time NOT NULL,
  ride_date date,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_days int[] NOT NULL DEFAULT '{}',
  seats_total int NOT NULL DEFAULT 3,
  seats_available int NOT NULL DEFAULT 3,
  fare_share numeric(7,2) NOT NULL DEFAULT 0,
  notes text,
  status public.ride_status NOT NULL DEFAULT 'open',
  distance_km numeric(6,2) NOT NULL DEFAULT 0,
  duration_min int NOT NULL DEFAULT 0,
  route_polyline text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rides_driver_idx ON public.rides(driver_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rides TO authenticated;
GRANT SELECT ON public.rides TO anon;
GRANT ALL ON public.rides TO service_role;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rides readable" ON public.rides FOR SELECT USING (true);
CREATE POLICY "create own ride" ON public.rides FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "update own ride" ON public.rides FOR UPDATE TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "delete own ride" ON public.rides FOR DELETE TO authenticated USING (auth.uid() = driver_id);

-- ============ RIDE STOPS ============
CREATE TABLE public.ride_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  seq int NOT NULL DEFAULT 1,
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  eta_offset_min int NOT NULL DEFAULT 0
);
CREATE INDEX ride_stops_ride_idx ON public.ride_stops(ride_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ride_stops TO authenticated;
GRANT SELECT ON public.ride_stops TO anon;
GRANT ALL ON public.ride_stops TO service_role;
ALTER TABLE public.ride_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stops readable" ON public.ride_stops FOR SELECT USING (true);
CREATE POLICY "driver manages stops" ON public.ride_stops FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.driver_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.driver_id = auth.uid()));

-- ============ REQUESTS ============
CREATE TABLE public.ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pickup_name text NOT NULL,
  pickup_lat double precision NOT NULL,
  pickup_lng double precision NOT NULL,
  message text,
  status public.request_status NOT NULL DEFAULT 'pending',
  match_score int NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ride_id, rider_id)
);
CREATE INDEX ride_requests_ride_idx ON public.ride_requests(ride_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ride_requests TO authenticated;
GRANT SELECT ON public.ride_requests TO anon;
GRANT ALL ON public.ride_requests TO service_role;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests readable" ON public.ride_requests FOR SELECT USING (true);
CREATE POLICY "rider creates request" ON public.ride_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "rider or driver updates request" ON public.ride_requests FOR UPDATE TO authenticated
  USING (auth.uid() = rider_id OR EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.driver_id = auth.uid()))
  WITH CHECK (auth.uid() = rider_id OR EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.driver_id = auth.uid()));
CREATE POLICY "rider deletes own request" ON public.ride_requests FOR DELETE TO authenticated USING (auth.uid() = rider_id);

-- ============ CHAT ============
CREATE OR REPLACE FUNCTION public.is_ride_participant(_ride_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.rides r WHERE r.id = _ride_id AND r.driver_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.ride_requests q WHERE q.ride_id = _ride_id AND q.rider_id = _user_id AND q.status = 'accepted')
$$;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_ride_idx ON public.messages(ride_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (is_demo OR public.is_ride_participant(ride_id, auth.uid()));
CREATE POLICY "participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_ride_participant(ride_id, auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;

-- ============ IMPACT ============
CREATE TABLE public.impact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ride_id uuid REFERENCES public.rides(id) ON DELETE SET NULL,
  km_shared numeric(7,2) NOT NULL DEFAULT 0,
  co2_saved_kg numeric(7,3) NOT NULL DEFAULT 0,
  money_saved numeric(8,2) NOT NULL DEFAULT 0,
  seats_filled int NOT NULL DEFAULT 1,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false
);
CREATE INDEX impact_user_idx ON public.impact_events(user_id);
GRANT SELECT, INSERT ON public.impact_events TO authenticated;
GRANT SELECT ON public.impact_events TO anon;
GRANT ALL ON public.impact_events TO service_role;
ALTER TABLE public.impact_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "impact readable" ON public.impact_events FOR SELECT USING (true);
CREATE POLICY "insert own impact" ON public.impact_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ DEMO SEED ============
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c_lat double precision := 17.19680;
  c_lng double precision := 78.60690;
  d date := current_date;
  r record;
  ride_id uuid;
BEGIN
  -- demo students
  INSERT INTO public.profiles (id, full_name, phone, department, study_year, home_area, bio, is_driver, vehicle_model, vehicle_color, vehicle_plate, rating, rides_count, is_demo) VALUES
   ('d0000000-0000-4000-8000-000000000001','Aditya Reddy','+91 90000 10001','CSE',3,'LB Nagar','Leaves early, hates traffic.',true,'Maruti Swift','White','TS09 EA 4412',4.90,86,true),
   ('d0000000-0000-4000-8000-000000000002','Sneha Rao','+91 90000 10002','ECE',2,'Dilsukhnagar','Music on, windows down.',true,'Hyundai i20','Blue','TS10 FB 2210',4.80,54,true),
   ('d0000000-0000-4000-8000-000000000003','Vikram Teja','+91 90000 10003','Mechanical',4,'Uppal','Final year, fixed 8am lab.',true,'Honda City','Silver','TS08 GC 7788',4.70,120,true),
   ('d0000000-0000-4000-8000-000000000004','Priya Sharma','+91 90000 10004','IT',3,'Vanasthalipuram','Prefers all-girls rides.',true,'Tata Tiago','Red','TS07 HD 1155',4.95,73,true),
   ('d0000000-0000-4000-8000-000000000005','Rahul Yadav','+91 90000 10005','Civil',2,'Hayathnagar','Two-wheeler pillion only.',true,'Honda Activa','Grey','TS11 JE 9021',4.60,41,true),
   ('d0000000-0000-4000-8000-000000000006','Ananya Iyer','+91 90000 10006','CSE',1,'Kothapet','First year, new to campus.',false,NULL,NULL,NULL,4.85,12,true),
   ('d0000000-0000-4000-8000-000000000007','Karthik Naidu','+91 90000 10007','EEE',3,'Nagole','Evening shuttle regular.',true,'Maruti Baleno','Grey','TS09 KF 3390',4.75,64,true),
   ('d0000000-0000-4000-8000-000000000008','Meghana Goud','+91 90000 10008','ECE',4,'Saroornagar','Project work till late.',false,NULL,NULL,NULL,4.90,28,true),
   ('d0000000-0000-4000-8000-000000000009','Imran Khan','+91 90000 10009','Mechanical',2,'Karmanghat','Cricket practice Tue/Thu.',false,NULL,NULL,NULL,4.65,19,true),
   ('d0000000-0000-4000-8000-000000000010','Divya Prasad','+91 90000 10010','IT',3,'Ibrahimpatnam','Walks the last stretch.',true,'Maruti Wagon R','White','TS12 LG 5544',4.88,97,true),
   ('d0000000-0000-4000-8000-000000000011','Sai Charan','+91 90000 10011','CSE',4,'LB Nagar','Placement prep, 9am start.',false,NULL,NULL,NULL,4.70,33,true),
   ('d0000000-0000-4000-8000-000000000012','Harshitha Reddy','+91 90000 10012','Civil',1,'Hayathnagar','Loves saving on fuel.',false,NULL,NULL,NULL,4.92,8,true)
  ON CONFLICT (id) DO NOTHING;

  -- recurring morning rides into campus
  FOR r IN
    SELECT * FROM (VALUES
      ('d0000000-0000-4000-8000-000000000001'::uuid,'LB Nagar',17.34570,78.55220,'07:15'::time,4,3,60::numeric,22.4,48,'Pick-up at LB Nagar metro pillar 1245.'),
      ('d0000000-0000-4000-8000-000000000002'::uuid,'Dilsukhnagar',17.36870,78.52470,'07:30'::time,3,2,70::numeric,26.8,55,'Waiting near Konark theatre bus bay.'),
      ('d0000000-0000-4000-8000-000000000003'::uuid,'Uppal',17.39800,78.55900,'07:00'::time,4,2,80::numeric,29.5,62,'Strictly on time, 8am lab.'),
      ('d0000000-0000-4000-8000-000000000004'::uuid,'Vanasthalipuram',17.32430,78.57940,'07:45'::time,3,3,50::numeric,17.9,38,'Girls-only ride, comfortable and safe.'),
      ('d0000000-0000-4000-8000-000000000010'::uuid,'Ibrahimpatnam',17.18990,78.63160,'08:20'::time,3,2,25::numeric,4.6,12,'Short hop from Ibrahimpatnam bus stand.'),
      ('d0000000-0000-4000-8000-000000000007'::uuid,'Nagole',17.36730,78.55860,'07:20'::time,4,3,65::numeric,24.1,52,'Nagole X-road, near the metro steps.')
    ) AS t(driver,area,lat,lng,dep,seats,avail,fare,km,mins,note)
  LOOP
    INSERT INTO public.rides (driver_id,direction,origin_name,origin_lat,origin_lng,dest_name,dest_lat,dest_lng,departure_time,is_recurring,recurrence_days,seats_total,seats_available,fare_share,notes,distance_km,duration_min,is_demo)
    VALUES (r.driver,'to_campus',r.area,r.lat,r.lng,'CVR College of Engineering',c_lat,c_lng,r.dep,true,'{1,2,3,4,5}',r.seats,r.avail,r.fare,r.note,r.km,r.mins,true)
    RETURNING id INTO ride_id;

    INSERT INTO public.ride_stops (ride_id,seq,name,lat,lng,eta_offset_min)
    SELECT ride_id, a.sort_order, a.name, a.lat, a.lng, 6 * row_number() over (order by a.sort_order)
    FROM public.areas a
    WHERE a.corridor = (SELECT corridor FROM public.areas WHERE name = r.area)
      AND a.name <> r.area
    LIMIT 2;
  END LOOP;

  -- one-time evening rides home
  FOR r IN
    SELECT * FROM (VALUES
      ('d0000000-0000-4000-8000-000000000005'::uuid,'Hayathnagar',17.32530,78.60550,'17:30'::time,1,1,30::numeric,14.2,32,'Two-wheeler, helmet provided.'),
      ('d0000000-0000-4000-8000-000000000001'::uuid,'LB Nagar',17.34570,78.55220,'18:00'::time,4,4,60::numeric,22.4,50,'Dropping at LB Nagar and Kothapet.'),
      ('d0000000-0000-4000-8000-000000000003'::uuid,'Uppal',17.39800,78.55900,'17:45'::time,4,3,80::numeric,29.5,66,'Evening return via Ring Road.'),
      ('d0000000-0000-4000-8000-000000000002'::uuid,'Dilsukhnagar',17.36870,78.52470,'19:15'::time,3,3,70::numeric,26.8,58,'After project review, late return.')
    ) AS t(driver,area,lat,lng,dep,seats,avail,fare,km,mins,note)
  LOOP
    INSERT INTO public.rides (driver_id,direction,origin_name,origin_lat,origin_lng,dest_name,dest_lat,dest_lng,departure_time,ride_date,is_recurring,seats_total,seats_available,fare_share,notes,distance_km,duration_min,is_demo)
    VALUES (r.driver,'from_campus','CVR College of Engineering',c_lat,c_lng,r.area,r.lat,r.lng,r.dep,d + 1,false,r.seats,r.avail,r.fare,r.note,r.km,r.mins,true)
    RETURNING id INTO ride_id;
  END LOOP;

  -- demo requests on the busiest morning rides
  INSERT INTO public.ride_requests (ride_id,rider_id,pickup_name,pickup_lat,pickup_lng,message,status,match_score,is_demo)
  SELECT rd.id,'d0000000-0000-4000-8000-000000000011','LB Nagar Metro',17.34570,78.55220,'Can I join from pillar 1245?','accepted',94,true
  FROM public.rides rd WHERE rd.is_demo AND rd.origin_name='LB Nagar' AND rd.direction='to_campus' LIMIT 1;

  INSERT INTO public.ride_requests (ride_id,rider_id,pickup_name,pickup_lat,pickup_lng,message,status,match_score,is_demo)
  SELECT rd.id,'d0000000-0000-4000-8000-000000000006','Kothapet Y Junction',17.35960,78.53900,'Kothapet is on your way, 2 min detour.','pending',88,true
  FROM public.rides rd WHERE rd.is_demo AND rd.origin_name='Dilsukhnagar' AND rd.direction='to_campus' LIMIT 1;

  INSERT INTO public.ride_requests (ride_id,rider_id,pickup_name,pickup_lat,pickup_lng,message,status,match_score,is_demo)
  SELECT rd.id,'d0000000-0000-4000-8000-000000000009','Karmanghat Cross Roads',17.33120,78.53210,'Need a lift Tue and Thu.','pending',81,true
  FROM public.rides rd WHERE rd.is_demo AND rd.origin_name='Vanasthalipuram' AND rd.direction='to_campus' LIMIT 1;

  INSERT INTO public.ride_requests (ride_id,rider_id,pickup_name,pickup_lat,pickup_lng,message,status,match_score,is_demo)
  SELECT rd.id,'d0000000-0000-4000-8000-000000000008','Saroornagar Lake',17.34660,78.53350,'Evening return please.','accepted',90,true
  FROM public.rides rd WHERE rd.is_demo AND rd.origin_name='Uppal' AND rd.direction='to_campus' LIMIT 1;

  -- demo chat
  INSERT INTO public.messages (ride_id,sender_id,body,is_demo,created_at)
  SELECT rd.id,'d0000000-0000-4000-8000-000000000001','Starting at 7:15 sharp, please be at the pillar by 7:10.',true, now() - interval '3 hours'
  FROM public.rides rd WHERE rd.is_demo AND rd.origin_name='LB Nagar' AND rd.direction='to_campus' LIMIT 1;
  INSERT INTO public.messages (ride_id,sender_id,body,is_demo,created_at)
  SELECT rd.id,'d0000000-0000-4000-8000-000000000011','Got it, I will be there. Thanks!',true, now() - interval '2 hours 50 minutes'
  FROM public.rides rd WHERE rd.is_demo AND rd.origin_name='LB Nagar' AND rd.direction='to_campus' LIMIT 1;
  INSERT INTO public.messages (ride_id,sender_id,body,is_demo,created_at)
  SELECT rd.id,'d0000000-0000-4000-8000-000000000001','Traffic near Hayathnagar today, leaving 5 min early.',true, now() - interval '40 minutes'
  FROM public.rides rd WHERE rd.is_demo AND rd.origin_name='LB Nagar' AND rd.direction='to_campus' LIMIT 1;

  -- demo impact history (last 30 days)
  INSERT INTO public.impact_events (user_id, ride_id, km_shared, co2_saved_kg, money_saved, seats_filled, occurred_at, is_demo)
  SELECT p.id, NULL,
         round((12 + (random()*18))::numeric,2),
         round((12 + (random()*18))::numeric * 0.171,3),
         round((12 + (random()*18))::numeric * 7,2),
         1 + (random()*2)::int,
         now() - (g || ' days')::interval,
         true
  FROM public.profiles p
  CROSS JOIN generate_series(1,18) g
  WHERE p.is_demo;
END; $$;

CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only administrators can reset demo data';
  END IF;
  DELETE FROM public.impact_events WHERE is_demo;
  DELETE FROM public.messages WHERE is_demo;
  DELETE FROM public.ride_requests WHERE is_demo;
  DELETE FROM public.ride_stops WHERE ride_id IN (SELECT id FROM public.rides WHERE is_demo);
  DELETE FROM public.rides WHERE is_demo;
  DELETE FROM public.profiles WHERE is_demo;
  PERFORM public.seed_demo_data();
  RETURN 'Demo data regenerated';
END; $$;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;

SELECT public.seed_demo_data();