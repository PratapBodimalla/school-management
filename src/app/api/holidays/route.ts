import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function checkAdminAccess(request: NextRequest): Promise<{ ok: boolean; userId?: string }> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { ok: false };
        }
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return { ok: false };
        }
        const { data: profile } = await supabaseAdmin
            .from('users_profile')
            .select('role')
            .eq('id', user.id)
            .single();
        const isAdmin = profile?.role === 'Admin';
        return { ok: isAdmin, userId: user.id };
    } catch (error) {
        console.error('Error checking admin access:', error);
        return { ok: false };
    }
}

function parseYearMonthBounds(year?: number, month?: number): { startISO?: string; endISO?: string } {
    if (!year) return {};
    if (!month) {
        const start = new Date(Date.UTC(year, 0, 1));
        const end = new Date(Date.UTC(year + 1, 0, 1));
        return { startISO: start.toISOString().slice(0, 10), endISO: end.toISOString().slice(0, 10) };
    }
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
    return { startISO: start.toISOString().slice(0, 10), endISO: end.toISOString().slice(0, 10) };
}

// GET /api/holidays - list with filters and pagination (no admin gate required)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('school_id');
        const year = searchParams.get('year') ? parseInt(searchParams.get('year') as string, 10) : undefined;
        const month = searchParams.get('month') ? parseInt(searchParams.get('month') as string, 10) : undefined;
        const q = searchParams.get('q') || '';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        if (!schoolId) {
            return NextResponse.json({ error: 'school_id is required' }, { status: 400 });
        }

        let query = supabaseAdmin
            .from('holidays')
            .select('*', { count: 'exact' })
            .eq('school_id', schoolId);

        if (q) {
            query = query.ilike('title', `%${q}%`);
        }

        if (year) {
            const { startISO, endISO } = parseYearMonthBounds(year, month);
            if (startISO && endISO) {
                query = query.gte('start_date', startISO).lt('start_date', endISO);
            }
        }

        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.order('start_date', { ascending: true }).range(from, to);

        const { data: holidays, error, count } = await query;
        if (error) {
            console.error('Error fetching holidays:', error);
            return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
        }

        return NextResponse.json({
            holidays,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (e) {
        console.error('Error in GET /api/holidays:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/holidays - create (admin only)
export async function POST(request: NextRequest) {
    try {
        const access = await checkAdminAccess(request);
        if (!access.ok) {
            return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });
        }

        const body = await request.json();
        const {
            school_id,
            title,
            type,
            is_multi_day,
            date,
            start_date,
            end_date,
            description
        } = body as {
            school_id: string;
            title: string;
            type?: string;
            is_multi_day?: boolean;
            date?: string;
            start_date?: string;
            end_date?: string | null;
            description?: string | null;
        };

        if (!school_id || !title) {
            return NextResponse.json({ error: 'school_id and title are required' }, { status: 400 });
        }

        const normalizedType = (type && ['Holiday', 'Event', 'Exam', 'Break', 'Other'].includes(type)) ? type : 'Holiday';
        const multi = Boolean(is_multi_day);

        let finalStart = '';
        let finalEnd: string | null = null;

        if (multi) {
            if (!start_date || !end_date) {
                return NextResponse.json({ error: 'start_date and end_date are required for multi-day holidays' }, { status: 400 });
            }
            if (new Date(end_date) < new Date(start_date)) {
                return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 });
            }
            finalStart = start_date;
            finalEnd = end_date;
        } else {
            const oneDay = date || start_date;
            if (!oneDay) {
                return NextResponse.json({ error: 'date is required for single-day holidays' }, { status: 400 });
            }
            finalStart = oneDay;
            finalEnd = null;
        }

        const insertPayload = {
            school_id,
            title,
            type: normalizedType,
            is_multi_day: multi,
            start_date: finalStart,
            end_date: finalEnd,
            description: description ?? null,
            created_by: access.userId
        };

        const { data: holiday, error: insertError } = await supabaseAdmin
            .from('holidays')
            .insert(insertPayload)
            .select('*')
            .single();

        if (insertError) {
            const code = (insertError as any).code;
            if (code === '23505') { // unique_violation
                return NextResponse.json({ error: 'Duplicate holiday for that date/title' }, { status: 409 });
            }
            if (code === '23514' || code === '22007') { // check_violation or invalid_datetime_format
                return NextResponse.json({ error: 'Invalid date range or format' }, { status: 400 });
            }
            console.error('Error inserting holiday:', insertError);
            return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 });
        }

        return NextResponse.json({ success: true, holiday }, { status: 201 });
    } catch (e) {
        console.error('Error in POST /api/holidays:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


