"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

interface InvoicePreviewWrapperProps {
  children: React.ReactNode;
  title?: string;
  emptyMessage?: string;
  showEmpty?: boolean;
}

export function InvoicePreviewWrapper({ 
  children, 
  title = "Live Preview",
  emptyMessage = "Select a client and template to see preview",
  showEmpty = false
}: InvoicePreviewWrapperProps) {
  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!showEmpty && children ? (
          <div className="border rounded-lg bg-gray-50 overflow-hidden">
            {/* Consistent scaling and sizing for all invoice previews */}
            <div className="p-6">
              <div 
                className="scale-75 origin-top-left" 
                style={{ 
                  width: '133.33%',
                  minHeight: '600px'
                }}
              >
                {children}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}