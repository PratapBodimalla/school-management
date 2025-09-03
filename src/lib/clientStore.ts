"use client";

// Lightweight localStorage-backed store to keep UI in sync across routes (no server yet)

export type Holiday = {
    id: string;
    name: string;
    startDate: string; // ISO yyyy-mm-dd
    endDate: string;   // ISO yyyy-mm-dd
    type: "holiday" | "closure" | "exam";
    description?: string;
};

export type TimetableEntry = {
    id: string;
    dayOfWeek: number; // 0-6 (Mon-Sun => 0-6 for simplicity)
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    subject?: string;
    teacher?: string;
    room?: string;
    notes?: string;
};

export type Timetable = {
    id: string;
    className: string;
    section: string;
    weekStartDate: string; // ISO Monday date
    entries: TimetableEntry[];
};

const KEY_HOLIDAYS = "school_ui_holidays";
const KEY_TIMETABLES = "school_ui_timetables";
const KEY_CLASSES = "school_ui_classes";
const KEY_TEACHERS = "school_ui_teachers";

export type SchoolClass = { id: string; name: string; sections: string[] };
export type Teacher = { id: string; firstName: string; lastName: string; email: string; subject: string };

function read<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

function write<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
}

export const clientStore = {
    // Holidays
    listHolidays(): Holiday[] {
        return read<Holiday[]>(KEY_HOLIDAYS, []);
    },
    upsertHoliday(holiday: Holiday) {
        const list = read<Holiday[]>(KEY_HOLIDAYS, []);
        const next = list.some((h) => h.id === holiday.id)
            ? list.map((h) => (h.id === holiday.id ? holiday : h))
            : [holiday, ...list];
        write(KEY_HOLIDAYS, next);
    },
    deleteHoliday(id: string) {
        const list = read<Holiday[]>(KEY_HOLIDAYS, []);
        write(KEY_HOLIDAYS, list.filter((h) => h.id !== id));
    },
    holidaysInRange(start: string, end: string): Holiday[] {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        return this.listHolidays().filter((h) => {
            const hs = new Date(h.startDate).getTime();
            const he = new Date(h.endDate).getTime();
            return he >= s && hs <= e;
        });
    },

    // Timetables
    listTimetables(): Timetable[] {
        return read<Timetable[]>(KEY_TIMETABLES, []);
    },
    upsertTimetable(tt: Timetable) {
        const list = read<Timetable[]>(KEY_TIMETABLES, []);
        const next = list.some((t) => t.id === tt.id) ? list.map((t) => (t.id === tt.id ? tt : t)) : [tt, ...list];
        write(KEY_TIMETABLES, next);
    },
    deleteTimetable(id: string) {
        const list = read<Timetable[]>(KEY_TIMETABLES, []);
        write(KEY_TIMETABLES, list.filter((t) => t.id !== id));
    },
    findTimetable(className: string, section: string, weekStartDate: string): Timetable | undefined {
        return this.listTimetables().find((t) => t.className === className && t.section === section && t.weekStartDate === weekStartDate);
    },

    // Classes
    listClasses(): SchoolClass[] { return read<SchoolClass[]>(KEY_CLASSES, []); },
    upsertClass(cls: SchoolClass) {
        const list = read<SchoolClass[]>(KEY_CLASSES, []);
        const next = list.some((c) => c.id === cls.id) ? list.map((c) => (c.id === cls.id ? cls : c)) : [cls, ...list];
        write(KEY_CLASSES, next);
    },
    deleteClass(id: string) {
        write(KEY_CLASSES, this.listClasses().filter((c) => c.id !== id));
    },

    // Teachers
    listTeachers(): Teacher[] { return read<Teacher[]>(KEY_TEACHERS, []); },
    upsertTeacher(t: Teacher) {
        const list = read<Teacher[]>(KEY_TEACHERS, []);
        const next = list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [t, ...list];
        write(KEY_TEACHERS, next);
    },
    deleteTeacher(id: string) {
        write(KEY_TEACHERS, this.listTeachers().filter((t) => t.id !== id));
    },
};


