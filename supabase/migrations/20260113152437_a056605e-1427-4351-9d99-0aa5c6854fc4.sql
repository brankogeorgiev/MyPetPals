-- Add reminder_hours_before column to pet_events
-- This allows users to choose when to receive reminders (e.g., 1, 3, 6, 24, 48 hours before)
ALTER TABLE public.pet_events 
ADD COLUMN reminder_hours_before integer DEFAULT 24;