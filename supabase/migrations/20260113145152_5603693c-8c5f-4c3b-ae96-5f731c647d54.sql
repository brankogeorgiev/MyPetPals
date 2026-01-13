-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create pets table
CREATE TABLE public.pets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pet_type TEXT NOT NULL,
  breed TEXT,
  age_years INTEGER,
  age_months INTEGER,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pets
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Pets policies
CREATE POLICY "Users can view their own pets"
  ON public.pets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pets"
  ON public.pets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pets"
  ON public.pets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pets"
  ON public.pets FOR DELETE
  USING (auth.uid() = user_id);

-- Create pet_events table for vet visits, reminders, etc.
CREATE TABLE public.pet_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  photo_url TEXT,
  is_reminder BOOLEAN NOT NULL DEFAULT false,
  reminder_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pet_events
ALTER TABLE public.pet_events ENABLE ROW LEVEL SECURITY;

-- Pet events policies
CREATE POLICY "Users can view their own pet events"
  ON public.pet_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pet events"
  ON public.pet_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pet events"
  ON public.pet_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pet events"
  ON public.pet_events FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pet_events_updated_at
  BEFORE UPDATE ON public.pet_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for pet photos
INSERT INTO storage.buckets (id, name, public) VALUES ('pet-photos', 'pet-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view pet photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pet-photos');

CREATE POLICY "Authenticated users can upload pet photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pet-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own pet photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pet-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own pet photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pet-photos' AND auth.uid() IS NOT NULL);