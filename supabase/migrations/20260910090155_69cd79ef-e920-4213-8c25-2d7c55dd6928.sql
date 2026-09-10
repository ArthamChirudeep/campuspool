ALTER TABLE public.rides DROP COLUMN IF EXISTS fare_share;
ALTER TABLE public.impact_events DROP COLUMN IF EXISTS money_saved;
ALTER TABLE public.campus_settings DROP COLUMN IF EXISTS fuel_price_per_litre;
ALTER TABLE public.campus_settings DROP COLUMN IF EXISTS km_per_litre;

CREATE OR REPLACE FUNCTION public.seed_demo_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c_lat double precision := 17.19680;
  c_lng double precision := 78.60690;
  d date := current_date;
  r record;
  ride_id uuid;
BEGIN
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
   ('d0000000-0000-4000-8000-000000000012','Harshitha Reddy','+91 90000 10012','Civil',1,'Hayathnagar','Loves a greener commute.',false,NULL,NULL,NULL,4.92,8,true)
  ON CONFLICT (id) DO NOTHING;

  FOR r IN
    SELECT * FROM (VALUES
      ('d0000000-0000-4000-8000-000000000001'::uuid,'LB Nagar',17.34570,78.55220,'07:15'::time,4,3,22.4,48,'Pick-up at LB Nagar metro pillar 1245.'),
      ('d0000000-0000-4000-8000-000000000002'::uuid,'Dilsukhnagar',17.36870,78.52470,'07:30'::time,3,2,26.8,55,'Waiting near Konark theatre bus bay.'),
      ('d0000000-0000-4000-8000-000000000003'::uuid,'Uppal',17.39800,78.55900,'07:00'::time,4,2,29.5,62,'Strictly on time, 8am lab.'),
      ('d0000000-0000-4000-8000-000000000004'::uuid,'Vanasthalipuram',17.32430,78.57940,'07:45'::time,3,3,17.9,38,'Girls-only ride, comfortable and safe.'),
      ('d0000000-0000-4000-8000-000000000010'::uuid,'Ibrahimpatnam',17.18990,78.63160,'08:20'::time,3,2,4.6,12,'Short hop from Ibrahimpatnam bus stand.'),
      ('d0000000-0000-4000-8000-000000000007'::uuid,'Nagole',17.36730,78.55860,'07:20'::time,4,3,24.1,52,'Nagole X-road, near the metro steps.')
    ) AS t(driver,area,lat,lng,dep,seats,avail,km,mins,note)
  LOOP
    INSERT INTO public.rides (driver_id,direction,origin_name,origin_lat,origin_lng,dest_name,dest_lat,dest_lng,departure_time,is_recurring,recurrence_days,seats_total,seats_available,notes,distance_km,duration_min,is_demo)
    VALUES (r.driver,'to_campus',r.area,r.lat,r.lng,'CVR College of Engineering',c_lat,c_lng,r.dep,true,'{1,2,3,4,5}',r.seats,r.avail,r.note,r.km,r.mins,true)
    RETURNING id INTO ride_id;

    INSERT INTO public.ride_stops (ride_id,seq,name,lat,lng,eta_offset_min)
    SELECT ride_id, a.sort_order, a.name, a.lat, a.lng, 6 * row_number() over (order by a.sort_order)
    FROM public.areas a
    WHERE a.corridor = (SELECT corridor FROM public.areas WHERE name = r.area)
      AND a.name <> r.area
    LIMIT 2;
  END LOOP;

  FOR r IN
    SELECT * FROM (VALUES
      ('d0000000-0000-4000-8000-000000000005'::uuid,'Hayathnagar',17.32530,78.60550,'17:30'::time,1,1,14.2,32,'Two-wheeler, helmet provided.'),
      ('d0000000-0000-4000-8000-000000000001'::uuid,'LB Nagar',17.34570,78.55220,'18:00'::time,4,4,22.4,50,'Dropping at LB Nagar and Kothapet.'),
      ('d0000000-0000-4000-8000-000000000003'::uuid,'Uppal',17.39800,78.55900,'17:45'::time,4,3,29.5,66,'Evening return via Ring Road.'),
      ('d0000000-0000-4000-8000-000000000002'::uuid,'Dilsukhnagar',17.36870,78.52470,'19:15'::time,3,3,26.8,58,'After project review, late return.')
    ) AS t(driver,area,lat,lng,dep,seats,avail,km,mins,note)
  LOOP
    INSERT INTO public.rides (driver_id,direction,origin_name,origin_lat,origin_lng,dest_name,dest_lat,dest_lng,departure_time,ride_date,is_recurring,seats_total,seats_available,notes,distance_km,duration_min,is_demo)
    VALUES (r.driver,'from_campus','CVR College of Engineering',c_lat,c_lng,r.area,r.lat,r.lng,r.dep,d + 1,false,r.seats,r.avail,r.note,r.km,r.mins,true)
    RETURNING id INTO ride_id;
  END LOOP;

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

  INSERT INTO public.messages (ride_id,sender_id,body,is_demo,created_at)
  SELECT rd.id,'d0000000-0000-4000-8000-000000000001','Starting at 7:15 sharp, please be at the pillar by 7:10.',true, now() - interval '3 hours'
  FROM public.rides rd WHERE rd.is_demo AND rd.origin_name='LB Nagar' AND rd.direction='to_campus' LIMIT 1;
  INSERT INTO public.messages (ride_id,sender_id,body,is_demo,created_at)
  SELECT rd.id,'d0000000-0000-4000-8000-000000000011','Got it, I will be there. Thanks!',true, now() - interval '2 hours 50 minutes'
  FROM public.rides rd WHERE rd.is_demo AND rd.origin_name='LB Nagar' AND rd.direction='to_campus' LIMIT 1;
  INSERT INTO public.messages (ride_id,sender_id,body,is_demo,created_at)
  SELECT rd.id,'d0000000-0000-4000-8000-000000000001','Traffic near Hayathnagar today, leaving 5 min early.',true, now() - interval '40 minutes'
  FROM public.rides rd WHERE rd.is_demo AND rd.origin_name='LB Nagar' AND rd.direction='to_campus' LIMIT 1;

  INSERT INTO public.impact_events (user_id, ride_id, km_shared, co2_saved_kg, seats_filled, occurred_at, is_demo)
  SELECT p.id, NULL,
         round((12 + (random()*18))::numeric,2),
         round((12 + (random()*18))::numeric * 0.171,3),
         1 + (random()*2)::int,
         now() - (g || ' days')::interval,
         true
  FROM public.profiles p
  CROSS JOIN generate_series(1,18) g
  WHERE p.is_demo;
END; $function$;