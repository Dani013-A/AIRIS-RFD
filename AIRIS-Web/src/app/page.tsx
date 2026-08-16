"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../store/authStore";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export default function RootPage() {
  const router = useRouter();
  const { currentAdmin, initialized, initializeSession } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initializeSession();
    return () => unsubscribe();
  }, [initializeSession]);

  useEffect(() => {
    if (initialized) {
      if (currentAdmin) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [initialized, currentAdmin, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
    </div>
  );
}
