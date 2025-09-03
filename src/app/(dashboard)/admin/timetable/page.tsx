"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Copy, Trash2, Save, Calendar, ChevronDown, ChevronUp } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FIXED_SCHOOL_ID = "f27cf87b-d3fb-41c1-8f23-0558c222768d";

type TeacherMeta = { id: string; first_name: string; last_name: string };
type PeriodMeta = { period_no: number; start_time: string; end_time: string };
type Cell = { day_of_week: number; period_no: number; teacher_id: string | null; start_time: string; end_time: string; notes?: string | null };

export default function AdminTimetablePage() {
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [sections, setSections] = useState<{ id: string; name: string; class_id: string }[]>([]);
    const [classId, setClassId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [teachers, setTeachers] = useState<TeacherMeta[]>([]);
    const [holidayDays, setHolidayDays] = useState<Set<number>>(new Set());
    const [periods, setPeriods] = useState<PeriodMeta[]>([]);
    const [weekStart, setWeekStart] = useState<string>(getMondayIso(new Date()));
    const [cells, setCells] = useState<Record<string, Cell>>({});
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadMeta = async () => {
            try {
                const [clsRes, secRes, metaRes] = await Promise.all([
                    authenticatedFetch('/api/classes'),
                    authenticatedFetch('/api/sections'),
                    authenticatedFetch(`/api/timetable/meta?school_id=${encodeURIComponent(FIXED_SCHOOL_ID)}`)
                ]);
                const [clsData, secData, metaData] = await Promise.all([clsRes.json(), secRes.json(), metaRes.json()]);
                setClasses(Array.isArray(clsData?.classes) ? clsData.classes : (Array.isArray(clsData) ? clsData : []));
                setSections(Array.isArray(secData?.sections) ? secData.sections : []);
                setTeachers(Array.isArray(metaData?.teachers) ? metaData.teachers : []);
                setPeriods(Array.isArray(metaData?.periods) ? metaData.periods : []);
            } catch {
                setClasses([]); setSections([]); setTeachers([]); setPeriods([]);
            }
        };
        loadMeta();
    }, []);

    useEffect(() => {
        if (!classId || !sectionId || !weekStart) return;
        const loadWeek = async () => {
            setLoading(true);
            setMessage(null);
            try {
                const res = await authenticatedFetch(`/api/timetable?school_id=${encodeURIComponent(FIXED_SCHOOL_ID)}&class_id=${encodeURIComponent(classId)}&section_id=${encodeURIComponent(sectionId)}&week_start=${encodeURIComponent(weekStart)}`);
                const data = await res.json();
                const base: Record<string, Cell> = {};
                for (let d = 1; d <= 7; d++) {
                    for (const p of periods) {
                        const key = `${d}-${p.period_no}`;
                        base[key] = { day_of_week: d, period_no: p.period_no, teacher_id: null, start_time: p.start_time, end_time: p.end_time, notes: null };
                    }
                }
                if (Array.isArray(data?.entries)) {
                    for (const e of data.entries as Cell[]) {
                        const key = `${e.day_of_week}-${e.period_no}`;
                        base[key] = { ...base[key], ...e };
                    }
                }
                setCells(base);
                // Fetch holidays for visual tag (non-blocking)
                try {
                    const start = weekStart;
                    const end = addDaysIso(weekStart, 6);
                    const hres = await authenticatedFetch(`/api/holidays/range?school_id=${encodeURIComponent(FIXED_SCHOOL_ID)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
                    const hdata = await hres.json();
                    const days = new Set<number>();
                    if (Array.isArray(hdata?.holidays)) {
                        for (const h of hdata.holidays as any[]) {
                            const from = h.start_date;
                            const to = h.end_date ?? h.start_date;
                            let cur = new Date(from);
                            const endD = new Date(to);
                            while (cur <= endD) {
                                const js = cur.getDay();
                                const idx = (js + 6) % 7; // Mon=0 .. Sun=6
                                days.add(idx);
                                cur.setDate(cur.getDate() + 1);
                            }
                        }
                    }
                    setHolidayDays(days);
                } catch { setHolidayDays(new Set()); }
            } catch {
                setCells({});
                setMessage('Failed to load timetable');
            } finally {
                setLoading(false);
            }
        };
        loadWeek();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classId, sectionId, weekStart, periods.length]);

    const setTeacherFor = (dayIdx: number, periodNo: number, teacherId: string | null) => {
        const dow = dayIdx + 1; // UI index 0..6 => API 1..7
        const key = `${dow}-${periodNo}`;
        setCells(prev => ({ ...prev, [key]: { ...prev[key], teacher_id: teacherId } }));
    };

    const save = async () => {
        if (!classId || !sectionId) return;
        setLoading(true);
        setMessage(null);
        try {
            const entries = Object.values(cells);
            const resp = await authenticatedFetch('/api/timetable/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ school_id: FIXED_SCHOOL_ID, class_id: classId, section_id: sectionId, week_start: weekStart, entries })
            });
            const data = await resp.json();
            if (!resp.ok) setMessage(data?.error || 'Save failed'); else setMessage('Saved');
        } catch {
            setMessage('Save failed');
        } finally {
            setLoading(false);
        }
    };

    const copyPrevWeek = async () => {
        if (!classId || !sectionId) return;
        setLoading(true);
        setMessage(null);
        try {
            const resp = await authenticatedFetch('/api/timetable/copy-previous', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ school_id: FIXED_SCHOOL_ID, class_id: classId, section_id: sectionId, week_start: weekStart })
            });
            const data = await resp.json();
            if (!resp.ok) setMessage(data?.error || 'Copy failed'); else setMessage(`Copied ${data?.copied_count ?? 0} slots`);
            // reload
            const res = await authenticatedFetch(`/api/timetable?school_id=${encodeURIComponent(FIXED_SCHOOL_ID)}&class_id=${encodeURIComponent(classId)}&section_id=${encodeURIComponent(sectionId)}&week_start=${encodeURIComponent(weekStart)}`);
            const dt = await res.json();
            if (Array.isArray(dt?.entries)) {
                const base: Record<string, Cell> = {};
                for (let d = 1; d <= 7; d++) {
                    for (const p of periods) base[`${d}-${p.period_no}`] = { day_of_week: d, period_no: p.period_no, teacher_id: null, start_time: p.start_time, end_time: p.end_time, notes: null };
                }
                for (const e of dt.entries as Cell[]) base[`${e.day_of_week}-${e.period_no}`] = { ...base[`${e.day_of_week}-${e.period_no}`], ...e };
                setCells(base);
            }
        } catch {
            setMessage('Copy failed');
        } finally {
            setLoading(false);
        }
    };

    const clearWeek = async () => {
        if (!classId || !sectionId) return;
        if (!confirm('Clear all slots for this week?')) return;
        setLoading(true);
        setMessage(null);
        try {
            const resp = await authenticatedFetch('/api/timetable/clear-week', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ school_id: FIXED_SCHOOL_ID, class_id: classId, section_id: sectionId, week_start: weekStart })
            });
            const data = await resp.json();
            if (!resp.ok) setMessage(data?.error || 'Clear failed'); else setMessage('Cleared');
            // reset local
            const base: Record<string, Cell> = {};
            for (let d = 1; d <= 7; d++) for (const p of periods) base[`${d}-${p.period_no}`] = { day_of_week: d, period_no: p.period_no, teacher_id: null, start_time: p.start_time, end_time: p.end_time, notes: null };
            setCells(base);
        } catch {
            setMessage('Clear failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 justify-between">
                <h1 className="text-lg md:text-xl font-semibold">Timetable</h1>
                <div className="flex flex-wrap gap-2">
                    <Select value={classId} onValueChange={(value) => { setClassId(value); setSectionId(""); }}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={sectionId} onValueChange={setSectionId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                            {sections.filter(s => s.class_id === classId).map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                        <Button type="button" variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekStart(addDaysIso(weekStart, -7))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Input type="date" value={weekStart} onChange={(e) => setWeekStart(toMonday(e.target.value))} />
                        <Button type="button" variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekStart(addDaysIso(weekStart, 7))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={copyPrevWeek} variant="outline" disabled={!classId || !sectionId || loading}>
                        <Copy className="mr-2 h-4 w-4" /> Copy prev week
                    </Button>
                    <Button onClick={clearWeek} variant="outline" disabled={!classId || !sectionId || loading}>
                        <Trash2 className="mr-2 h-4 w-4" /> Clear week
                    </Button>
                    <Button onClick={save} disabled={!classId || !sectionId || loading}>
                        <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                </div>
            </div>

            {message && (
                <div className="rounded-md border px-3 py-2 text-sm bg-muted/50">{message}</div>
            )}
            <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Week: {formatDateWithWeekday(weekStart)} – {formatDateWithWeekday(addDaysIso(weekStart, 6))}
            </div>

            <div className="rounded-xl border border-black/10 dark:border-white/10 divide-y">
                {DAYS.map((label, dayIdx) => (
                    <DaySection
                        key={label}
                        dayIdx={dayIdx}
                        dateIso={addDaysIso(weekStart, dayIdx)}
                        label={label}
                        isHoliday={holidayDays.has(dayIdx)}
                        teachers={teachers}
                        periods={periods}
                        getValueFor={(periodNo) => {
                            const dow = dayIdx + 1;
                            const key = `${dow}-${periodNo}`;
                            return cells[key]?.teacher_id ?? null;
                        }}
                        onChangeTeacher={(periodNo, teacherId) => setTeacherFor(dayIdx, periodNo, teacherId)}
                        disabled={!classId || !sectionId || loading}
                    />
                ))}
            </div>
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

function DaySection({ dayIdx, dateIso, label, isHoliday, teachers, periods, getValueFor, onChangeTeacher, disabled }: { dayIdx: number; dateIso: string; label: string; isHoliday: boolean; teachers: TeacherMeta[]; periods: PeriodMeta[]; getValueFor: (periodNo: number) => string | null; onChangeTeacher: (periodNo: number, teacherId: string | null) => void; disabled: boolean; }) {
    const [expanded, setExpanded] = useState(false);
    const header = formatDateWithWeekday(dateIso);
    return (
        <div>
            <Button onClick={() => setExpanded(v => !v)} variant="ghost" className="w-full justify-between px-4 py-3 h-auto">
                <span className="font-medium">{header} {isHoliday ? <span className="ml-2 text-xs rounded px-2 py-0.5 border">Holiday</span> : null}</span>
                <div className="flex items-center gap-2">
                    <span className="text-sm">{expanded ? "Collapse" : "Expand"}</span>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </Button>
            {expanded && (
                <div className="border-t">
                    {periods.map((p) => (
                        <div key={`${label}-${p.period_no}`} className="grid grid-cols-[1fr_2fr] items-center gap-3 px-4 py-2 border-b">
                            <div className="whitespace-nowrap">Period {p.period_no}: {p.start_time}–{p.end_time}</div>
                            <div>
                                <Select disabled={disabled} value={(getValueFor(p.period_no) ?? '__none__')} onValueChange={(value) => onChangeTeacher(p.period_no, value === '__none__' ? null : value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select teacher" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Unassigned</SelectItem>
                                        {teachers.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Helpers
function getMondayIso(d: Date): string {
    const day = (d.getDay() + 6) % 7; // Mon=0
    const monday = new Date(d);
    monday.setDate(d.getDate() - day);
    return toIsoDate(monday);
}

function toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return toIsoDate(d);
}

function rangeDates(startIso: string, endIso: string): string[] {
    const res: string[] = [];
    let d = new Date(startIso);
    const end = new Date(endIso);
    while (d <= end) {
        res.push(toIsoDate(d));
        d.setDate(d.getDate() + 1);
    }
    return res;
}

function dayIndexFromIso(iso: string): number {
    // Map Mon..Sun -> 0..6
    const js = new Date(iso).getDay(); // Sun=0..Sat=6
    return (js + 6) % 7;
}

function toMonday(iso: string): string {
    if (!iso) return iso;
    const d = new Date(iso);
    return getMondayIso(d);
}


