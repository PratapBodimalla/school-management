"use client";

import { useEffect, useState } from "react";
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
import { Plus, Search, Users, Mail, CheckCircle, XCircle, Loader2, Edit, Trash2, LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface Teacher {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    status: string | null;
    onboarding_status: string | null;
    created_at: string;
    updated_at?: string | null;
}

interface CreateTeacherForm {
    email: string;
    first_name: string;
    last_name: string;
}

export default function TeachersPage() {
    const { loading, isAuthorized } = useRoleGuard("Admin");
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateTeacherForm>({
        email: "",
        first_name: "",
        last_name: ""
    });
    const [creatingTeacher, setCreatingTeacher] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
    const [editForm, setEditForm] = useState<CreateTeacherForm>({
        email: "",
        first_name: "",
        last_name: ""
    });

    useEffect(() => {
        if (isAuthorized) {
            fetchTeachers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthorized, currentPage, searchTerm, selectedStatus, pageSize]);

    const fetchTeachers = async () => {
        setLoadingTeachers(true);
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(pageSize),
                search: searchTerm,
                status: selectedStatus === 'all' ? '' : selectedStatus
            });
            const response = await authenticatedFetch(`/api/teachers?${params.toString()}`);
            const data = await response.json();
            if (response.ok) {
                setTeachers(data.teachers || []);
                setTotalPages(data.pagination?.totalPages || 1);
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to fetch teachers' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to fetch teachers' });
        } finally {
            setLoadingTeachers(false);
        }
    };

    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingTeacher(true);
        setMessage(null);
        try {
            const response = await authenticatedFetch('/api/teachers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm)
            });
            const data = await response.json();
            if (response.ok) {
                setMessage({ type: 'success', text: `Teacher created. Magic link sent to ${createForm.email}` });
                setIsCreateDialogOpen(false);
                resetCreateForm();
                fetchTeachers();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to create teacher' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to create teacher' });
        } finally {
            setCreatingTeacher(false);
        }
    };

    const resetCreateForm = () => {
        setCreateForm({ email: '', first_name: '', last_name: '' });
    };

    const handleInputChange = (field: keyof CreateTeacherForm, value: string) => {
        setCreateForm(prev => ({ ...prev, [field]: value }));
    };

    const handleEditInputChange = (field: keyof CreateTeacherForm, value: string) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const openEdit = (t: Teacher) => {
        setTeacherToEdit(t);
        setEditForm({ email: t.email, first_name: t.first_name, last_name: t.last_name });
        setEditOpen(true);
    };

    const submitEdit = async () => {
        if (!teacherToEdit) return;
        setCreatingTeacher(true);
        try {
            const resp = await authenticatedFetch(`/api/teachers/${encodeURIComponent(teacherToEdit.id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: editForm.email,
                    first_name: editForm.first_name,
                    last_name: editForm.last_name
                })
            });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok) {
                setMessage({ type: 'success', text: 'Teacher updated successfully' });
                setEditOpen(false);
                setTeacherToEdit(null);
                await fetchTeachers();
            } else {
                setMessage({ type: 'error', text: data?.error || 'Failed to update teacher' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to update teacher' });
        } finally {
            setCreatingTeacher(false);
        }
    };

    const handleDeleteTeacher = (t: Teacher) => {
        setTeacherToDelete(t);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!teacherToDelete) return;
        const t = teacherToDelete;
        setDeletingId(t.id);
        try {
            const resp = await authenticatedFetch(`/api/teachers/${encodeURIComponent(t.id)}`, { method: 'DELETE' });
            const data = await resp.json().catch(() => ({}));
            if (resp.ok) {
                setMessage({ type: 'success', text: 'Teacher deleted successfully' });
                await fetchTeachers();
            } else {
                setMessage({ type: 'error', text: data?.error || 'Failed to delete teacher' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to delete teacher' });
        } finally {
            setDeletingId(null);
            setConfirmOpen(false);
            setTeacherToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    if (!isAuthorized) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
                    <p className="text-muted-foreground">Manage teacher accounts and invitations</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Teacher
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Teacher</DialogTitle>
                            <DialogDescription>
                                Add a new teacher. A magic link will be sent automatically.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateTeacher} className="space-y-6">
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium text-muted-foreground">Teacher details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 rounded-md p-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email <span className="text-red-600">*</span></Label>
                                        <Input id="email" type="email" value={createForm.email} onChange={(e) => handleInputChange('email', e.target.value)} required placeholder="teacher@example.com" />
                                        <p className="text-xs text-muted-foreground">We’ll send the magic link to this address.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">First Name <span className="text-red-600">*</span></Label>
                                        <Input id="first_name" value={createForm.first_name} onChange={(e) => handleInputChange('first_name', e.target.value)} required placeholder="First name" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">Last Name <span className="text-red-600">*</span></Label>
                                        <Input id="last_name" value={createForm.last_name} onChange={(e) => handleInputChange('last_name', e.target.value)} required placeholder="Last name" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">The teacher will receive a one-time sign-in link to set their password.</p>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={creatingTeacher}>Cancel</Button>
                                    <Button type="submit" disabled={creatingTeacher}>
                                        {creatingTeacher ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>) : (<><Mail className="mr-2 h-4 w-4" />Create & Send Magic Link</>)}
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
                            <CardTitle>Teacher List</CardTitle>
                            <CardDescription>
                                {teachers.length} teachers found
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search teachers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64" />
                            </div>

                            <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(1); }}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="invited">Invited</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button variant="outline" onClick={() => { setSearchTerm(""); setSelectedStatus("all"); setCurrentPage(1); }}>Clear filters</Button>

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
                    {loadingTeachers ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : teachers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No teachers found</p>
                            <p className="text-sm">Create your first teacher to get started</p>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'table' ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Onboarding</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {teachers.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell>
                                                    <div className="font-medium">{t.first_name} {t.last_name}</div>
                                                </TableCell>
                                                <TableCell>{t.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={t.status === 'active' ? 'default' : 'secondary'}>{t.status || '-'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={t.onboarding_status === 'completed' ? 'default' : 'secondary'}>{t.onboarding_status || '-'}</Badge>
                                                </TableCell>
                                                <TableCell>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTeacher(t)} disabled={deletingId === t.id}>
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
                                    {teachers.map((t) => (
                                        <Card key={t.id}>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <CardTitle className="text-base">{t.first_name} {t.last_name}</CardTitle>
                                                        <p className="text-xs text-muted-foreground">{t.email}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Badge variant={t.status === 'active' ? 'default' : 'secondary'}>{t.status || '-'}</Badge>
                                                        <Badge variant={t.onboarding_status === 'completed' ? 'default' : 'secondary'}>{t.onboarding_status || '-'}</Badge>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-0 text-sm space-y-1">
                                                <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</span></div>
                                                <div className="flex gap-2 pt-2">
                                                    <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteTeacher(t)} disabled={deletingId === t.id}>
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
                                    <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} aria-label="Previous page">
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} aria-label="Next page">
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
                        <DialogTitle>Delete teacher</DialogTitle>
                        <DialogDescription>
                            {teacherToDelete ? (
                                <span>
                                    This will permanently remove {teacherToDelete.first_name} {teacherToDelete.last_name}'s account,
                                    their profile and their authentication user. This action cannot be undone.
                                </span>
                            ) : (
                                <span>Are you sure you want to delete this teacher?</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={!!deletingId}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={!!deletingId}>
                            {deletingId ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>) : ('Delete')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Teacher Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Teacher</DialogTitle>
                        <DialogDescription>Update teacher information.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit_email">Email</Label>
                                <Input id="edit_email" value={editForm.email} onChange={(e) => handleEditInputChange('email', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="edit_first">First Name</Label>
                                <Input id="edit_first" value={editForm.first_name} onChange={(e) => handleEditInputChange('first_name', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit_last">Last Name</Label>
                                <Input id="edit_last" value={editForm.last_name} onChange={(e) => handleEditInputChange('last_name', e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setEditOpen(false)} disabled={creatingTeacher}>Cancel</Button>
                        <Button onClick={submitEdit} disabled={creatingTeacher}>
                            {creatingTeacher ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : 'Save changes'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
