# Admin Dashboard Deployment Guide

## 📋 Overview

This guide walks you through deploying the admin dashboard for managing Users, Orders, and Tasks.

## 🗄️ Step 1: Database Setup

### Execute SQL Schema

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `docs/database-schema.sql`
4. Execute the SQL script

This will create:
- `orders` table
- 6 task tables (video_generation_tasks, audio_generation_tasks, etc.)
- All necessary indexes
- Auto-update triggers

### Verify Tables Created

Run this query to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'orders',
    'video_generation_tasks',
    'audio_generation_tasks',
    'watermark_removal_tasks',
    'video_upscaler_tasks',
    'video_effect_tasks',
    'video_face_swap_tasks'
  );
```

You should see all 7 tables listed.

## 🔐 Step 2: Configure Admin Access

### Set Admin Email(s)

Add the following environment variable to your `.env.local` file (for local development) and Vercel environment variables (for production):

```bash
# Admin email addresses (comma-separated for multiple admins)
ADMIN_EMAILS=your-email@example.com,another-admin@example.com
```

**Important:**
- Use comma-separated emails for multiple admins
- Email matching is case-insensitive
- These emails must match the email in your Supabase `users` table

### Example Configuration

```bash
# Single admin
ADMIN_EMAILS=admin@vidfab.ai

# Multiple admins
ADMIN_EMAILS=admin@vidfab.ai,manager@vidfab.ai,support@vidfab.ai
```

## 🚀 Step 3: Deploy to Production

### For Vercel:

1. **Add Environment Variable:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `ADMIN_EMAILS` with your admin email(s)
   - Select all environments (Production, Preview, Development)

2. **Redeploy:**
   ```bash
   git add .
   git commit -m "feat: Add admin dashboard"
   git push origin main
   ```

3. **Verify Deployment:**
   - Wait for deployment to complete
   - Visit `https://your-domain.com/admin/users`
   - You should be redirected to home if not logged in as admin

## 🧪 Step 4: Testing

### Test Admin Access

1. **Login with Admin Email:**
   - Logout if currently logged in
   - Login using one of the admin emails configured in `ADMIN_EMAILS`

2. **Access Admin Dashboard:**
   - Navigate to `/admin/users`
   - You should see the Users management page
   - Try navigating to `/admin/paid-orders` and `/admin/tasks`

3. **Test Non-Admin Access:**
   - Logout
   - Login with a non-admin email
   - Try accessing `/admin/users`
   - You should be redirected to the homepage

### Test Functionality

1. **Users Page:**
   - Should display all registered users
   - Columns: UUID, Avatar, Email, Name, Provider, Plan, Credits, Verified, Created At

2. **Orders Page:**
   - Should display all paid orders
   - Should show total revenue
   - Columns: Order No, Paid Email, Product, Amount, Interval, Status, Paid At, Created At

3. **Tasks Page:**
   - Should display all tasks
   - Task type filter should work
   - Load more button should load next batch of tasks
   - Statistics should show: Total, Completed, Failed, Processing

## 📊 Step 5: Verify Data Flow

### Check if Data is Flowing

If you have existing data in your system:

1. **Users:** Should already be visible (if you have registered users)
2. **Orders:** Add a test order via Stripe webhook or manually insert:

```sql
INSERT INTO orders (
  order_no,
  paid_email,
  product_name,
  amount,
  status,
  interval
) VALUES (
  'TEST_ORDER_001',
  'test@example.com',
  'Pro Plan',
  29.99,
  'paid',
  'month'
);
```

3. **Tasks:** Create a test task or manually insert:

```sql
INSERT INTO video_generation_tasks (
  user_email,
  image_url,
  prompt,
  status,
  progress,
  credits_used
) VALUES (
  'test@example.com',
  'https://example.com/test.jpg',
  'Test video generation',
  'completed',
  100,
  10
);
```

## 🔍 Troubleshooting

### Issue: "Unauthorized: Admin access required"

**Solution:**
1. Verify `ADMIN_EMAILS` is set correctly in environment variables
2. Check that your logged-in email matches one of the admin emails
3. Restart your development server or redeploy

### Issue: "Failed to load users/orders/tasks"

**Solution:**
1. Check Supabase connection
2. Verify tables exist in database
3. Check Supabase service role key is set: `SUPABASE_SERVICE_ROLE_KEY`
4. Check browser console and server logs for detailed errors

### Issue: Tables not created

**Solution:**
1. Re-run the SQL script from `docs/database-schema.sql`
2. Check for SQL errors in Supabase SQL Editor
3. Ensure you have proper permissions in Supabase

### Issue: Images/Videos not loading

**Solution:**
1. Check that URLs in database are valid and accessible
2. Verify CORS settings if media is hosted externally
3. Check browser console for loading errors

## 📁 File Structure Reference

```
vidfab/
├── app/
│   ├── (main)/admin/
│   │   ├── layout.tsx              # Admin layout with navigation
│   │   ├── users/page.tsx          # Users management page
│   │   ├── paid-orders/page.tsx    # Orders management page
│   │   └── tasks/page.tsx          # Tasks management page
│   └── api/admin/
│       └── tasks/route.ts          # Tasks API endpoint
├── components/
│   ├── admin/
│   │   ├── media-preview.tsx       # Image/video preview component
│   │   ├── task-type-filter.tsx    # Task filter component
│   │   └── tasks-list-with-pagination.tsx
│   ├── blocks/table/
│   │   └── index.tsx               # Core table component
│   └── dashboard/slots/table/
│       └── index.tsx               # Table slot wrapper
├── lib/admin/
│   ├── auth.ts                     # Admin authentication logic
│   └── all-tasks-fetcher.ts        # Tasks fetching and aggregation
├── models/
│   ├── db.ts                       # Database client
│   ├── user.ts                     # User data access
│   └── order.ts                    # Order data access
├── types/
│   ├── admin/
│   │   ├── tasks.d.ts              # Task type definitions
│   │   ├── order.d.ts              # Order type definitions
│   │   └── user.d.ts               # User type definitions
│   ├── blocks/
│   │   └── table.d.ts              # Table block types
│   └── slots/
│       └── table.d.ts              # Table slot types
└── docs/
    ├── database-schema.sql         # SQL schema to create tables
    └── admin-dashboard-deployment-guide.md  # This file
```

## 🎯 Next Steps

After successfully deploying:

1. **Monitor Usage:**
   - Check admin dashboard regularly
   - Monitor task completion rates
   - Track order revenue

2. **Customize:**
   - Adjust table columns as needed
   - Add additional filters
   - Implement search functionality

3. **Extend:**
   - Add export to CSV functionality
   - Implement user management actions (ban, delete, etc.)
   - Add charts and analytics

## 🔒 Security Best Practices

1. **Never commit `.env.local` to git**
2. **Use strong, unique admin emails**
3. **Regularly audit admin access logs**
4. **Keep Supabase service role key secure**
5. **Enable 2FA for admin email accounts**

## 📞 Support

If you encounter issues:

1. Check server logs in Vercel
2. Check Supabase logs
3. Review browser console errors
4. Check this deployment guide

---

**Last Updated:** 2025-01-22
**Version:** 1.0
