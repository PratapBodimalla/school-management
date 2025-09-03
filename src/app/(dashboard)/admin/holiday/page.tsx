"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoleGuard } from "@/lib/roleGuard";
import { authenticatedFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle, ChevronLeft, ChevronRight, Edit, Loader2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";

type HolidayType = "Holiday" | "Event" | "Exam" | "Break" | "Other";

interface HolidayRow {
    id: string;
    school_id: string;
    title: string;
    type: HolidayType;
    is_multi_day: boolean;
    start_date: string; // YYYY-MM-DD
    end_date: string | null;
    description: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string | null;
}

interface CreateHolidayForm {
    title: string;
    type: HolidayType;
    is_multi_day: boolean;
    date: string; // for single-day
    start_date: string; // for multi-day
    end_date: string; // for multi-day
    description: string;
}

const TYPE_OPTIONS: HolidayType[] = ["Holiday", "Event", "Exam", "Break", "Other"];

export default function HolidayAdminPage() {
    const { loading, isAuthorized } = useRoleGuard("Admin");
    const [schoolId, setSchoolId] = useState<string>("f27cf87b-d3fb-41c1-8f23-0558c222768d");

    const [rows, setRows] = useState<HolidayRow[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [search, setSearch] = useState("");
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [month, setMonth] = useState<string>("all");
    const [loadingList, setLoadingList] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateHolidayForm>({
        title: "",
        type: "Holiday",
        is_multi_day: false,
        date: "",
        start_date: "",
        end_date: "",
        description: ""
    });
    const [creating, setCreating] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<HolidayRow | null>(null);
    const [editForm, setEditForm] = useState<CreateHolidayForm>({
        title: "",
        type: "Holiday",
        is_multi_day: false,
        date: "",
        start_date: "",
        end_date: "",
        description: ""
    });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (isAuthorized) {
            load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthorized, currentPage, pageSize, search, year, month, schoolId]);

    const load = async () => {
        setLoadingList(true);
        try {
            const params = new URLSearchParams({
                school_id: schoolId,
                page: String(currentPage),
                limit: String(pageSize),
                q: search,
            });
            if (year) params.set('year', year);
            if (month !== 'all') params.set('month', month);

            const resp = await authenticatedFetch(`/api/holidays?${params.toString()}`);
            const data = await resp.json();
            if (resp.ok) {
                setRows(Array.isArray(data.holidays) ? data.holidays : []);
                setTotalPages(data.pagination?.totalPages ?? 1);
            } else {
                setMessage({ type: 'error', text: data?.error || 'Failed to load holidays' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to load holidays' });
        } finally {
            setLoadingList(false);
        }
    };

    const onInlinePatch = async (id: string, patch: Partial<HolidayRow>) => {
        setEditingId(id);
        const original = rows.slice();
        setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } as HolidayRow : r));
        try {
            const resp = await authenticatedFetch(`/api/holidays/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch)
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                setRows(original);
                setMessage({ type: 'error', text: data?.error || 'Update failed' });
            } else {
                setRows(prev => prev.map(r => r.id === id ? data.holiday : r));
            }
        } catch (e) {
            setRows(original);
            setMessage({ type: 'error', text: 'Update failed' });
        } finally {
            setEditingId(null);
        }
    };

    const onDelete = async (id: string) => {
        if (!confirm('Delete this holiday?')) return;
        setDeletingId(id);
        try {
            const resp = await authenticatedFetch(`/api/holidays/${encodeURIComponent(id)}`, { method: 'DELETE' });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                setMessage({ type: 'error', text: data?.error || 'Delete failed' });
            } else {
                setRows(prev => prev.filter(r => r.id !== id));
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Delete failed' });
        } finally {
            setDeletingId(null);
        }
    };

    const resetCreateForm = () => setCreateForm({ title: '', type: 'Holiday', is_multi_day: false, date: '', start_date: '', end_date: '', description: '' });

    const onCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setMessage(null);
        try {
            const payload: any = {
                school_id: schoolId,
                title: createForm.title.trim(),
                type: createForm.type,
                is_multi_day: createForm.is_multi_day,
                description: createForm.description?.trim() || undefined
            };
            if (createForm.is_multi_day) {
                payload.start_date = createForm.start_date;
                payload.end_date = createForm.end_date;
            } else {
                payload.date = createForm.date;
            }
            const resp = await authenticatedFetch('/api/holidays', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (!resp.ok) {
                setMessage({ type: 'error', text: data?.error || 'Failed to create holiday' });
            } else {
                setMessage({ type: 'success', text: 'Holiday created' });
                setCreateOpen(false);
                resetCreateForm();
                load();
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to create holiday' });
        } finally {
            setCreating(false);
        }
    };

    const monthOptions = useMemo(() => (
        [{ value: 'all', label: 'All' },
        { value: '1', label: 'Jan' }, { value: '2', label: 'Feb' }, { value: '3', label: 'Mar' }, { value: '4', label: 'Apr' },
        { value: '5', label: 'May' }, { value: '6', label: 'Jun' }, { value: '7', label: 'Jul' }, { value: '8', label: 'Aug' },
        { value: '9', label: 'Sep' }, { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' }]
    ), []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    if (!isAuthorized) return null;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-xl">Holidays</CardTitle>
                        <div className="flex items-center gap-2">
                            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <Plus className="h-4 w-4 mr-2" /> Add Holiday
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Add Holiday</DialogTitle>
                                        <DialogDescription>Create a single-day or multi-day holiday.</DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={onCreate} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="title">Name</Label>
                                                <Input id="title" value={createForm.title} onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Type</Label>
                                                <Select value={createForm.type} onValueChange={(v) => setCreateForm(f => ({ ...f, type: v as HolidayType }))}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {TYPE_OPTIONS.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Multi-day</Label>
                                                <div className="flex items-center gap-2">
                                                    <input id="is_multi_day" type="checkbox" checked={createForm.is_multi_day} onChange={(e) => setCreateForm(f => ({ ...f, is_multi_day: e.target.checked }))} />
                                                    <Label htmlFor="is_multi_day" className="text-sm text-muted-foreground">Use start/end dates</Label>
                                                </div>
                                            </div>
                                            {!createForm.is_multi_day ? (
                                                <div className="space-y-2">
                                                    <Label htmlFor="date">Date</Label>
                                                    <Input id="date" type="date" value={createForm.date} onChange={(e) => setCreateForm(f => ({ ...f, date: e.target.value }))} required />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="start_date">Start Date</Label>
                                                        <Input id="start_date" type="date" value={createForm.start_date} onChange={(e) => setCreateForm(f => ({ ...f, start_date: e.target.value }))} required />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="end_date">End Date</Label>
                                                        <Input id="end_date" type="date" value={createForm.end_date} onChange={(e) => setCreateForm(f => ({ ...f, end_date: e.target.value }))} required />
                                                    </div>
                                                </>
                                            )}
                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="description">Description</Label>
                                                <Input id="description" value={createForm.description} onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                            <Button type="submit" disabled={creating}>
                                                {creating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>) : 'Save'}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {message && (
                        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                            {message.type === 'error' ? (<XCircle className="h-4 w-4 text-red-600" />) : (<CheckCircle className="h-4 w-4 text-green-600" />)}
                            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>{message.text}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-wrap gap-2 items-end">
                        <div className="space-y-1">
                            <Label>Year</Label>
                            <Input type="number" className="w-28" value={year} onChange={(e) => { setYear(e.target.value); setCurrentPage(1); }} />
                        </div>
                        <div className="space-y-1">
                            <Label>Month</Label>
                            <Select value={month} onValueChange={(v) => { setMonth(v); setCurrentPage(1); }}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map(m => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Search</Label>
                            <Input className="w-60" placeholder="Title contains..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
                        </div>
                        <div className="space-y-1">
                            <Label>&nbsp;</Label>
                            <div>
                                <Button variant="outline" onClick={() => { setSearch(''); setMonth('all'); setYear(new Date().getFullYear().toString()); setCurrentPage(1); }} className="mr-2">Clear</Button>
                                <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label>Entries</Label>
                            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="w-24">
                                    <SelectValue placeholder="20" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[22rem]">Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Multi-day</TableHead>
                                    <TableHead>Date/Start</TableHead>
                                    <TableHead>End</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingList ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin inline-block" />
                                        </TableCell>
                                    </TableRow>
                                ) : rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No holidays yet.</TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                <Input value={r.title} onChange={(e) => setRows(prev => prev.map(x => x.id === r.id ? { ...x, title: e.target.value } : x))} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== r.title) onInlinePatch(r.id, { title: v }); }} />
                                            </TableCell>
                                            <TableCell>
                                                <Select value={r.type} onValueChange={(v) => onInlinePatch(r.id, { type: v as HolidayType })}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {TYPE_OPTIONS.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={r.is_multi_day} onChange={async (e) => {
                                                        const checked = e.target.checked;
                                                        if (checked && !r.end_date) {
                                                            const end = prompt('Enter end date (YYYY-MM-DD)', r.start_date) || '';
                                                            if (!end) return;
                                                            await onInlinePatch(r.id, { is_multi_day: true, end_date: end });
                                                        } else {
                                                            await onInlinePatch(r.id, { is_multi_day: checked, end_date: null });
                                                        }
                                                    }} />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Input type="date" value={r.start_date} onChange={(e) => setRows(prev => prev.map(x => x.id === r.id ? { ...x, start_date: e.target.value } : x))} onBlur={(e) => { const v = e.target.value; if (v && v !== r.start_date) onInlinePatch(r.id, { start_date: v }); }} />
                                            </TableCell>
                                            <TableCell>
                                                {r.is_multi_day ? (
                                                    <Input type="date" value={r.end_date || ''} onChange={(e) => setRows(prev => prev.map(x => x.id === r.id ? { ...x, end_date: e.target.value } : x))} onBlur={(e) => { const v = e.target.value; if (v !== (r.end_date || '')) onInlinePatch(r.id, { end_date: v }); }} />
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Input value={r.description || ''} onChange={(e) => setRows(prev => prev.map(x => x.id === r.id ? { ...x, description: e.target.value } : x))} onBlur={(e) => { const v = e.target.value; if (v !== (r.description || '')) onInlinePatch(r.id, { description: v || null }); }} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label="Edit holiday"
                                                        onClick={() => {
                                                            setEditTarget(r);
                                                            setEditForm({
                                                                title: r.title,
                                                                type: r.type,
                                                                is_multi_day: r.is_multi_day,
                                                                date: r.start_date,
                                                                start_date: r.start_date,
                                                                end_date: r.end_date || "",
                                                                description: r.description || ""
                                                            });
                                                            setEditOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label="Delete holiday"
                                                        onClick={() => onDelete(r.id)}
                                                        disabled={deletingId === r.id}
                                                    >
                                                        {deletingId === r.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <div className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} aria-label="Previous page">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} aria-label="Next page">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Holiday Modal */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Holiday</DialogTitle>
                        <DialogDescription>Update holiday fields and save.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!editTarget) { setEditOpen(false); return; }
                        setUpdating(true);
                        const patch: any = {
                            title: editForm.title.trim(),
                            type: editForm.type,
                            is_multi_day: editForm.is_multi_day,
                            description: editForm.description?.trim() || null,
                        };
                        if (editForm.is_multi_day) {
                            patch.start_date = editForm.start_date;
                            patch.end_date = editForm.end_date;
                        } else {
                            patch.start_date = editForm.date || editForm.start_date;
                            patch.end_date = null;
                        }
                        try {
                            const resp = await authenticatedFetch(`/api/holidays/${encodeURIComponent(editTarget.id)}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(patch)
                            });
                            const data = await resp.json();
                            if (!resp.ok) {
                                setMessage({ type: 'error', text: data?.error || 'Failed to update holiday' });
                            } else {
                                setMessage({ type: 'success', text: 'Holiday updated' });
                                setEditOpen(false);
                                setEditTarget(null);
                                await load();
                            }
                        } catch (e) {
                            setMessage({ type: 'error', text: 'Failed to update holiday' });
                        } finally {
                            setUpdating(false);
                        }
                    }} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="e_title">Name</Label>
                                <Input id="e_title" value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <Select value={editForm.type} onValueChange={(v) => setEditForm(f => ({ ...f, type: v as HolidayType }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TYPE_OPTIONS.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Multi-day</Label>
                                <div className="flex items-center gap-2">
                                    <input id="e_is_multi_day" type="checkbox" checked={editForm.is_multi_day} onChange={(e) => setEditForm(f => ({ ...f, is_multi_day: e.target.checked }))} />
                                    <Label htmlFor="e_is_multi_day" className="text-sm text-muted-foreground">Use start/end dates</Label>
                                </div>
                            </div>
                            {!editForm.is_multi_day ? (
                                <div className="space-y-2">
                                    <Label htmlFor="e_date">Date</Label>
                                    <Input id="e_date" type="date" value={editForm.date} onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))} required />
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="e_start">Start Date</Label>
                                        <Input id="e_start" type="date" value={editForm.start_date} onChange={(e) => setEditForm(f => ({ ...f, start_date: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="e_end">End Date</Label>
                                        <Input id="e_end" type="date" value={editForm.end_date} onChange={(e) => setEditForm(f => ({ ...f, end_date: e.target.value }))} required />
                                    </div>
                                </>
                            )}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="e_desc">Description</Label>
                                <Input id="e_desc" value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={updating}>
                                {updating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>) : 'Save changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}


