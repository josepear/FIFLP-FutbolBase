-- 0003: permitir que un admin vincule al nuevo usuario a su club
-- pasando club_id en raw_user_meta_data (el primer usuario sigue siendo admin+club).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_club_id UUID;
  display_name TEXT;
  requested_role TEXT;
  requested_club UUID;
BEGIN
  display_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), NEW.email);
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'player');
  requested_club := NULLIF(NEW.raw_user_meta_data->>'club_id', '')::uuid;

  IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
    INSERT INTO public.clubs (name) VALUES (display_name || ' Club') RETURNING id INTO new_club_id;
    INSERT INTO public.profiles (id, email, full_name, role, club_id)
    VALUES (NEW.id, NEW.email, display_name, 'admin', new_club_id);
  ELSE
    INSERT INTO public.profiles (id, email, full_name, role, club_id)
    VALUES (NEW.id, NEW.email, display_name, CASE WHEN requested_role = 'coach' THEN 'coach' ELSE 'player' END, requested_club);
  END IF;

  RETURN NEW;
END;
$$;
