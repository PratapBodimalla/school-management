"use client";

import { useEffect, useMemo, useState } from "react";
import { clientStore, type Holiday } from "@/lib/clientStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Edit, Trash2, Plus } from "lucide-react";

export default function AdminHolidaysPage() {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Holiday | null>(null);

    useEffect(() => {
        setHolidays(clientStore.listHolidays());
    }, []);

    function refresh() {
        setHolidays(clientStore.listHolidays());
    }

    function upsert(data: Omit<Holiday, "id"> & { id?: string }) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (end < start) return alert("End date cannot be before start date.");
        const normalized: Holiday = {
            id: data.id ?? String(Date.now()),
            name: data.name.trim(),
            startDate: data.startDate,
            endDate: data.endDate,
            type: data.type,
            description: data.description?.trim() || undefined,
        };
        clientStore.upsertHoliday(normalized);
        setShowModal(false);
        setEditing(null);
        refresh();
    }

    function remove(id: string) {
        clientStore.deleteHoliday(id);
        refresh();
    }

    const sorted = useMemo(() => {
        return [...holidays].sort((a, b) => a.startDate.localeCompare(b.startDate));
    }, [holidays]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg md:text-xl font-semibold">Holidays</h1>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Holiday
                </Button>
            </div>

            <div className="rounded-xl border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Start</TableHead>
                            <TableHead>End</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sorted.map((h) => (
                            <TableRow key={h.id}>
                                <TableCell className="font-medium">{h.name}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize">
                                        {h.type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{h.startDate}</TableCell>
                                <TableCell className="whitespace-nowrap">{h.endDate}</TableCell>
                                <TableCell className="max-w-[360px] truncate" title={h.description}>
                                    {h.description || "—"}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setEditing(h); setShowModal(true); }}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                                onClick={() => remove(h.id)}
                                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {sorted.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                                    No holidays yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {showModal && (
                <HolidayModal
                    title={editing ? "Edit Holiday" : "Add Holiday"}
                    initial={editing ?? undefined}
                    onClose={() => { setShowModal(false); setEditing(null); }}
                    onSubmit={upsert}
                />
            )}
        </div>
    );
}

function HolidayModal({ title, initial, onClose, onSubmit }: { title: string; initial?: Holiday; onClose: () => void; onSubmit: (data: Omit<Holiday, "id"> & { id?: string }) => void }) {
    const [name, setName] = useState(initial?.name ?? "");
    const [type, setType] = useState<Holiday["type"]>(initial?.type ?? "holiday");
    const [isMulti, setIsMulti] = useState(Boolean(initial && initial.startDate !== initial.endDate));
    const [startDate, setStartDate] = useState(initial?.startDate ?? "");
    const [endDate, setEndDate] = useState(initial?.endDate ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");

    function submit() {
        const sd = startDate || endDate; // allow single-date fallback
        const ed = isMulti ? (endDate || startDate) : (startDate || endDate);
        if (!name.trim() || !sd || !ed) return alert("Please fill name and date(s).");
        const normStart = sd;
        const normEnd = isMulti ? ed : sd;
        onSubmit({ id: initial?.id, name, type, startDate: normStart, endDate: normEnd, description });
    }

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input 
                            id="name"
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="Independence Day" 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select value={type} onValueChange={(value) => setType(value as Holiday["type"])}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="holiday">Holiday</SelectItem>
                                <SelectItem value="closure">Closure</SelectItem>
                                <SelectItem value="exam">Exam break</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="multi" 
                            checked={isMulti} 
                            onCheckedChange={(checked) => setIsMulti(checked as boolean)} 
                        />
                        <Label htmlFor="multi">Multi-day</Label>
                    </div>
                    {!isMulti ? (
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input 
                                id="date"
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                            />
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start date</Label>
                                <Input 
                                    id="startDate"
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End date</Label>
                                <Input 
                                    id="endDate"
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)} 
                                />
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <textarea 
                            id="description"
                            rows={3} 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            placeholder="Optional"
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}




