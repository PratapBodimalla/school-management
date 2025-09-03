import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Helper function to check if user is admin
async function checkAdminAccess(request: NextRequest): Promise<boolean> {
    try {
        // Get the authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return false;
        }

        const token = authHeader.substring(7);

        // Verify the JWT token and get user info
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return false;
        }

        // Check if user has admin role in users_profile table
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

// GET /api/students/:id - Get student by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Check admin access
        const isAdmin = await checkAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Access denied. Admin role required.' },
                { status: 403 }
            );
        }

        const studentId = id;

        // Fetch student
        const { data: student, error: studentError } = await supabaseAdmin
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();

        if (studentError) {
            if (studentError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Student not found' }, { status: 404 });
            }
            console.error('Error fetching student:', studentError);
            return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
        }

        return NextResponse.json(student);

    } catch (error) {
        console.error('Error in GET /api/students/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/students/:id - Update student
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Check admin access
        const isAdmin = await checkAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Access denied. Admin role required.' },
                { status: 403 }
            );
        }

        const studentId = id;
        const body = await request.json();

        // Validate required fields
        if (!body.first_name || !body.last_name) {
            return NextResponse.json(
                { error: 'First name and last name are required' },
                { status: 400 }
            );
        }

        // Check if student exists
        const { data: existingStudent, error: existingError } = await supabaseAdmin
            .from('students')
            .select('id, email')
            .eq('id', studentId)
            .single();

        if (existingError) {
            if (existingError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Student not found' }, { status: 404 });
            }
            console.error('Error checking existing student:', existingError);
            return NextResponse.json({ error: 'Failed to check student' }, { status: 500 });
        }

        // Check for email uniqueness if email is being updated
        if (body.email && body.email !== existingStudent.email) {
            const { data: duplicateEmail } = await supabaseAdmin
                .from('students')
                .select('id')
                .eq('email', body.email)
                .neq('id', studentId)
                .single();

            if (duplicateEmail) {
                return NextResponse.json(
                    { error: 'Email already exists' },
                    { status: 409 }
                );
            }
        }

        // Update student
        const { data: updatedStudent, error: updateError } = await supabaseAdmin
            .from('students')
            .update({
                ...body,
                updated_at: new Date().toISOString()
            })
            .eq('id', studentId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating student:', updateError);
            return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
        }

        return NextResponse.json(updatedStudent);

    } catch (error) {
        console.error('Error in PATCH /api/students/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/students/:id - Delete student (hard delete)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // Check admin access
        const isAdmin = await checkAdminAccess(request);
        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Access denied. Admin role required.' },
                { status: 403 }
            );
        }

        const studentId = id;

        // Check if student exists
        const { data: existingStudent, error: existingError } = await supabaseAdmin
            .from('students')
            .select('id, email')
            .eq('id', studentId)
            .single();

        if (existingError) {
            if (existingError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Student not found' }, { status: 404 });
            }
            console.error('Error checking existing student:', existingError);
            return NextResponse.json({ error: 'Failed to check student' }, { status: 500 });
        }

        // Find corresponding auth user via users_profile (by email)
        let authUserId: string | null = null;
        try {
            const { data: profileRow } = await supabaseAdmin
                .from('users_profile')
                .select('id')
                .eq('email', existingStudent.email)
                .maybeSingle();
            authUserId = profileRow?.id ?? null;
        } catch (e) {
            authUserId = null;
        }

        // Best-effort: delete auth user first (so tokens are revoked), then profile row, then student
        if (authUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(authUserId);
            } catch (authDeleteError) {
                console.error('Error deleting auth user:', authDeleteError);
            }

            try {
                await supabaseAdmin
                    .from('users_profile')
                    .delete()
                    .eq('id', authUserId);
            } catch (profileDeleteError) {
                console.error('Error deleting users_profile:', profileDeleteError);
            }
        }

        // Delete student from database
        const { error: deleteStudentError } = await supabaseAdmin
            .from('students')
            .delete()
            .eq('id', studentId);

        if (deleteStudentError) {
            console.error('Error deleting student:', deleteStudentError);
            return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Student deleted successfully',
            deletedStudentId: studentId,
            authUserDeleted: Boolean(authUserId)
        });

    } catch (error) {
        console.error('Error in DELETE /api/students/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
