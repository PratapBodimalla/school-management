import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const FIXED_SCHOOL_ID = 'f27cf87b-d3fb-41c1-8f23-0558c222768d';

async function getAuthUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    return user ?? null;
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req);
        if (!user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('teachers')
            .update({
                status: 'active',
                onboarding_status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('email', user.email)
            .eq('school_id', FIXED_SCHOOL_ID)
            .select('*')
            .single();

        if (error) {
            console.error('Error activating teacher:', error);
            return NextResponse.json({ error: 'Failed to update teacher status' }, { status: 500 });
        }

        return NextResponse.json({ success: true, teacher: data });
    } catch (e) {
        console.error('Error in POST /api/teachers/activate:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


