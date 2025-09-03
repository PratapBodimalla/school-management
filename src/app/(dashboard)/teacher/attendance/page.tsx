"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authenticatedFetch } from "@/lib/apiClient";

export default function TeacherAttendancePage() {
    const [message, setMessage] = useState<string | null>(null);
    const [form, setForm] = useState({ class_id: '', section_id: '', date: new Date().toISOString().slice(0, 10) });
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);
    const [students, setStudents] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [savedCount, setSavedCount] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const [clsRes, secRes] = await Promise.all([
                    authenticatedFetch('/api/classes'),
                    authenticatedFetch('/api/sections')
                ]);
                const classesData = await clsRes.json();
                const sectionsData = await secRes.json();
                const cls = Array.isArray(classesData) ? classesData : (Array.isArray(classesData?.classes) ? classesData.classes : []);
                setClasses(cls);
                setSections(Array.isArray(sectionsData?.sections) ? sectionsData.sections : []);
            } catch {
                setClasses([]); setSections([]);
            }
        })();
    }, []);

    useEffect(() => {
        if (!form.class_id) { setStudents([]); return; }
        (async () => {
            setLoadingStudents(true);
            try {
                const params = new URLSearchParams({ class_id: form.class_id, section_id: form.section_id });
                const res = await authenticatedFetch(`/api/teacher/students?${params}`);
                const data = await res.json();
                setStudents(Array.isArray(data?.students) ? data.students : []);
            } catch { setStudents([]); }
            finally { setLoadingStudents(false); }
        })();
    }, [form.class_id, form.section_id]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const statusById: Record<string, string> = {};
            document.querySelectorAll<HTMLSelectElement>('select[data-student]')
                .forEach(sel => { const id = sel.getAttribute('data-student') || ''; statusById[id] = sel.value; });
            const records = Object.entries(statusById).map(([student_id, status]) => ({ student_id, status }));
            const res = await authenticatedFetch('/api/attendance/mark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ class_id: form.class_id, section_id: form.section_id, date: form.date, records })
            });
            const data = await res.json();
            if (res.ok) {
                setSavedCount(data?.count ?? records.length);
                setSuccessOpen(true);
                setMessage(null);
            }
            else setMessage(data?.error || 'Failed to save');
        } catch { setMessage('Failed to save'); }
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-2"><CardTitle>Take Attendance</CardTitle></CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-6">
                        <div className="space-y-3 max-w-sm">
                            <div className="space-y-1">
                                <Label>Class</Label>
                                <Select value={form.class_id} onValueChange={(v) => setForm(f => ({ ...f, class_id: v, section_id: '' }))}>
                                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Section</Label>
                                <Select value={form.section_id} onValueChange={(v) => setForm(f => ({ ...f, section_id: v }))} disabled={!form.class_id}>
                                    <SelectTrigger><SelectValue placeholder={form.class_id ? 'Select section' : 'Select class first'} /></SelectTrigger>
                                    <SelectContent>
                                        {sections.filter(s => s.class_id === form.class_id).map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Date</Label>
                                <Input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm">Students</Label>
                            {loadingStudents ? (
                                <div className="text-sm text-muted-foreground">Loading students…</div>
                            ) : students.length === 0 ? (
                                <div className="text-sm text-muted-foreground">No students found.</div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {students.map(s => (
                                        <span key={s.id} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                                            {s.first_name} {s.last_name}
                                            <select className="rounded border text-sm" data-student={s.id}>
                                                <option>Present</option>
                                                <option>Absent</option>
                                                <option>Late</option>
                                            </select>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => { setForm({ class_id: '', section_id: '', date: new Date().toISOString().slice(0, 10) }); setStudents([]); }}>Reset</Button>
                            <Button type="submit">Submit</Button>
                        </div>
                        {message && <div className="text-sm text-green-700 mt-2">{message}</div>}
                    </form>
                </CardContent>
            </Card>

            <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Attendance saved</DialogTitle>
                        <DialogDescription>
                            Successfully saved attendance for {savedCount} student{savedCount === 1 ? '' : 's'} on {new Date(form.date).toLocaleDateString()}.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setSuccessOpen(false)}>OK</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


