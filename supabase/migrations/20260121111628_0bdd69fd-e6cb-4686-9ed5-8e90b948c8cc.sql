-- Add recurrence fields to pet_events table
ALTER TABLE public.pet_events
ADD COLUMN recurrence_type text DEFAULT 'none',
ADD COLUMN recurrence_interval integer DEFAULT 1,
ADD COLUMN recurrence_end_date timestamp with time zone,
ADD COLUMN parent_event_id uuid REFERENCES public.pet_events(id) ON DELETE CASCADE;

-- Add index for parent_event_id for efficient querying
CREATE INDEX idx_pet_events_parent_event_id ON public.pet_events(parent_event_id);

-- Add comment to explain the recurrence_type values
COMMENT ON COLUMN public.pet_events.recurrence_type IS 'Values: none, daily, weekly, monthly, yearly';
COMMENT ON COLUMN public.pet_events.recurrence_interval IS 'Interval between occurrences (e.g., 2 for every 2 weeks)';
COMMENT ON COLUMN public.pet_events.recurrence_end_date IS 'End date for recurring events';
COMMENT ON COLUMN public.pet_events.parent_event_id IS 'Reference to the original event for recurring instances';