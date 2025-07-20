"use client";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ManageSubscription() {
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      // Call our API to get the customer portal URL
      const response = await fetch('/api/subscriptions/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get portal URL');
      }

      const data = await response.json();
      
      if (data.url) {
        window.open(data.url, '_blank');
        toast.success("Opening customer portal...");
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open customer portal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleManageSubscription}
      disabled={loading}
      className="w-full"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <ExternalLink className="h-4 w-4 mr-2" />
      )}
      Manage Subscription
    </Button>
  );
}
