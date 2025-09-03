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
        if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const today = new Date();
        const monday = toMondayISO(today);
        const todayDow = ((today.getUTCDay() + 6) % 7) + 1; // 1..7

        // Resolve student record
        const { data: student } = await supabaseAdmin
            .from('students')
            .select('id, school_id, class_id, section_id')
            .eq('email', user.email)
            .maybeSingle();
        if (!student) return NextResponse.json({ classesCount: 0, schedule: [], attendance: { present: 0, absent: 0 } });

        // Today's timetable for student class/section
        const { data: rows, error } = await supabaseAdmin
            .from('timetable')
            .select('day_of_week, period_no, start_time, end_time, classes(name), sections(name)')
            .eq('school_id', student.school_id)
            .eq('class_id', student.class_id)
            .eq('section_id', student.section_id)
            .eq('week_start', monday)
            .eq('day_of_week', todayDow)
            .order('period_no', { ascending: true });
        if (error) {
            console.error('student overview timetable error:', error);
            return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
        }

        // Attendance summary for current month (example scope)
        const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);
        const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
        const { data: attRows } = await supabaseAdmin
            .from('attendance_records')
            .select('status')
            .eq('school_id', student.school_id)
            .eq('student_id', student.id)
            .gte('attendance_date', monthStart)
            .lt('attendance_date', monthEnd);
        const present = (attRows || []).filter(r => r.status === 'Present').length;
        const absent = (attRows || []).filter(r => r.status === 'Absent').length;

        return NextResponse.json({ classesCount: rows?.length || 0, schedule: rows ?? [], attendance: { present, absent } });
    } catch (e) {
        console.error('GET /api/student/overview/today exception:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


