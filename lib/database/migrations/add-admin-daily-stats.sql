-- Admin dashboard daily statistics
-- Creates an RPC for daily registrations and task counts.

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON public.users(created_at DESC);

CREATE OR REPLACE FUNCTION public.get_admin_daily_stats(
  p_days INTEGER DEFAULT 30,
  p_timezone TEXT DEFAULT 'Asia/Shanghai',
  p_include_video_agent BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  stat_date DATE,
  new_users INTEGER,
  video_tasks INTEGER,
  image_tasks INTEGER,
  video_agent_tasks INTEGER,
  total_tasks INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INTEGER;
  v_today DATE;
  v_start_date DATE;
  v_end_date DATE;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_start_utc TIMESTAMP;
  v_end_utc TIMESTAMP;
BEGIN
  v_days := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_today := (NOW() AT TIME ZONE p_timezone)::DATE;
  v_start_date := v_today - (v_days - 1);
  v_end_date := v_today + 1;

  -- TIMESTAMPTZ tables can compare directly against timezone-aware bounds.
  v_start_at := v_start_date::TIMESTAMP AT TIME ZONE p_timezone;
  v_end_at := v_end_date::TIMESTAMP AT TIME ZONE p_timezone;

  -- user_videos.created_at is TIMESTAMP WITHOUT TIME ZONE in the current schema.
  -- It is written by NOW() under Supabase's UTC session timezone, so treat it as UTC.
  v_start_utc := v_start_at AT TIME ZONE 'UTC';
  v_end_utc := v_end_at AT TIME ZONE 'UTC';

  RETURN QUERY
  WITH days AS (
    SELECT GENERATE_SERIES(v_start_date, v_today, INTERVAL '1 day')::DATE AS bucket_date
  ),
  users_by_day AS (
    SELECT
      (created_at AT TIME ZONE p_timezone)::DATE AS bucket_date,
      COUNT(*)::INTEGER AS user_count
    FROM public.users
    WHERE created_at >= v_start_at
      AND created_at < v_end_at
    GROUP BY 1
  ),
  videos_by_day AS (
    SELECT
      ((created_at AT TIME ZONE 'UTC') AT TIME ZONE p_timezone)::DATE AS bucket_date,
      COUNT(*)::INTEGER AS task_count
    FROM public.user_videos
    WHERE status IS DISTINCT FROM 'deleted'
      AND created_at >= v_start_utc
      AND created_at < v_end_utc
    GROUP BY 1
  ),
  images_by_day AS (
    SELECT
      (created_at AT TIME ZONE p_timezone)::DATE AS bucket_date,
      COUNT(*)::INTEGER AS task_count
    FROM public.user_images
    WHERE status IS DISTINCT FROM 'deleted'
      AND created_at >= v_start_at
      AND created_at < v_end_at
    GROUP BY 1
  ),
  video_agent_by_day AS (
    SELECT
      (created_at AT TIME ZONE p_timezone)::DATE AS bucket_date,
      COUNT(*)::INTEGER AS task_count
    FROM public.video_agent_projects
    WHERE p_include_video_agent
      AND created_at >= v_start_at
      AND created_at < v_end_at
    GROUP BY 1
  )
  SELECT
    d.bucket_date AS stat_date,
    COALESCE(u.user_count, 0) AS new_users,
    COALESCE(v.task_count, 0) AS video_tasks,
    COALESCE(i.task_count, 0) AS image_tasks,
    COALESCE(va.task_count, 0) AS video_agent_tasks,
    (
      COALESCE(v.task_count, 0)
      + COALESCE(i.task_count, 0)
      + CASE WHEN p_include_video_agent THEN COALESCE(va.task_count, 0) ELSE 0 END
    ) AS total_tasks
  FROM days d
  LEFT JOIN users_by_day u ON u.bucket_date = d.bucket_date
  LEFT JOIN videos_by_day v ON v.bucket_date = d.bucket_date
  LEFT JOIN images_by_day i ON i.bucket_date = d.bucket_date
  LEFT JOIN video_agent_by_day va ON va.bucket_date = d.bucket_date
  ORDER BY d.bucket_date;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_daily_stats(INTEGER, TEXT, BOOLEAN)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_admin_daily_stats IS
  'Returns daily admin analytics for new users and generation tasks over a recent date range.';
