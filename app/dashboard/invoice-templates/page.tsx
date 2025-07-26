"use client";

import { Suspense } from "react";
import { InvoiceTemplatesRedesigned } from "../invoices/_components/invoice-templates-redesigned";

export default function InvoiceTemplatesPage() {
  return (
    <section className="flex flex-col items-start justify-start p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Invoice Templates
              </h1>
              <p className="text-muted-foreground">
                Customize your invoice templates with branding, colors, and layout options.
              </p>
            </div>
          </div>
        </div>
        
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <Suspense fallback={
              <div className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-48 mb-4"></div>
                <div className="h-32 bg-gradient-to-r from-purple-200 to-blue-200 rounded"></div>
              </div>
            }>
              <InvoiceTemplatesRedesigned />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}