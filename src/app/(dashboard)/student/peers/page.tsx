"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authenticatedFetch } from "@/lib/apiClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StudentRow = { id: string; first_name: string; last_name: string; class_id?: string; section_id?: string };

export default function StudentPeersPage() {
    const ALL = "__all__";
    const [q, setQ] = useState("");
    const [rows, setRows] = useState<StudentRow[]>([]);
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
    const [classId, setClassId] = useState(ALL);
    const [sectionId, setSectionId] = useState(ALL);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [clsRes, secRes] = await Promise.all([
                    authenticatedFetch('/api/classes'), authenticatedFetch('/api/sections')
                ]);
                const clsData = await clsRes.json();
                const secData = await secRes.json();
                const cls = Array.isArray(clsData) ? clsData : (Array.isArray(clsData?.classes) ? clsData.classes : []);
                setClasses(cls);
                setSections(Array.isArray(secData?.sections) ? secData.sections : []);
            } catch { setClasses([]); setSections([]); }
        })();
    }, []);

    async function load(resetPage = false) {
        if (resetPage) setPage(1);
        setLoading(true);
        try {
            const params = new URLSearchParams({ q, page: String(resetPage ? 1 : page), limit: '10' });
            if (classId !== ALL) params.set('class_id', classId);
            if (sectionId !== ALL) params.set('section_id', sectionId);
            const res = await authenticatedFetch(`/api/student/peers?${params}`);
            const data = await res.json();
            setRows(Array.isArray(data?.students) ? data.students : []);
            setTotalPages(data?.pagination?.totalPages || 1);
        } catch { setRows([]); }
        finally { setLoading(false); }
    }

    useEffect(() => { load(false); }, [page]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-2"><CardTitle>Peers</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="space-y-1">
                            <label className="text-sm">Class</label>
                            <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(ALL); }}>
                                <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All</SelectItem>
                                    {classes.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm">Section</label>
                            <Select value={sectionId} onValueChange={setSectionId} disabled={!classId || classId === ALL}>
                                <SelectTrigger className="w-40"><SelectValue placeholder={classId !== ALL ? 'All' : 'Select class first'} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All</SelectItem>
                                    {sections.filter(s => s.class_id === classId).map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm">Search</label>
                            <Input placeholder="First/Last name" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
                        </div>
                        <div className="space-y-1">
                            <Button variant="outline" onClick={() => load(true)}>Search</Button>
                        </div>
                        <div className="space-y-1">
                            <Button variant="ghost" onClick={() => { setQ(''); setClassId(ALL); setSectionId(ALL); setPage(1); setRows([]); }}>Clear</Button>
                        </div>
                    </div>

                    {rows.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No students found.</div>
                    ) : (
                        <>
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>First Name</TableHead>
                                            <TableHead>Last Name</TableHead>
                                            <TableHead>Class</TableHead>
                                            <TableHead>Section</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map(s => (
                                            <TableRow key={s.id}>
                                                <TableCell>{s.first_name}</TableCell>
                                                <TableCell>{s.last_name}</TableCell>
                                                <TableCell>{classes.find(c => c.id === s.class_id)?.name || '-'}</TableCell>
                                                <TableCell>{sections.find(sec => sec.id === s.section_id)?.name || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-3">
                                    <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


