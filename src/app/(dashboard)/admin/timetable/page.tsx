"use client";

import { useEffect, useMemo, useState } from "react";
import { clientStore, type Timetable, type TimetableEntry, type SchoolClass, type Teacher } from "@/lib/clientStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Copy, Trash2, Save, Calendar, ChevronDown, ChevronUp } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // Sat/Sun default holidays
const PERIODS = [
    { label: "Period 1", start: "08:00", end: "08:45" },
    { label: "Period 2", start: "08:46", end: "09:30" },
    { label: "Period 3", start: "09:31", end: "10:15" },
    { label: "Period 4", start: "10:16", end: "10:45" },
    { label: "Period 5", start: "10:46", end: "11:30" },
    { label: "Lunch Break", start: "12:30", end: "13:00", lunch: true },
    { label: "Period 6", start: "13:01", end: "13:45" },
    { label: "Period 7", start: "13:46", end: "14:30" },
];

export default function AdminTimetablePage() {
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [className, setClassName] = useState("");
    const [section, setSection] = useState("");
    const [weekStart, setWeekStart] = useState<string>(getMondayIso(new Date()));
    const [slots, setSlots] = useState<TimetableEntry[]>([]);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        setClasses(clientStore.listClasses());
        setTeachers(clientStore.listTeachers());
    }, []);

    const holidays = useMemo(() => clientStore.holidaysInRange(weekStart, addDaysIso(weekStart, 6)), [weekStart]);
    const holidayDays = useMemo(() => {
        const fromDefined = new Set(holidays.flatMap((h) => rangeDates(h.startDate, h.endDate).map((d) => dayIndexFromIso(d))));
        // Add Sat(5) and Sun(6)
        fromDefined.add(5);
        fromDefined.add(6);
        return fromDefined;
    }, [holidays]);

    useEffect(() => {
        if (!className || !section) return;
        const existing = clientStore.findTimetable(className, section, weekStart);
        setSlots(existing?.entries ?? []);
        setMessage(null);
    }, [className, section, weekStart]);

    function setEntry(dayIndex: number, startTime: string, endTime: string, subject?: string, teacher?: string, room?: string) {
        if (holidayDays.has(dayIndex)) {
            setMessage("Cannot add entries on a holiday.");
            return;
        }
        const id = `${dayIndex}-${startTime}-${endTime}`;
        const next = slots.some((e) => e.id === id)
            ? slots.map((e) => (e.id === id ? { ...e, subject, teacher, room } : e))
            : [...slots, { id, dayOfWeek: dayIndex, startTime, endTime, subject, teacher, room }];
        setSlots(next);
    }

    function removeEntry(id: string) {
        setSlots((prev) => prev.filter((e) => e.id !== id));
    }

    function clearWeek() {
        setSlots([]);
    }

    function save() {
        // Naive conflict check: ensure no overlapping per day/time pair id uniqueness already enforced via id
        const tt: Timetable = { id: `${className}-${section}-${weekStart}`, className, section, weekStartDate: weekStart, entries: slots };
        clientStore.upsertTimetable(tt);
        setMessage("Saved.");
    }

    function copyPrevWeek() {
        const prevMonday = addDaysIso(weekStart, -7);
        const prev = clientStore.findTimetable(className, section, prevMonday);
        setSlots(prev?.entries ?? []);
    }

    function duplicateTo(targetSection: string) {
        const tt: Timetable = { id: `${className}-${targetSection}-${weekStart}`, className, section: targetSection, weekStartDate: weekStart, entries: slots };
        clientStore.upsertTimetable(tt);
        setMessage(`Duplicated to section ${targetSection}.`);
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 justify-between">
                <h1 className="text-lg md:text-xl font-semibold">Timetable</h1>
                <div className="flex flex-wrap gap-2">
                    <Select value={className} onValueChange={(value) => { setClassName(value); setSection(""); }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map((c) => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={section} onValueChange={setSection}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.find((c) => c.name === className)?.sections.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Previous week"
                            onClick={() => setWeekStart(addDaysIso(weekStart, -7))}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Input type="date" value={weekStart} onChange={(e) => setWeekStart(toMonday(e.target.value))} />
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Next week"
                            onClick={() => setWeekStart(addDaysIso(weekStart, 7))}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button onClick={copyPrevWeek} variant="outline" disabled={!className || !section}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy prev week
                    </Button>
                    <Button onClick={clearWeek} variant="outline" disabled={!className || !section}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear week
                    </Button>
                    <Button onClick={save} disabled={!className || !section}>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                    </Button>
                </div>
            </div>

            {message && (
                <div className="rounded-md border px-3 py-2 text-sm bg-muted/50">
                    {message}
                </div>
            )}
            <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Week: {formatDateWithWeekday(weekStart)} – {formatDateWithWeekday(addDaysIso(weekStart, 6))}
            </div>

            <div className="rounded-xl border border-black/10 dark:border-white/10 divide-y">
                {DAYS.map((label, dayIdx) => {
                    const iso = addDaysIso(weekStart, dayIdx);
                    const isWeekend = dayIdx >= 5;
                    const isHoliday = holidayDays.has(dayIdx);
                    return (
                        <DaySection
                            key={label}
                            dayIdx={dayIdx}
                            dateIso={iso}
                            label={label}
                            isWeekend={isWeekend}
                            isHoliday={isHoliday}
                            teachers={teachers}
                            onAdd={(pStart, pEnd, val) => {
                                const teacher = val ? val.split("|")[0] : undefined;
                                const subject = val ? val.split("|")[1] : undefined;
                                setEntry(dayIdx, pStart, pEnd, subject, teacher);
                            }}
                            disabled={!className || !section}
                        />
                    );
                })}
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Entries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {slots.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">No entries yet.</div>
                    )}
                    {slots.map((e) => (
                        <div key={e.id} className="flex items-center justify-between text-sm p-2 rounded-md border">
                            <div>
                                <span className="font-medium mr-2">{DAYS[e.dayOfWeek]}</span>
                                {e.startTime}–{e.endTime} · {e.subject || "—"} · {e.teacher || "—"}
                            </div>
                            <Button
                                onClick={() => removeEntry(e.id)}
                                variant="outline"
                                size="sm"
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
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

function DaySection({
    dayIdx,
    dateIso,
    label,
    isWeekend,
    isHoliday,
    teachers,
    onAdd,
    disabled,
}: {
    dayIdx: number;
    dateIso: string;
    label: string;
    isWeekend: boolean;
    isHoliday: boolean;
    teachers: { id: string; firstName: string; lastName: string; subject: string }[];
    onAdd: (start: string, end: string, teacherVal: string | undefined) => void;
    disabled: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const header = formatDateWithWeekday(dateIso);

    if (isWeekend) {
        return (
            <div className="px-4 py-3 flex items-center justify-between bg-muted/50">
                <div className="font-medium">{header}</div>
                <Badge variant="secondary">Holiday – All Day</Badge>
            </div>
        );
    }

    return (
        <div>
            <Button
                onClick={() => setExpanded((v) => !v)}
                variant="ghost"
                className="w-full justify-between px-4 py-3 h-auto"
            >
                <span className="font-medium">{header}</span>
                <div className="flex items-center gap-2">
                    <span className="text-sm">{expanded ? "Collapse" : "Expand"}</span>
                    {isHoliday && <Badge variant="outline">Holiday</Badge>}
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </Button>
            {expanded && (
                <div className="border-t">
                    {PERIODS.map((p) => (
                        <div key={`${label}-${p.label}`} className={`grid grid-cols-[1fr_2fr_1fr] items-center gap-3 px-4 py-2 ${p.lunch || isHoliday ? "bg-muted/50" : ""} border-b`}>
                            <div className="whitespace-nowrap">{p.label}: {p.start}–{p.end}</div>
                            <div>
                                {p.lunch ? (
                                    <span className="text-sm text-muted-foreground">Lunch Break</span>
                                ) : (
                                    <Select
                                        disabled={isHoliday || disabled}
                                        onValueChange={(value) => onAdd(p.start, p.end, value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select teacher" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teachers.map((t) => (
                                                <SelectItem key={t.id} value={`${t.firstName} ${t.lastName}|${t.subject}`}>
                                                    {t.firstName} {t.lastName} ({t.subject})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="text-right">
                                {!p.lunch && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isHoliday || disabled}
                                        onClick={() => {
                                            const sel = document.getElementById(`teacher-${dayIdx}-${p.start}`) as HTMLSelectElement;
                                            const val = sel?.value;
                                            onAdd(p.start, p.end, val || undefined);
                                        }}
                                    >
                                        Add
                                    </Button>
                                )}
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


