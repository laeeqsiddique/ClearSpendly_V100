"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Sparkles } from "lucide-react";
import EnhancedOnboarding from "./_components/enhanced-onboarding";

export default function Onboarding() {
  const [useEnhancedFlow, setUseEnhancedFlow] = useState(true);
  
  // Simple toggle for development to switch between flows
  if (process.env.NODE_ENV === 'development' && !useEnhancedFlow) {
    return <LegacyOnboarding onSwitchToEnhanced={() => setUseEnhancedFlow(true)} />;
  }
  
  return <EnhancedOnboarding />;
}

// Keep the legacy onboarding as fallback for development
function LegacyOnboarding({ onSwitchToEnhanced }: { onSwitchToEnhanced: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              Legacy Flow
            </Badge>
            <div className="flex items-center space-x-2">
              <Label htmlFor="enhanced-mode" className="text-sm">Enhanced Flow</Label>
              <Switch
                id="enhanced-mode"
                checked={false}
                onCheckedChange={onSwitchToEnhanced}
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Settings className="w-6 h-6 text-purple-600" />
            <CardTitle className="text-2xl font-bold">Legacy Onboarding</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-gray-600">
            This is the original onboarding flow. Switch to the enhanced flow to see the new features.
          </p>
          <Button
            onClick={onSwitchToEnhanced}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Try Enhanced Onboarding
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}