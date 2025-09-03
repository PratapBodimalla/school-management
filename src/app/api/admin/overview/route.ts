import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function checkAdminAccess(request: NextRequest): Promise<boolean> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) return false;
        const { data: profile } = await supabaseAdmin
            .from('users_profile')
            .select('role')
            .eq('id', user.id)
            .single();
        return profile?.role === 'Admin';
    } catch {
        return false;
    }
}

// GET /api/admin/overview?school_id=<uuid>
// Returns aggregate counts for dashboard cards
export async function GET(req: NextRequest) {
    try {
        const isAdmin = await checkAdminAccess(req);
        if (!isAdmin) return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('school_id') || 'f27cf87b-d3fb-41c1-8f23-0558c222768d';

        const [studentsRes, teachersRes, classesRes, sectionsRes] = await Promise.all([
            supabaseAdmin.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
            supabaseAdmin.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).or('status.eq.active,status.is.null'),
            supabaseAdmin.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
            supabaseAdmin.from('sections').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        ]);

        const resp = {
            students: studentsRes.count || 0,
            teachers: teachersRes.count || 0,
            classes: classesRes.count || 0,
            sections: sectionsRes.count || 0,
        };
        return NextResponse.json(resp);
    } catch (e) {
        console.error('GET /api/admin/overview error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


