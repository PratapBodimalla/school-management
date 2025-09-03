"use client";

import { useState, useEffect } from "react";
import { supabase, type UserRole } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

export default function HomeClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<"signin" | "signup" | "set-password">("signin");

    // Handle mode from URL query parameter
    useEffect(() => {
        const modeParam = searchParams.get('mode');
        if (modeParam === 'signup') {
            setMode('signup');
        } else if (modeParam === 'set-password') {
            setMode('set-password');
        }
    }, [searchParams]);

    // Establish session from magic-link parameters if present
    useEffect(() => {
        (async () => {
            const doRedirect = () => {
                try {
                    const raw = searchParams.get('redirect_to');
                    if (typeof window !== 'undefined' && raw) {
                        const decoded = decodeURIComponent(raw);
                        const url = new URL(decoded, window.location.origin);
                        if (url.origin === window.location.origin) {
                            router.replace(url.pathname + url.search);
                            return;
                        }
                    }
                } catch { }
                router.replace('/?mode=set-password');
            };

            try {
                // 1) Hash fragment tokens: #access_token=...&refresh_token=...
                if (typeof window !== 'undefined' && window.location.hash) {
                    const hashParams = new URLSearchParams(window.location.hash.slice(1));
                    const access_token = hashParams.get('access_token');
                    const refresh_token = hashParams.get('refresh_token');
                    if (access_token && refresh_token) {
                        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (!error && data.session) {
                            // Clean hash from URL
                            window.history.replaceState({}, '', window.location.pathname + window.location.search);
                            doRedirect();
                            return;
                        }
                    }
                }

                // 2) PKCE code param
                const code = searchParams.get('code');
                if (code) {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (!error && data.session) {
                        doRedirect();
                        return; // session ready
                    }
                }

                // 3) token_hash + type (magiclink/recovery)
                const token_hash = searchParams.get('token_hash');
                const type = searchParams.get('type');
                if (token_hash && type) {
                    const otpType = ((): 'email' | 'magiclink' | 'recovery' | 'signup' | 'invite' | 'email_change' => {
                        const t = type.toLowerCase();
                        if (t === 'email' || t === 'magiclink' || t === 'recovery' || t === 'signup' || t === 'invite' || t === 'email_change') return t;
                        return 'email';
                    })();
                    const { error } = await supabase.auth.verifyOtp({ token_hash, type: otpType });
                    if (!error) {
                        doRedirect();
                        return; // session established
                    }
                }
            } catch { }
        })();
    }, [searchParams, router]);

    useEffect(() => {
        const sub = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                try {
                    let role: string | null = (session.user?.user_metadata?.role as string | undefined) ?? null;
                    if (!role) {
                        const { data: profile } = await supabase
                            .from('users_profile')
                            .select('role')
                            .eq('id', session.user?.id)
                            .maybeSingle();
                        role = (profile?.role as string | undefined) ?? null;
                    }
                    const endpoint = role === 'Teacher' ? '/api/teachers/activate' : (role === 'Student' ? '/api/students/activate' : null);
                    if (endpoint) {
                        await fetch(endpoint, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${session.access_token}` }
                        });
                    }
                } catch { }
            }
        });
        return () => { sub.data.subscription.unsubscribe(); };
    }, []);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [role, setRole] = useState<UserRole>("Student");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    function roleToPath(r?: string | null) {
        if (!r) return "/dashboard";
        const rr = String(r).toLowerCase();
        if (rr === "admin") return "/admin";
        if (rr === "teacher") return "/teacher";
        if (rr === "student") return "/student";
        return "/";
    }

    async function redirectBySession(session: unknown) {
        try {
            const s = session as { user?: { id: string; user_metadata?: Record<string, unknown> } } | null;
            const metaRole = (s?.user?.user_metadata?.role as string | undefined) ?? undefined;
            if (metaRole) {
                router.replace(roleToPath(metaRole));
                return;
            }
            const { data: profile } = await supabase
                .from("users_profile")
                .select("role")
                .eq("id", s?.user?.id)
                .maybeSingle();
            router.replace(roleToPath(profile?.role));
        } catch {
            router.replace("/dashboard");
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            if (mode === "set-password") {
                if (!password || password !== confirm) {
                    setMessage("Passwords do not match");
                    return;
                }
                const { error: updErr } = await supabase.auth.updateUser({ password });
                if (updErr) throw updErr;
                const { data } = await supabase.auth.getSession();
                await redirectBySession(data.session);
                return;
            }

            if (mode === "signup") {
                // Create account with role in user metadata (confirmation disabled in settings)
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { role } },
                });
                if (error) throw error;

                // If session is not returned (some projects), immediately sign in
                const session = data.session;
                if (session) {
                    await redirectBySession(session);
                } else {
                    const { data: signinData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
                    if (signInErr) throw signInErr;
                    await redirectBySession(signinData.session);
                }
            } else {
                const { data: signinData, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                await redirectBySession(signinData.session);
            }
        } catch (err: unknown) {
            if (err instanceof Error) setMessage(err.message);
            else setMessage('Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
            <section className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-12">
                <h1 className="text-4xl font-bold tracking-tight text-center">Sloka School Management</h1>
                <p className="mt-4 text-white/90 text-center max-w-md">
                    Manage classes, teachers, students, timetables, and fees in one platform.
                </p>
            </section>
            <section className="flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* {mode !== 'set-password' && (
                        <div className="mb-6 flex rounded-full border border-black/10 dark:border-white/10">
                            <button
                                className={`w-1/2 py-2 text-sm rounded-l-full ${mode === "signin" ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}
                                onClick={() => setMode("signin")}
                            >
                                Sign In
                            </button>
                            <button
                                className={`w-1/2 py-2 text-sm rounded-r-full ${mode === "signup" ? "bg-black text-white dark:bg-white dark:text-black" : ""}`}
                                onClick={() => setMode("signup")}
                            >
                                Sign Up
                            </button>
                        </div>
                    )} */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode !== 'set-password' && (
                            <div>
                                <label className="block text-sm mb-1">Email ID</label>
                                <input
                                    type="email"
                                    className="w-full rounded-md border border-black/10 dark:border-white/10 px-3 py-2 bg-white dark:bg-transparent"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm mb-1">{mode === 'set-password' ? 'New password' : 'Password'}</label>
                            <input
                                type="password"
                                className="w-full rounded-md border border-black/10 dark:border-white/10 px-3 py-2 bg-white dark:bg-transparent"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {mode === 'set-password' && (
                            <div>
                                <label className="block text-sm mb-1">Confirm password</label>
                                <input
                                    type="password"
                                    className="w-full rounded-md border border-black/10 dark:border-white/10 px-3 py-2 bg-white dark:bg-transparent"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {mode === "signup" && (
                            <div>
                                <label className="block text-sm mb-1">Role</label>
                                <select
                                    className="w-full rounded-md border border-black/10 dark:border-white/10 px-3 py-2 bg-white dark:bg-transparent"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserRole)}
                                >
                                    <option>Admin</option>
                                    <option>Teacher</option>
                                    <option>Student</option>
                                </select>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-md bg-black text-white dark:bg-white dark:text-black py-2 font-medium"
                        >
                            {loading
                                ? "Please wait..."
                                : mode === "signup"
                                    ? "Create account"
                                    : mode === 'set-password'
                                        ? "Set password"
                                        : "Login"}
                        </button>
                        {message && (
                            <div className="text-sm text-center space-y-2">
                                <p className="text-red-600 dark:text-red-400">{message}</p>
                            </div>
                        )}
                    </form>
                </div>
            </section>
        </div>
    );
}


