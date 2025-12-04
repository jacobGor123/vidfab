/**
 * Blog Model - Data Access Layer
 * Handles all blog-related database operations
 */

import { supabaseAdmin } from '@/lib/supabase';

/**
 * Blog Post Type Definition
 */
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;

  // SEO fields
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;

  // Categories and tags
  category: string | null;
  tags: string[] | null;

  // Status management
  status: 'draft' | 'scheduled' | 'published';
  scheduled_at: string | null;
  published_at: string | null;

  // Statistics
  view_count: number;
  read_time_minutes: number | null;

  // Content structure
  table_of_contents: TableOfContentsItem[] | null;
  faq_schema: FAQItem[] | null;

  // Author
  author_uuid: string | null;

  // Audit fields
  created_at: string;
  updated_at: string;
}

export interface TableOfContentsItem {
  title: string;
  id: string;
  level?: number;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface BlogImage {
  id: string;
  post_id: string;
  image_url: string;
  alt_text: string | null;
  caption: string | null;
  display_order: number;
  created_at: string;
}

/**
 * Get paginated list of blog posts
 * @param params - Query parameters
 * @returns Array of blog posts or undefined on error
 */
export async function getBlogPosts(params: {
  status?: 'draft' | 'scheduled' | 'published' | 'all';
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<BlogPost[] | undefined> {
  const { status = 'all', category, limit = 20, offset = 0 } = params;

  let query = supabaseAdmin
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching blog posts:', error);
    return undefined;
  }

  return data as BlogPost[];
}

/**
 * Get total count of blog posts
 * @param status - Optional status filter
 * @returns Total count or 0 on error
 */
export async function getBlogPostsCount(
  status?: 'draft' | 'scheduled' | 'published'
): Promise<number> {
  const supabase = supabaseAdmin;

  let query = supabase
    .from('blog_posts')
    .select('id', { count: 'exact', head: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error counting blog posts:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get blog post by slug
 * @param slug - Post slug
 * @returns Blog post or undefined
 */
export async function getBlogPostBySlug(
  slug: string
): Promise<BlogPost | undefined> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching blog post by slug:', error);
    return undefined;
  }

  return data as BlogPost;
}

/**
 * Get blog post by ID
 * @param id - Post ID
 * @returns Blog post or undefined
 */
export async function getBlogPostById(id: string): Promise<BlogPost | undefined> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching blog post by ID:', error);
    return undefined;
  }

  return data as BlogPost;
}

/**
 * Create a new blog post
 * @param postData - Blog post data
 * @returns Created blog post or undefined on error
 */
export async function createBlogPost(
  postData: Partial<BlogPost>
): Promise<BlogPost | undefined> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(postData)
    .select()
    .single();

  if (error) {
    console.error('Error creating blog post:', error);
    return undefined;
  }

  return data as BlogPost;
}

/**
 * Update a blog post
 * @param id - Post ID
 * @param updates - Fields to update
 * @returns Updated blog post or undefined on error
 */
export async function updateBlogPost(
  id: string,
  updates: Partial<BlogPost>
): Promise<BlogPost | undefined> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating blog post:', error);
    return undefined;
  }

  return data as BlogPost;
}

/**
 * Delete a blog post
 * @param id - Post ID
 * @returns True if successful, false otherwise
 */
export async function deleteBlogPost(id: string): Promise<boolean> {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting blog post:', error);
    return false;
  }

  return true;
}

/**
 * Get scheduled posts ready to be published
 * @returns Array of scheduled posts or undefined on error
 */
export async function getScheduledPostsReadyToPublish(): Promise<
  BlogPost[] | undefined
> {
  const supabase = supabaseAdmin;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Error fetching scheduled posts:', error);
    return undefined;
  }

  return data as BlogPost[];
}

/**
 * Increment view count for a blog post
 * @param slug - Post slug
 * @returns True if successful, false otherwise
 */
export async function incrementViewCount(slug: string): Promise<boolean> {
  const supabase = supabaseAdmin;

  // First get the current view count
  const { data: post } = await supabase
    .from('blog_posts')
    .select('view_count')
    .eq('slug', slug)
    .single();

  if (!post) return false;

  const { error } = await supabase
    .from('blog_posts')
    .update({ view_count: (post.view_count || 0) + 1 })
    .eq('slug', slug);

  if (error) {
    console.error('Error incrementing view count:', error);
    return false;
  }

  return true;
}

/**
 * Get blog images for a post
 * @param postId - Post ID
 * @returns Array of blog images or undefined on error
 */
export async function getBlogImages(
  postId: string
): Promise<BlogImage[] | undefined> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('blog_images')
    .select('*')
    .eq('post_id', postId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching blog images:', error);
    return undefined;
  }

  return data as BlogImage[];
}

/**
 * Add image to a blog post
 * @param imageData - Blog image data
 * @returns Created blog image or undefined on error
 */
export async function addBlogImage(
  imageData: Partial<BlogImage>
): Promise<BlogImage | undefined> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('blog_images')
    .insert(imageData)
    .select()
    .single();

  if (error) {
    console.error('Error adding blog image:', error);
    return undefined;
  }

  return data as BlogImage;
}

/**
 * Delete a blog image
 * @param imageId - Image ID
 * @returns True if successful, false otherwise
 */
export async function deleteBlogImage(imageId: string): Promise<boolean> {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from('blog_images')
    .delete()
    .eq('id', imageId);

  if (error) {
    console.error('Error deleting blog image:', error);
    return false;
  }

  return true;
}

/**
 * Search blog posts by keyword
 * @param keyword - Search keyword
 * @param limit - Maximum number of results
 * @returns Array of matching blog posts or undefined on error
 */
export async function searchBlogPosts(
  keyword: string,
  limit: number = 10
): Promise<BlogPost[] | undefined> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .or(`title.ilike.%${keyword}%,excerpt.ilike.%${keyword}%`)
    .limit(limit)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Error searching blog posts:', error);
    return undefined;
  }

  return data as BlogPost[];
}

/**
 * Get related blog posts by category and tags
 * @param postId - Current post ID (to exclude from results)
 * @param category - Post category
 * @param tags - Post tags
 * @param limit - Maximum number of results
 * @returns Array of related blog posts or undefined on error
 */
export async function getRelatedPosts(
  postId: string,
  category: string | null,
  tags: string[] | null,
  limit: number = 3
): Promise<BlogPost[] | undefined> {
  const supabase = supabaseAdmin;

  let query = supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .neq('id', postId)
    .limit(limit)
    .order('published_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching related posts:', error);
    return undefined;
  }

  return data as BlogPost[];
}

/**
 * Increment view count for a blog post
 * @param postId - Blog post ID
 * @returns True if successful, false otherwise
 */
export async function incrementBlogViewCount(
  postId: string
): Promise<boolean> {
  const supabase = supabaseAdmin;

  const { error } = await supabase.rpc('increment_blog_view_count', {
    post_id: postId,
  });

  if (error) {
    console.error('Error incrementing view count:', error);
    return false;
  }

  return true;
}
