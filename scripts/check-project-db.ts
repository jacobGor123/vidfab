
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load env vars immediately
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config()

async function main() {
    const { supabaseAdmin } = await import('../lib/supabase')

    const projectId = 'dde44422-a246-4eab-bd86-fb1972d0bddc'

    console.log(`🔍 Checking Project Status in DB: ${projectId}`)

    const { data: project, error } = await supabaseAdmin
        .from('video_agent_projects')
        .select('*')
        .eq('id', projectId)
        .single()

    if (error) {
        console.error('❌ Error fetching project:', error)
        return
    }

    console.log('📄 Project Data:')
    console.log(JSON.stringify({
        id: project.id,
        status: project.status,
        step_6_status: project.step_6_status,
        updated_at: project.updated_at,
        created_at: project.created_at,
        final_video_url: project.final_video_url
    }, null, 2))
}

main().catch(console.error)
