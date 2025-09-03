import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function toMondayISO(d: Date): string { const day = (d.getUTCDay() + 6) % 7; const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); m.setUTCDate(m.getUTCDate() - day); return m.toISOString().slice(0, 10); }

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

        const today = new Date();
        const monday = toMondayISO(today);
        const todayDow = ((today.getUTCDay() + 6) % 7) + 1; // 1..7

        // Resolve teacher id and school
        const { data: teacher } = await supabaseAdmin
            .from('teachers')
            .select('id, school_id')
            .eq('user_id', user.id)
            .maybeSingle();
        if (!teacher) return NextResponse.json({ classesCount: 0, pendingCount: 0, schedule: [] });

        // Fetch today's timetable entries for the teacher
        const { data: rows, error } = await supabaseAdmin
            .from('timetable')
            .select('day_of_week, period_no, start_time, end_time, class_id, section_id, classes(name), sections(name)')
            .eq('school_id', teacher.school_id)
            .eq('teacher_id', teacher.id)
            .eq('week_start', monday)
            .eq('day_of_week', todayDow)
            .order('period_no', { ascending: true });
        if (error) {
            console.error('teacher overview today error:', error);
            return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
        }

        const classesCount = rows?.length || 0;
        // Pending attendance: placeholder as rows count (since attendance not implemented)
        const pendingCount = rows?.length || 0;
        return NextResponse.json({ classesCount, pendingCount, schedule: rows ?? [] });
    } catch (e) {
        console.error('GET /api/teacher/overview/today exception:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


