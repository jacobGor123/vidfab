-- ===========================================
-- VidFab AI Video Platform
-- Supabase Storage Initialization Script
-- ===========================================
-- This script creates storage buckets and security policies
-- Run this in Supabase SQL Editor
-- ===========================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'user-videos',
    'user-videos',
    true,
    524288000, -- 500MB limit
    ARRAY['video/mp4', 'video/webm', 'video/quicktime']
  ),
  (
    'video-thumbnails',
    'video-thumbnails',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- USER VIDEOS BUCKET POLICIES
-- ===========================================

-- Allow users to SELECT their own videos
CREATE POLICY "Users can view own videos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to INSERT their own videos
CREATE POLICY "Users can upload own videos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to UPDATE their own videos
CREATE POLICY "Users can update own videos" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to DELETE their own videos
CREATE POLICY "Users can delete own videos" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===========================================
-- VIDEO THUMBNAILS BUCKET POLICIES
-- ===========================================

-- Allow users to SELECT their own thumbnails
CREATE POLICY "Users can view own thumbnails" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'video-thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to INSERT their own thumbnails
CREATE POLICY "Users can upload own thumbnails" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'video-thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to UPDATE their own thumbnails
CREATE POLICY "Users can update own thumbnails" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'video-thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to DELETE their own thumbnails
CREATE POLICY "Users can delete own thumbnails" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'video-thumbnails'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===========================================
-- VERIFICATION AND CLEANUP
-- ===========================================

-- Verify buckets were created
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('user-videos', 'video-thumbnails');

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%video%'
ORDER BY policyname;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Storage buckets and policies created successfully!';
    RAISE NOTICE '📹 user-videos bucket: 500MB limit, supports MP4/WebM/QuickTime';
    RAISE NOTICE '🖼️ video-thumbnails bucket: 5MB limit, supports JPEG/PNG/WebP';
    RAISE NOTICE '🔒 RLS policies ensure users can only access their own files';
END $$;