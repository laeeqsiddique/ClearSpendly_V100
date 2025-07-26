"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TeamLoading from "../loading";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/team/members', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setIsAuthorized(true);
        } else if (response.status === 401 || response.status === 403) {
          console.warn('Not authorized to view team page');
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/dashboard');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return <TeamLoading />;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}