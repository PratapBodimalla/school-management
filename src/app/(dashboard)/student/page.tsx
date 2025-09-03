"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentIndexRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/student/overview'); }, [router]);
    return null;
}


