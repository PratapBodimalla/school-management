"use client";

import { useEffect, useState } from "react";
import { clientStore, type Teacher } from "@/lib/clientStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";

export default function AdminTeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);

    useEffect(() => {
        setTeachers(clientStore.listTeachers());
    }, []);

    function refresh() { setTeachers(clientStore.listTeachers()); }

    function handleCreate(newTeacher: Teacher) {
        clientStore.upsertTeacher({ ...newTeacher, id: String(Date.now()) });
        setShowCreate(false);
        refresh();
    }

    function handleEdit(updated: Teacher) {
        clientStore.upsertTeacher(updated);
        setEditTeacher(null);
        refresh();
    }

    function handleDelete(id: string) {
        clientStore.deleteTeacher(id);
        refresh();
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg md:text-xl font-semibold">Teachers</h1>
                <Button onClick={() => setShowCreate(true)}>Create Teacher</Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {teachers.map((t) => (
                    <Card key={t.id} className="relative">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{t.firstName} {t.lastName}</CardTitle>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setEditTeacher(t)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Teacher
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleDelete(t.id)}
                                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Teacher
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-sm text-muted-foreground">{t.email}</div>
                            <div className="text-sm">
                                <span className="text-muted-foreground">Subject:</span> {t.subject}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {showCreate && (
                <TeacherModal title="Create Teacher" onClose={() => setShowCreate(false)} onSubmit={(payload) => handleCreate(payload as Teacher)} />
            )}
            {editTeacher && (
                <TeacherModal
                    title="Edit Teacher"
                    initial={editTeacher}
                    onClose={() => setEditTeacher(null)}
                    onSubmit={(payload) => handleEdit({ ...(payload as Teacher), id: editTeacher.id })}
                />
            )}
        </div>
    );
}

function TeacherModal({ title, initial, onClose, onSubmit }: { title: string; initial?: Partial<Teacher>; onClose: () => void; onSubmit: (data: Partial<Teacher>) => void }) {
    const [firstName, setFirstName] = useState(initial?.firstName ?? "");
    const [lastName, setLastName] = useState(initial?.lastName ?? "");
    const [email, setEmail] = useState(initial?.email ?? "");
    const [subject, setSubject] = useState(initial?.subject ?? "");

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Jane"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Smith"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jane@school.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Mathematics"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSubmit({ firstName, lastName, email, subject })}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}




