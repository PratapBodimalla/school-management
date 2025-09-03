"use client";

import { useState, useEffect } from "react";
import { useRoleGuard } from "@/lib/roleGuard";
import { authenticatedFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Users, Mail, CheckCircle, XCircle, Loader2, Edit, Trash2, LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface Student {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    class_id: string;  // ✅ Changed from "grade" to "class_id"
    section_id: string;
    // ✅ Removed: parent_name, parent_phone, address
    enrollment_date?: string;
    updated_at?: string;
    status: string;
    created_at: string;
}

interface CreateStudentForm {
    email: string;
    first_name: string;
    last_name: string;
    class_id: string;  // ✅ Changed from "grade" to "class_id"
    section: string;
    // ✅ Removed: parent_name, parent_phone, address
}

export default function StudentsPage() {
    const { loading, isAuthorized } = useRoleGuard("Admin");
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClass, setSelectedClass] = useState("all");
    const [selectedSection, setSelectedSection] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateStudentForm>({
        email: "",
        first_name: "",
        last_name: "",
        class_id: "",  // ✅ Changed from "grade" to "class_id"
        section: ""
        // ✅ Removed: parent_name, parent_phone, address
    });
    const [creatingStudent, setCreatingStudent] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
    const [editForm, setEditForm] = useState<CreateStudentForm>({
        email: "",
        first_name: "",
        last_name: "",
        class_id: "",
        section: ""
    });
    const [editSections, setEditSections] = useState<{ id: string; name: string }[]>([]);

    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);
    // Sections specific to the class selected in the Create form
    const [formSections, setFormSections] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        const fetchClassesAndSections = async () => {
            try {
                // Fetch classes
                const classesResponse = await authenticatedFetch('/api/classes');
                const classesData = await classesResponse.json();
                if (classesResponse.ok) {
                    // Handle both array response and { classes: [...] }
                    const cls = Array.isArray(classesData)
                        ? classesData
                        : (Array.isArray(classesData?.classes) ? classesData.classes : []);
                    setClasses(cls);
                } else {
                    setClasses([]);
                }

                // Fetch sections (for top-level filter list)
                const sectionsResponse = await authenticatedFetch('/api/sections');
                const sectionsData = await sectionsResponse.json();
                if (sectionsResponse.ok) {
                    setSections(Array.isArray(sectionsData?.sections) ? sectionsData.sections : []);
                } else {
                    setSections([]);
                }
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to fetch classes and sections' });
                setClasses([]);
                setSections([]);
            }
        };

        if (isAuthorized) {
            fetchClassesAndSections();
        }
    }, [isAuthorized]);

    // When the create form's class changes, fetch sections for that class and reset selected section
    useEffect(() => {
        const loadSectionsForClass = async (classId: string) => {
            if (!classId) {
                setFormSections([]);
                return;
            }
            try {
                const res = await authenticatedFetch(`/api/sections?class_id=${encodeURIComponent(classId)}`);
                const data = await res.json();
                if (res.ok) {
                    setFormSections(Array.isArray(data?.sections) ? data.sections : []);
                } else {
                    setFormSections([]);
                }
            } catch {
                setFormSections([]);
            }
        };
        loadSectionsForClass(createForm.class_id);
        // Always clear previously selected section when class changes
        setCreateForm(prev => ({ ...prev, section: "" }));
    }, [createForm.class_id]);

    // Load sections for edit modal when class changes
    useEffect(() => {
        const load = async (classId: string) => {
            if (!classId) { setEditSections([]); return; }
            try {
                const res = await authenticatedFetch(`/api/sections?class_id=${encodeURIComponent(classId)}`);
                const data = await res.json();
                if (res.ok) setEditSections(Array.isArray(data?.sections) ? data.sections : []);
                else setEditSections([]);
            } catch { setEditSections([]); }
        };
        load(editForm.class_id);
        setEditForm(prev => ({ ...prev, section: "" }));
    }, [editForm.class_id]);

    // When the class filter changes, reset section filter if it no longer applies
    useEffect(() => {
        if (selectedClass === 'all') return;
        const valid = sections.some(s => s.class_id === selectedClass && (selectedSection === 'all' || s.id === selectedSection));
        if (!valid) setSelectedSection('all');
    }, [selectedClass, sections]);

    useEffect(() => {
        if (isAuthorized) {
            fetchStudents();
        }
    }, [isAuthorized, currentPage, searchTerm, selectedClass, selectedSection, pageSize]);

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: String(pageSize),
                search: searchTerm,
                class_id: selectedClass === 'all' ? '' : selectedClass,  // ✅ Changed from "grade" to "class_id"
                section_id: selectedSection === 'all' ? '' : selectedSection
            });

            const response = await authenticatedFetch(`/api/students?${params}`);
            const data = await response.json();

            if (response.ok) {
                setStudents(data.students);
                setTotalPages(data.pagination.totalPages);
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to fetch students' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to fetch students' });
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingStudent(true);
        setMessage(null);

        try {
            const response = await authenticatedFetch('/api/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(createForm),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: `Student created successfully! Magic link sent to ${createForm.email}`
                });
                setIsCreateDialogOpen(false);
                resetCreateForm();
                fetchStudents(); // Refresh the list
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to create student' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to create student' });
        } finally {
            setCreatingStudent(false);
        }
    };

    const resetCreateForm = () => {
        setCreateForm({
            email: "",
            first_name: "",
            last_name: "",
            class_id: "",  // ✅ Changed from "grade" to "class_id"
            section: ""
            // ✅ Removed: parent_name, parent_phone, address
        });
        setFormSections([]);
    };

    const handleInputChange = (field: keyof CreateStudentForm, value: string) => {
        setCreateForm(prev => ({ ...prev, [field]: value }));
    };

    const handleEditInputChange = (field: keyof CreateStudentForm, value: string) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const openEdit = (s: Student) => {
        setStudentToEdit(s);
        setEditForm({
            email: s.email,
            first_name: s.first_name,
            last_name: s.last_name,
            class_id: s.class_id || "",
            section: s.section_id || "",
        });
        setEditOpen(true);
    };

    const submitEdit = async () => {
        if (!studentToEdit) return;
        setCreatingStudent(true);
        try {
            const resp = await authenticatedFetch(`/api/students/${encodeURIComponent(studentToEdit.id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: editForm.email,
                    first_name: editForm.first_name,
                    last_name: editForm.last_name,
                    class_id: editForm.class_id,
                    section_id: editForm.section
                })
            });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok) {
                setMessage({ type: 'success', text: 'Student updated successfully' });
                setEditOpen(false);
                setStudentToEdit(null);
                await fetchStudents();
            } else {
                setMessage({ type: 'error', text: data?.error || 'Failed to update student' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to update student' });
        } finally {
            setCreatingStudent(false);
        }
    };

    const handleDeleteStudent = (s: Student) => {
        setStudentToDelete(s);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!studentToDelete) return;
        const s = studentToDelete;
        setDeletingId(s.id);
        try {
            const resp = await authenticatedFetch(`/api/students/${encodeURIComponent(s.id)}`, { method: 'DELETE' });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok) {
                setMessage({ type: 'success', text: 'Student deleted successfully' });
                await fetchStudents();
            } else {
                setMessage({ type: 'error', text: data?.error || 'Failed to delete student' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to delete student' });
        } finally {
            setDeletingId(null);
            setConfirmOpen(false);
            setStudentToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Students</h1>
                    <p className="text-muted-foreground">
                        Manage student accounts and information
                    </p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Student
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Student</DialogTitle>
                            <DialogDescription>
                                Add a new student to the system. A magic link will be sent automatically.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateStudent} className="space-y-6">
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium text-muted-foreground">Student details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 rounded-md p-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email <span className="text-red-600">*</span></Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={createForm.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            required
                                            placeholder="student@example.com"
                                        />
                                        <p className="text-xs text-muted-foreground">We’ll send the magic link to this address.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="class_id">Class</Label>
                                        <Select value={createForm.class_id} onValueChange={(value) => handleInputChange('class_id', value)}>
                                            <SelectTrigger id="class_id">
                                                <SelectValue placeholder="Select class" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(classes ?? []).map((cls) => (
                                                    <SelectItem key={cls.id} value={cls.id}>
                                                        {cls.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">Choose the class the student belongs to.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">First Name <span className="text-red-600">*</span></Label>
                                        <Input
                                            id="first_name"
                                            value={createForm.first_name}
                                            onChange={(e) => handleInputChange('first_name', e.target.value)}
                                            required
                                            placeholder="First name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">Last Name <span className="text-red-600">*</span></Label>
                                        <Input
                                            id="last_name"
                                            value={createForm.last_name}
                                            onChange={(e) => handleInputChange('last_name', e.target.value)}
                                            required
                                            placeholder="Last name"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="section">Section</Label>
                                        <Select value={createForm.section} onValueChange={(value) => handleInputChange('section', value)} disabled={!createForm.class_id}>
                                            <SelectTrigger id="section">
                                                <SelectValue placeholder={createForm.class_id ? "Select section" : "Select class first"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(formSections ?? []).map((section) => (
                                                    <SelectItem key={section.id} value={section.id}>
                                                        {section.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">The student will receive a one-time sign-in link and can set their own password.</p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreateDialogOpen(false)}
                                        disabled={creatingStudent}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={creatingStudent}>
                                        {creatingStudent ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Mail className="mr-2 h-4 w-4" />
                                                Create & Send Magic Link
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {message && (
                <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                    {message.type === 'error' ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                        {message.text}
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Student List</CardTitle>
                            <CardDescription>
                                {students.length} students found
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search students..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-64"
                                />
                            </div>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {(classes ?? []).map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id}>
                                            {cls.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedSection} onValueChange={setSelectedSection}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sections</SelectItem>
                                    {(selectedClass === 'all' ? sections : sections.filter(s => s.class_id === selectedClass)).map((section) => (
                                        <SelectItem key={section.id} value={section.id}>
                                            {section.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                onClick={() => { setSearchTerm(""); setSelectedClass("all"); setSelectedSection("all"); setCurrentPage(1); }}
                            >
                                Clear filters
                            </Button>

                            <div className="ml-2 flex items-center gap-1">
                                <Button size="sm" variant={viewMode === 'table' ? 'default' : 'outline'} onClick={() => setViewMode('table')}>
                                    <ListIcon className="h-4 w-4 mr-1" /> Table
                                </Button>
                                <Button size="sm" variant={viewMode === 'cards' ? 'default' : 'outline'} onClick={() => setViewMode('cards')}>
                                    <LayoutGrid className="h-4 w-4 mr-1" /> Cards
                                </Button>
                            </div>

                            <div className="ml-2 flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Entries</span>
                                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-24">
                                        <SelectValue placeholder="10" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingStudents ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No students found</p>
                            <p className="text-sm">Create your first student to get started</p>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'table' ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Class</TableHead>
                                            <TableHead>Section</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Enrollment Date</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">
                                                            {student.first_name} {student.last_name}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{student.email}</TableCell>
                                                <TableCell>{classes.find(c => c.id === student.class_id)?.name || '-'}</TableCell>
                                                <TableCell>{sections.find(s => s.id === student.section_id)?.name || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                                                        {student.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {student.updated_at ? new Date(student.updated_at).toLocaleDateString() : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => openEdit(student)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteStudent(student)} disabled={deletingId === student.id}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {students.map((student) => (
                                        <Card key={student.id}>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <CardTitle className="text-base">{student.first_name} {student.last_name}</CardTitle>
                                                        <p className="text-xs text-muted-foreground">{student.email}</p>
                                                    </div>
                                                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>{student.status}</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-0 text-sm space-y-1">
                                                <div className="flex justify-between"><span className="text-muted-foreground">Class</span><span>{classes.find(c => c.id === student.class_id)?.name || '-'}</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">Section</span><span>{sections.find(s => s.id === student.section_id)?.name || '-'}</span></div>
                                                <div className="flex justify-between"><span className="text-muted-foreground">Enrollment</span><span>{student.updated_at ? new Date(student.updated_at).toLocaleDateString() : '-'}</span></div>
                                                <div className="flex gap-2 pt-2">
                                                    <Button variant="outline" size="sm" onClick={() => openEdit(student)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteStudent(student)} disabled={deletingId === student.id}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Page {currentPage} of {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            aria-label="Previous page"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            aria-label="Next page"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete student</DialogTitle>
                        <DialogDescription>
                            {studentToDelete ? (
                                <span>
                                    This will permanently remove {studentToDelete.first_name} {studentToDelete.last_name}'s account,
                                    their profile and their authentication user. This action cannot be undone.
                                </span>
                            ) : (
                                <span>Are you sure you want to delete this student?</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={!!deletingId}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={!!deletingId}>
                            {deletingId ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                                </>
                            ) : (
                                'Delete'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Student Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Student</DialogTitle>
                        <DialogDescription>Update student information.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit_email">Email</Label>
                                <Input id="edit_email" value={editForm.email} onChange={(e) => handleEditInputChange('email', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="edit_class">Class</Label>
                                <Select value={editForm.class_id} onValueChange={(v) => handleEditInputChange('class_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(classes ?? []).map((cls) => (
                                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>First Name</Label>
                                <Input value={editForm.first_name} onChange={(e) => handleEditInputChange('first_name', e.target.value)} />
                            </div>
                            <div>
                                <Label>Last Name</Label>
                                <Input value={editForm.last_name} onChange={(e) => handleEditInputChange('last_name', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <Label>Section</Label>
                            <Select value={editForm.section} onValueChange={(v) => handleEditInputChange('section', v)} disabled={!editForm.class_id}>
                                <SelectTrigger>
                                    <SelectValue placeholder={editForm.class_id ? 'Select section' : 'Select class first'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {(editSections ?? []).map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setEditOpen(false)} disabled={creatingStudent}>Cancel</Button>
                        <Button onClick={submitEdit} disabled={creatingStudent}>
                            {creatingStudent ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : 'Save changes'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

