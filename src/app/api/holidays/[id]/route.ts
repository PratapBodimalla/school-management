import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

async function checkAdminAccess(request: NextRequest): Promise<boolean> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return false;
        }
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return false;
        }
        const { data: profile } = await supabaseAdmin
            .from('users_profile')
            .select('role')
            .eq('id', user.id)
            .single();
        return profile?.role === 'Admin';
    } catch (error) {
        console.error('Error checking admin access:', error);
        return false;
    }
}

// PATCH /api/holidays/:id
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const isAdmin = await checkAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });
        }

        const body = await request.json();
        const update: Record<string, any> = {};

        if (typeof body.title === 'string') update.title = body.title;
        if (typeof body.type === 'string' && ['Holiday', 'Event', 'Exam', 'Break', 'Other'].includes(body.type)) update.type = body.type;
        if (typeof body.is_multi_day === 'boolean') update.is_multi_day = body.is_multi_day;
        if (typeof body.start_date === 'string') update.start_date = body.start_date;
        if (typeof body.end_date === 'string' || body.end_date === null) update.end_date = body.end_date;
        if (typeof body.description === 'string' || body.description === null) update.description = body.description;

        // fetch existing to validate transitions
        const { data: existing, error: existingErr } = await supabaseAdmin
            .from('holidays')
            .select('id, start_date, end_date, is_multi_day')
            .eq('id', id)
            .single();
        if (existingErr) {
            if ((existingErr as any).code === 'PGRST116') {
                return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
            }
            console.error('Error loading holiday:', existingErr);
            return NextResponse.json({ error: 'Failed to load holiday' }, { status: 500 });
        }

        const nextIsMulti = update.is_multi_day ?? existing.is_multi_day;
        const nextStart = update.start_date ?? existing.start_date;
        const nextEnd = Object.prototype.hasOwnProperty.call(update, 'end_date') ? update.end_date : existing.end_date;

        if (nextIsMulti) {
            if (!nextEnd) {
                return NextResponse.json({ error: 'end_date is required when is_multi_day is true' }, { status: 400 });
            }
            if (new Date(nextEnd) < new Date(nextStart)) {
                return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 });
            }
        } else {
            // single-day → ensure end_date is null
            update.end_date = null;
        }

        const { data: holiday, error: updateErr } = await supabaseAdmin
            .from('holidays')
            .update({ ...update, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();

        if (updateErr) {
            const code = (updateErr as any).code;
            if (code === '23505') {
                return NextResponse.json({ error: 'Duplicate holiday for that date/title' }, { status: 409 });
            }
            if (code === '23514' || code === '22007') {
                return NextResponse.json({ error: 'Invalid date range or format' }, { status: 400 });
            }
            console.error('Error updating holiday:', updateErr);
            return NextResponse.json({ error: 'Failed to update holiday' }, { status: 500 });
        }

        return NextResponse.json({ success: true, holiday });
    } catch (e) {
        console.error('Error in PATCH /api/holidays/[id]:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/holidays/:id
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const isAdmin = await checkAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });
        }

        const { error: delErr } = await supabaseAdmin
            .from('holidays')
            .delete()
            .eq('id', id);
        if (delErr) {
            console.error('Error deleting holiday:', delErr);
            return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Error in DELETE /api/holidays/[id]:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


