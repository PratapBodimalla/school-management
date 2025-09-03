"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from "lucide-react";

type Entry = { day_of_week: number; period_no: number; start_time: string; end_time: string; class_id?: string; section_id?: string; };

export default function TeacherTimetablePage() {
    const [weekStart, setWeekStart] = useState<string>(getMondayIso(new Date()));
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);

    useEffect(() => { load(); }, [weekStart]);

    async function load() {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`/api/timetable/for-teacher?week_start=${encodeURIComponent(weekStart)}`);
            const data = await res.json();
            setEntries(Array.isArray(data?.entries) ? data.entries : []);
        } catch { setEntries([]); }
        finally { setLoading(false); }
    }

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

    const grouped = useMemo(() => {
        const g: Record<number, Entry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
        for (const e of entries) { g[e.day_of_week]?.push(e); }
        for (const d of Object.keys(g)) { g[Number(d)].sort((a, b) => a.period_no - b.period_no); }
        return g;
    }, [entries]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <div className="text-sm text-muted-foreground">Week: {formatDateWithWeekday(weekStart)} – {formatDateWithWeekday(addDaysIso(weekStart, 6))}</div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={() => setWeekStart(addDaysIso(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                    <input type="date" value={weekStart} onChange={(e) => setWeekStart(toMonday(e.target.value))} className="rounded-md border border-input bg-background px-2 py-1 text-sm" />
                    <Button variant="outline" size="icon" onClick={() => setWeekStart(addDaysIso(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-2"><CardTitle>My Timetable</CardTitle></CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                        <div className="divide-y">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, idx) => (
                                <div key={label} className="py-3">
                                    <div className="text-sm font-medium mb-2">{formatDateWithWeekday(addDaysIso(weekStart, idx))}</div>
                                    {grouped[idx + 1].length === 0 ? (
                                        <div className="text-sm text-muted-foreground">No periods.</div>
                                    ) : (
                                        <ul className="space-y-2">
                                            {grouped[idx + 1].map((e, i) => {
                                                const className = classes.find(c => c.id === e.class_id)?.name || '-';
                                                const sectionName = sections.find(s => s.id === e.section_id)?.name || '-';
                                                return (
                                                    <li key={i} className="flex items-center justify-between text-sm rounded-md border p-2">
                                                        <span>Period {e.period_no} • {e.start_time}–{e.end_time}</span>
                                                        <span className="text-muted-foreground">Class {className} / Section {sectionName}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function formatDateWithWeekday(iso: string): string {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    return `${dd}-${mm}-${yyyy} (${weekday})`;
}

function getMondayIso(d: Date): string { const day = (d.getDay() + 6) % 7; const monday = new Date(d); monday.setDate(d.getDate() - day); return toIsoDate(monday); }
function addDaysIso(iso: string, days: number): string { const d = new Date(iso); d.setDate(d.getDate() + days); return toIsoDate(d); }
function toIsoDate(d: Date): string { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; }
function toMonday(iso: string): string { if (!iso) return iso; const d = new Date(iso); return getMondayIso(d); }


