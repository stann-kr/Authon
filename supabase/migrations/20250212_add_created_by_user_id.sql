-- Add created_by_user_id column to guests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guests' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE public.guests ADD COLUMN created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;
