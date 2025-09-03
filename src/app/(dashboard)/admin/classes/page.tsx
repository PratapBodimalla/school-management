"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/lib/roleGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MoreHorizontal, Edit, Trash2, X, CheckCircle, XCircle, Loader2, Eye } from "lucide-react";

const SCHOOL_ID = "f27cf87b-d3fb-41c1-8f23-0558c222768d";

interface SchoolClass {
    id: string;
    name: string;
    school_id: string;
    sections: string[];
    created_at: string;
    updated_at: string;
}

interface CreateClassForm {
    name: string;
    sections: string[];
}

export default function AdminClassesPage() {
    const { loading, isAuthorized } = useRoleGuard("Admin");
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [editItem, setEditItem] = useState<SchoolClass | null>(null);
    const [viewItem, setViewItem] = useState<SchoolClass | null>(null);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (isAuthorized) {
            loadClasses();
        }
    }, [isAuthorized]);

    async function loadClasses() {
        setLoadingClasses(true);
        try {
            const response = await fetch(`/api/classes?school_id=${SCHOOL_ID}`);
            if (response.ok) {
                const data = await response.json();
                setClasses(data);
            } else {
                const errorData = await response.json();
                setMessage({ type: 'error', text: errorData.error || 'Failed to load classes' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load classes' });
        } finally {
            setLoadingClasses(false);
        }
    }

    async function handleCreate(payload: CreateClassForm) {
        setLoadingClasses(true);
        setMessage(null);

        try {
            const response = await fetch('/api/classes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: payload.name,
                    school_id: SCHOOL_ID,
                    sections: payload.sections
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: `Class "${payload.name}" created successfully` });
                setShowCreate(false);
                await loadClasses();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to create class' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to create class' });
        } finally {
            setLoadingClasses(false);
        }
    }

    async function handleUpdate(updated: SchoolClass) {
        setLoadingClasses(true);
        setMessage(null);

        try {
            const response = await fetch(`/api/classes/${updated.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: updated.name,
                    sections: updated.sections
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: `Class "${updated.name}" updated successfully` });
                setEditItem(null);
                await loadClasses();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to update class' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update class' });
        } finally {
            setLoadingClasses(false);
        }
    }

    async function handleDelete(id: string) {
        setLoadingClasses(true);
        setMessage(null);

        try {
            const response = await fetch(`/api/classes/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Class deleted successfully' });
                await loadClasses();
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Failed to delete class' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete class' });
        } finally {
            setLoadingClasses(false);
        }
    }

    function handleViewClass(classItem: SchoolClass) {
        setViewItem(classItem);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg md:text-xl font-semibold">Classes · Sloka School</h1>
                <Button onClick={() => setShowCreate(true)}>Create Class</Button>
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

            {loadingClasses ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {classes.map((c) => (
                        <Card key={c.id} className="relative">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">{c.name}</CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleViewClass(c)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Class
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setEditItem(c)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Class
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(c.id)}
                                                className="text-red-600 focus:text-red-600 focus:bg-red-50 focus:bg-red-50 dark:focus:bg-red-950"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete Class
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="text-sm text-muted-foreground">Sections</div>
                                <div className="flex flex-wrap gap-2">
                                    {c.sections.length === 0 && (
                                        <span className="text-sm text-muted-foreground">No sections</span>
                                    )}
                                    {c.sections.map((s) => (
                                        <Badge key={s} variant="secondary">
                                            {s}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {showCreate && (
                <ClassModal
                    title="Create Class · Sloka School"
                    onClose={() => setShowCreate(false)}
                    onSubmit={handleCreate}
                />
            )}
            {editItem && (
                <ClassModal
                    title="Edit Class · Sloka School"
                    initial={editItem}
                    onClose={() => setEditItem(null)}
                    onSubmit={(payload) => handleUpdate({ ...editItem, ...payload })}
                />
            )}
            {viewItem && (
                <ViewClassModal
                    title="View Class · Sloka School"
                    classData={viewItem}
                    onClose={() => setViewItem(null)}
                />
            )}
        </div>
    );
}

function ClassModal({
    title,
    initial,
    onClose,
    onSubmit
}: {
    title: string;
    initial?: Partial<SchoolClass>;
    onClose: () => void;
    onSubmit: (data: CreateClassForm) => void
}) {
    const [name, setName] = useState(initial?.name ?? "");
    const [sections, setSections] = useState<string[]>(initial?.sections ?? []);
    const [sectionInput, setSectionInput] = useState("");

    function addSection() {
        const trimmed = sectionInput.trim();
        if (!trimmed) return;
        if (sections.includes(trimmed)) return;
        setSections((prev) => [...prev, trimmed]);
        setSectionInput("");
    }

    function removeSection(section: string) {
        setSections((prev) => prev.filter((s) => s !== section));
    }

    const handleSubmit = () => {
        if (!name.trim()) return;
        onSubmit({ name: name.trim(), sections });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="className">Class Name</Label>
                        <Input
                            id="className"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Class 10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Sections</Label>
                        <div className="flex gap-2">
                            <Input
                                value={sectionInput}
                                onChange={(e) => setSectionInput(e.target.value)}
                                placeholder="A"
                                className="flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && addSection()}
                            />
                            <Button type="button" onClick={addSection} variant="outline">Add</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {sections.map((s) => (
                                <Badge key={s} variant="secondary" className="inline-flex items-center gap-2">
                                    {s}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 p-0 hover:bg-transparent"
                                        onClick={() => removeSection(s)}
                                        aria-label={`Remove section ${s}`}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim()}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ViewClassModal({
    title,
    classData,
    onClose
}: {
    title: string;
    classData: SchoolClass;
    onClose: () => void
}) {
    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Class Name</Label>
                        <div className="text-base font-medium">{classData.name}</div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Sections</Label>
                        <div className="flex flex-wrap gap-2">
                            {classData.sections.length === 0 ? (
                                <span className="text-sm text-muted-foreground">No sections</span>
                            ) : (
                                classData.sections.map((s) => (
                                    <Badge key={s} variant="secondary">
                                        {s}
                                    </Badge>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                        <div className="text-sm text-muted-foreground">
                            {new Date(classData.created_at).toLocaleDateString()}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                        <div className="text-sm text-muted-foreground">
                            {new Date(classData.updated_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}




