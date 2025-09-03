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

// GET /api/teachers/:id
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const isAdmin = await checkAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });
        }

        const { data: teacher, error } = await supabaseAdmin
            .from('teachers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if ((error as any).code === 'PGRST116') {
                return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
            }
            console.error('Error fetching teacher:', error);
            return NextResponse.json({ error: 'Failed to fetch teacher' }, { status: 500 });
        }

        return NextResponse.json(teacher);
    } catch (e) {
        console.error('Error in GET /api/teachers/[id]:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/teachers/:id
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
        if (!body.first_name || !body.last_name) {
            return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
        }

        // Check existing teacher
        const { data: existing, error: existingErr } = await supabaseAdmin
            .from('teachers')
            .select('id, email')
            .eq('id', id)
            .single();
        if (existingErr) {
            if ((existingErr as any).code === 'PGRST116') {
                return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
            }
            console.error('Error checking teacher:', existingErr);
            return NextResponse.json({ error: 'Failed to check teacher' }, { status: 500 });
        }

        if (body.email && body.email !== existing.email) {
            const { data: dup } = await supabaseAdmin
                .from('teachers')
                .select('id')
                .eq('email', body.email)
                .neq('id', id)
                .maybeSingle();
            if (dup) {
                return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
            }
        }

        const { data: updated, error: updateErr } = await supabaseAdmin
            .from('teachers')
            .update({
                ...body,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*')
            .single();

        if (updateErr) {
            console.error('Error updating teacher:', updateErr);
            return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
        }

        return NextResponse.json(updated);
    } catch (e) {
        console.error('Error in PATCH /api/teachers/[id]:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/teachers/:id
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

        // Find teacher by id
        const { data: teacher, error: fetchErr } = await supabaseAdmin
            .from('teachers')
            .select('id, email')
            .eq('id', id)
            .single();
        if (fetchErr) {
            if ((fetchErr as any).code === 'PGRST116') {
                return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
            }
            console.error('Error fetching teacher:', fetchErr);
            return NextResponse.json({ error: 'Failed to fetch teacher' }, { status: 500 });
        }

        // Try to find auth user via users_profile by email
        let authUserId: string | null = null;
        try {
            const { data: profileRow } = await supabaseAdmin
                .from('users_profile')
                .select('id')
                .eq('email', teacher.email)
                .maybeSingle();
            authUserId = profileRow?.id ?? null;
        } catch {
            authUserId = null;
        }

        if (authUserId) {
            try { await supabaseAdmin.auth.admin.deleteUser(authUserId); } catch (e) { console.error('Error deleting auth user:', e); }
            try { await supabaseAdmin.from('users_profile').delete().eq('id', authUserId); } catch (e) { console.error('Error deleting users_profile:', e); }
        }

        const { error: delErr } = await supabaseAdmin
            .from('teachers')
            .delete()
            .eq('id', id);
        if (delErr) {
            console.error('Error deleting teacher:', delErr);
            return NextResponse.json({ error: 'Failed to delete teacher' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Teacher deleted successfully', deletedTeacherId: id, authUserDeleted: Boolean(authUserId) });
    } catch (e) {
        console.error('Error in DELETE /api/teachers/[id]:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


