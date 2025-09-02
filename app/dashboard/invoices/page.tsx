"use client";

export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { InvoicesDashboard } from "./_components/invoices-dashboard";

export default function InvoicesPage() {
  const router = useRouter();

  const handleNewInvoice = () => {
    router.push('/dashboard/invoices/create');
  };

  return (
    <section className="flex flex-col items-start justify-start p-3 sm:p-6 w-full bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
      <div className="w-full">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-3 sm:gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col items-start justify-center gap-1 sm:gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Invoice Management
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Create, send, and track professional invoices for your business.
              </p>
            </div>
            <Button size="sm" onClick={handleNewInvoice} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto min-h-[44px] touch-manipulation">
              <Plus className="h-4 w-4 mr-2" />
              <span className="text-sm sm:text-base">Create Invoice</span>
            </Button>
          </div>
        </div>
        
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-3 sm:gap-4 py-3 sm:py-4 md:gap-6 md:py-6">
            <Suspense fallback={
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-lg p-4 sm:p-6 animate-pulse min-h-[100px] sm:min-h-[120px]">
                    <div className="h-3 sm:h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-20 sm:w-24 mb-2"></div>
                    <div className="h-6 sm:h-8 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-24 sm:w-32"></div>
                  </div>
                ))}
              </div>
            }>
              <InvoicesDashboard />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}