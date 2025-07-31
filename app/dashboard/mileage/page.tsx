export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { MileageTracker } from "./_components/mileage-tracker";

export default function MileagePage() {
  return (
    <section className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Mileage Tracking
              </h1>
              <p className="text-muted-foreground">
                Track business miles for IRS-compliant tax deductions and Schedule C filing.
              </p>
            </div>
          </div>
        </div>
        
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <Suspense fallback={
              <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-32"></div>
                  </div>
                ))}
              </div>
            }>
              <MileageTracker />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}