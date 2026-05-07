import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from('blog_posts')
    .select('slug, title, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  data?.forEach(p => console.log(p.created_at.slice(0, 10), `[${p.status}]`, p.slug))
}

main()
