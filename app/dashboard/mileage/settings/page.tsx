"use client";

import { IRSRateManagement } from "../_components/irs-rate-management";

export default function MileageSettingsPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mileage Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure mileage tracking settings and IRS rates
        </p>
      </div>
      
      <IRSRateManagement />
    </div>
  );
}