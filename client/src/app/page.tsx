"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? "/chat" : "/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">
      Loading your account…
    </main>
  );
}
