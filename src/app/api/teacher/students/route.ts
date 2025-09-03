import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function authUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    return user ?? null;
}

export async function GET(req: NextRequest) {
    try {
        const user = await authUser(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const classId = searchParams.get('class_id') || '';
        const sectionId = searchParams.get('section_id') || '';
        const q = searchParams.get('q') || '';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        // Resolve teacher school
        const { data: teacher } = await supabaseAdmin
            .from('teachers')
            .select('school_id')
            .eq('user_id', user.id)
            .maybeSingle();
        if (!teacher) return NextResponse.json({ students: [] });

        let query = supabaseAdmin
            .from('students')
            .select('id, first_name, last_name, class_id, section_id', { count: 'exact' })
            .eq('school_id', teacher.school_id)
            .order('first_name', { ascending: true });

        if (classId) query = query.eq('class_id', classId);
        if (sectionId) query = query.eq('section_id', sectionId);
        if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);

        // pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) {
            console.error('GET /api/teacher/students error:', error);
            return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
        }
        return NextResponse.json({
            students: data ?? [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (e) {
        console.error('GET /api/teacher/students exception:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


