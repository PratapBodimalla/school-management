import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { class_id, section_id, date, records } = body as {
            class_id: string;
            section_id: string;
            date: string; // YYYY-MM-DD
            records: Array<{ student_id: string; status: string }>;
        };

        if (!class_id || !section_id || !date || !Array.isArray(records)) {
            return NextResponse.json({ error: 'class_id, section_id, date and records are required' }, { status: 400 });
        }

        // Resolve teacher and school
        const { data: teacher } = await supabaseAdmin
            .from('teachers')
            .select('id, school_id')
            .eq('user_id', user.id)
            .maybeSingle();
        if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 403 });

        const allowed = new Set(['Present', 'Absent', 'Late']);
        const rows = [] as any[];
        for (const r of records) {
            if (!r?.student_id) continue;
            const status = typeof r.status === 'string' ? r.status : 'Present';
            if (!allowed.has(status)) return NextResponse.json({ error: `Invalid status for ${r.student_id}` }, { status: 400 });
            rows.push({
                school_id: teacher.school_id,
                class_id,
                section_id,
                attendance_date: date,
                student_id: r.student_id,
                teacher_id: teacher.id,
                status,
            });
        }

        if (rows.length === 0) return NextResponse.json({ error: 'No records' }, { status: 400 });

        // Upsert into attendance_records table. Expect unique key on (school_id, class_id, section_id, attendance_date, student_id)
        const { error } = await supabaseAdmin
            .from('attendance_records')
            .upsert(rows, { onConflict: 'school_id,class_id,section_id,attendance_date,student_id' });
        if (error) {
            console.error('attendance upsert error:', error);
            return NextResponse.json({ error: 'Failed to save attendance', details: error.message || String(error) }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: rows.length });
    } catch (e) {
        console.error('POST /api/attendance/mark error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


