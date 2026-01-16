-- Add location and custom_type fields to pet_events table
ALTER TABLE public.pet_events
ADD COLUMN location TEXT,
ADD COLUMN custom_type TEXT;