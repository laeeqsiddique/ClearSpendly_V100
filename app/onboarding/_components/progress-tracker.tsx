"use client";

import { Check, Circle, Dot } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  required?: boolean;
  completed?: boolean;
  skipped?: boolean;
}

interface ProgressTrackerProps {
  steps: OnboardingStep[];
  currentStepId: string;
  className?: string;
}

export function ProgressTracker({ steps, currentStepId, className }: ProgressTrackerProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStepId);
  
  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => {
        const isActive = step.id === currentStepId;
        const isPast = index < currentIndex;
        const isFuture = index > currentIndex;
        const isCompleted = step.completed || isPast;
        const isSkipped = step.skipped;
        
        return (
          <div key={step.id} className="flex items-start space-x-4">
            {/* Step indicator */}
            <div className="flex-shrink-0 mt-1">
              {isCompleted && !isSkipped ? (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              ) : isSkipped ? (
                <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Dot className="w-4 h-4 text-white" />
                </div>
              ) : isActive ? (
                <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-purple-300 flex items-center justify-center">
                  <Circle className="w-3 h-3 text-white fill-current" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />
              )}
            </div>
            
            {/* Step content */}
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-sm font-medium",
                isActive ? "text-purple-600" : isCompleted ? "text-green-600" : "text-gray-500"
              )}>
                {step.title}
                {step.required && !isCompleted && !isSkipped && (
                  <span className="text-red-500 ml-1">*</span>
                )}
                {isSkipped && (
                  <span className="text-yellow-600 ml-2 text-xs">(Skipped)</span>
                )}
              </h3>
              <p className={cn(
                "text-xs mt-1",
                isActive ? "text-purple-500" : isCompleted ? "text-green-500" : "text-gray-400"
              )}>
                {step.description}
              </p>
            </div>
            
            {/* Connecting line */}
            {index < steps.length - 1 && (
              <div className="absolute left-[22px] mt-8 w-0.5 h-6 bg-gray-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProgressBar({ steps, currentStepId }: { steps: OnboardingStep[]; currentStepId: string }) {
  const currentIndex = steps.findIndex(step => step.id === currentStepId);
  const progress = ((currentIndex + 1) / steps.length) * 100;
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
      <div 
        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}