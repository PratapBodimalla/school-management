import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// GET /api/classes/:id - Get one class
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // For now, we'll rely on the client-side role guard
        // In production, you should implement proper server-side authentication

        const classId = id;

        // Fetch class with sections
        const { data: classData, error: classError } = await supabaseAdmin
            .from('classes')
            .select('id, name, school_id, created_at, updated_at')
            .eq('id', classId)
            .single();

        if (classError) {
            if (classError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Class not found' }, { status: 404 });
            }
            console.error('Error fetching class:', classError);
            return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 });
        }

        // Fetch sections for this class
        const { data: sections, error: sectionsError } = await supabaseAdmin
            .from('sections')
            .select('id, name')
            .eq('class_id', classId)
            .order('name', { ascending: true });

        if (sectionsError) {
            console.error('Error fetching sections:', sectionsError);
            return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
        }

        const result = {
            id: classData.id,
            name: classData.name,
            school_id: classData.school_id,
            sections: sections.map(s => s.name),
            created_at: classData.created_at,
            updated_at: classData.updated_at
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in GET /api/classes/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/classes/:id - Update class
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // For now, we'll rely on the client-side role guard
        // In production, you should implement proper server-side authentication

        const classId = id;
        const body = await request.json();
        const { name, sections = [] } = body;

        // Validation
        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Class name is required' }, { status: 400 });
        }

        const className = name.trim();

        // Check if class exists
        const { data: existingClass, error: checkError } = await supabaseAdmin
            .from('classes')
            .select('id, school_id')
            .eq('id', classId)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Class not found' }, { status: 404 });
            }
            console.error('Error checking class existence:', checkError);
            return NextResponse.json({ error: 'Failed to check class existence' }, { status: 500 });
        }

        // Check for uniqueness per school (excluding current class)
        const { data: duplicateClass, error: uniquenessError } = await supabaseAdmin
            .from('classes')
            .select('id')
            .eq('school_id', existingClass.school_id)
            .eq('name', className)
            .neq('id', classId)
            .maybeSingle();

        if (uniquenessError) {
            console.error('Error checking class uniqueness:', uniquenessError);
            return NextResponse.json({ error: 'Failed to validate class name' }, { status: 500 });
        }

        if (duplicateClass) {
            return NextResponse.json({
                error: `Class "${className}" already exists in this school`
            }, { status: 409 });
        }

        // Update class name
        const { data: updatedClass, error: updateError } = await supabaseAdmin
            .from('classes')
            .update({
                name: className,
                updated_at: new Date().toISOString()
            })
            .eq('id', classId)
            .select('id, name, school_id, created_at, updated_at')
            .single();

        if (updateError) {
            console.error('Error updating class:', updateError);
            return NextResponse.json({ error: 'Failed to update class' }, { status: 500 });
        }

        // Handle sections update
        if (Array.isArray(sections)) {
            // Get existing sections
            const { data: existingSections, error: sectionsError } = await supabaseAdmin
                .from('sections')
                .select('id, name')
                .eq('class_id', classId);

            if (sectionsError) {
                console.error('Error fetching existing sections:', sectionsError);
                return NextResponse.json({ error: 'Failed to fetch existing sections' }, { status: 500 });
            }

            const existingNames = new Set(existingSections.map(s => s.name));
            const desiredNames = new Set(sections.map((s: string) => s.trim()));

            // Add new sections
            const toAdd = Array.from(desiredNames).filter(name => !existingNames.has(name));
            if (toAdd.length > 0) {
                const sectionData = toAdd.map(name => ({
                    class_id: classId,
                    name: name.trim()
                }));

                const { error: addError } = await supabaseAdmin
                    .from('sections')
                    .insert(sectionData);

                if (addError) {
                    console.error('Error adding sections:', addError);
                    // Continue with the operation even if sections fail
                }
            }

            // Remove sections that are no longer needed
            const toRemove = existingSections.filter(s => !desiredNames.has(s.name));
            if (toRemove.length > 0) {
                const { error: removeError } = await supabaseAdmin
                    .from('sections')
                    .delete()
                    .in('id', toRemove.map(s => s.id));

                if (removeError) {
                    console.error('Error removing sections:', removeError);
                    // Continue with the operation even if sections fail
                }
            }
        }

        // Return updated class with sections
        const result = {
            id: updatedClass.id,
            name: updatedClass.name,
            school_id: updatedClass.school_id,
            sections: sections.map((s: string) => s.trim()),
            created_at: updatedClass.created_at,
            updated_at: updatedClass.updated_at
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in PATCH /api/classes/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/classes/:id - Delete class
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // For now, we'll rely on the client-side role guard
        // In production, you should implement proper server-side authentication

        const classId = id;

        // Check if class exists
        const { data: existingClass, error: checkError } = await supabaseAdmin
            .from('classes')
            .select('id')
            .eq('id', classId)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Class not found' }, { status: 404 });
            }
            console.error('Error checking class existence:', checkError);
            return NextResponse.json({ error: 'Failed to check class existence' }, { status: 500 });
        }

        // Delete class (sections will be cascade deleted due to FK constraint)
        const { error: deleteError } = await supabaseAdmin
            .from('classes')
            .delete()
            .eq('id', classId);

        if (deleteError) {
            console.error('Error deleting class:', deleteError);
            return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 });
        }

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error('Error in DELETE /api/classes/[id]:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
