"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ReceiptCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "highlighted";
}

export function ReceiptCard({ children, className, variant = "default" }: ReceiptCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "bg-white dark:bg-gray-800",
        "border border-gray-200 dark:border-gray-700",
        "shadow-sm hover:shadow-md transition-shadow",
        variant === "highlighted" && "ring-2 ring-purple-600 dark:ring-purple-400",
        className
      )}
      style={{
        backgroundImage: `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 1px,
            rgba(0,0,0,0.03) 1px,
            rgba(0,0,0,0.03) 2px
          )
        `,
      }}
    >
      {/* Torn paper effect at top */}
      <div className="absolute top-0 left-0 right-0 h-3 overflow-hidden">
        <svg
          className="absolute top-0 w-full h-6"
          viewBox="0 0 100 6"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,3 Q2,1 4,3 T8,3 T12,3 T16,3 T20,3 T24,3 T28,3 T32,3 T36,3 T40,3 T44,3 T48,3 T52,3 T56,3 T60,3 T64,3 T68,3 T72,3 T76,3 T80,3 T84,3 T88,3 T92,3 T96,3 T100,3 L100,0 L0,0 Z"
            fill="white"
            className="dark:fill-gray-900"
          />
        </svg>
      </div>

      {/* Receipt holes on left side */}
      <div className="absolute left-2 top-8 bottom-8 w-1 flex flex-col justify-evenly">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative pl-8 pr-6 py-8">
        {children}
      </div>

      {/* Receipt texture overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Bottom torn edge */}
      <div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden">
        <svg
          className="absolute bottom-0 w-full h-6"
          viewBox="0 0 100 6"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,3 Q2,5 4,3 T8,3 T12,3 T16,3 T20,3 T24,3 T28,3 T32,3 T36,3 T40,3 T44,3 T48,3 T52,3 T56,3 T60,3 T64,3 T68,3 T72,3 T76,3 T80,3 T84,3 T88,3 T92,3 T96,3 T100,3 L100,6 L0,6 Z"
            fill="white"
            className="dark:fill-gray-800"
          />
        </svg>
      </div>
    </div>
  );
}