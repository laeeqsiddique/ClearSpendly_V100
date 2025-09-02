"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, ChevronDown, ChevronUp } from "lucide-react";

interface InvoicePreviewWrapperProps {
  children: React.ReactNode;
  title?: string;
  emptyMessage?: string;
  showEmpty?: boolean;
  // Optional preview summary data for mobile collapsed state
  previewSummary?: {
    client?: string;
    total?: string;
    status?: string;
  };
}

export function InvoicePreviewWrapper({ 
  children, 
  title = "Live Preview",
  emptyMessage = "Select a client and template to see preview",
  showEmpty = false,
  previewSummary
}: InvoicePreviewWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg xl:sticky xl:top-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            {title}
          </div>
          <div className="block xl:hidden">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-purple-600 hover:bg-purple-50 h-6 px-2 text-xs font-medium"
            >
              {isCollapsed ? 'Show' : 'Hide'} Preview
              {isCollapsed ? <ChevronDown className="w-3 h-3 ml-1" /> : <ChevronUp className="w-3 h-3 ml-1" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className={`transition-all duration-300 ${isCollapsed ? 'xl:block' : 'block'}`}>
        {/* Mobile: Collapsed preview summary */}
        {isCollapsed && !showEmpty && previewSummary && (
          <div className="xl:hidden mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <div className="flex flex-col gap-1">
                {previewSummary.client && (
                  <span className="text-gray-600">
                    <span className="font-medium text-gray-800">Client:</span> {previewSummary.client}
                  </span>
                )}
                {previewSummary.status && (
                  <span className="text-gray-600">
                    <span className="font-medium text-gray-800">Status:</span> {previewSummary.status}
                  </span>
                )}
              </div>
              {previewSummary.total && (
                <div className="text-lg font-bold text-purple-600">
                  {previewSummary.total}
                </div>
              )}
            </div>
          </div>
        )}
        
        {!showEmpty && children ? (
          <div className="border rounded-lg bg-gray-50 overflow-hidden">
            {/* Mobile: Collapsible, optimized height */}
            <div className={`xl:hidden transition-all duration-300 ${
              isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[600px] opacity-100'
            }`}>
              <div className="p-1 overflow-auto" style={{ maxHeight: '580px' }}>
                <div className="bg-white rounded border shadow-sm">
                  <div 
                    className="scale-75 origin-top-left" 
                    style={{ 
                      width: '133.33%',
                      minHeight: '500px'
                    }}
                  >
                    {children}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Desktop: Always visible, optimized preview */}
            <div className="hidden xl:block">
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
          </div>
        ) : (
          <div className={`text-center py-12 text-muted-foreground transition-all duration-300 ${
            isCollapsed && showEmpty ? 'xl:block hidden' : 'block'
          }`}>
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm px-4">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}