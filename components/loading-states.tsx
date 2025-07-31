"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wifi, WifiOff, AlertCircle } from "lucide-react";
import { ReactNode } from "react";

// Enhanced loading spinner with customizable sizes and colors
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'muted';
  label?: string;
}

export function LoadingSpinner({ size = 'md', color = 'primary', label }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    muted: 'text-muted-foreground'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`} />
      {label && (
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  );
}

// Skeleton loading for cards and forms
export function CardSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
      </CardContent>
    </Card>
  );
}

// Form loading skeleton
export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </div>
  );
}

// Enhanced loading overlay with customizable content
interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
  loadingContent?: ReactNode;
  blur?: boolean;
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  loadingContent,
  blur = true 
}: LoadingOverlayProps) {
  return (
    <div className="relative">
      <div className={isLoading && blur ? 'blur-sm pointer-events-none' : ''}>
        {children}
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10">
          {loadingContent || <LoadingSpinner size="lg" label="Loading..." />}
        </div>
      )}
    </div>
  );
}

// Connection status indicator
interface ConnectionStatusProps {
  isOnline?: boolean;
  onRetry?: () => void;
}

export function ConnectionStatus({ isOnline = true, onRetry }: ConnectionStatusProps) {
  if (isOnline) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <Wifi className="h-4 w-4" />
        <span>Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <WifiOff className="h-4 w-4 text-yellow-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          Connection Lost
        </p>
        <p className="text-xs text-yellow-600 dark:text-yellow-300">
          Some features may not work properly
        </p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

// Progress indicator for multi-step processes
interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
}

export function ProgressIndicator({ steps, currentStep, completedSteps = [] }: ProgressIndicatorProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Progress</span>
        <span className="text-sm text-muted-foreground">
          {Math.max(currentStep, completedSteps.length)} of {steps.length}
        </span>
      </div>
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep && !isCompleted;

          return (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                isCompleted 
                  ? 'bg-green-500 text-white' 
                  : isCurrent 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className={`text-sm ${
                isCompleted || isCurrent 
                  ? 'text-foreground font-medium' 
                  : 'text-muted-foreground'
              }`}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Detailed loading state for authentication flows
export function AuthLoadingState({ 
  step, 
  isError = false, 
  errorMessage,
  onRetry 
}: {
  step: 'connecting' | 'authenticating' | 'redirecting' | 'error';
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  const getStepMessage = () => {
    switch (step) {
      case 'connecting':
        return 'Connecting to authentication service...';
      case 'authenticating':
        return 'Verifying your credentials...';
      case 'redirecting':
        return 'Setting up your account...';
      case 'error':
        return errorMessage || 'Something went wrong';
      default:
        return 'Loading...';
    }
  };

  if (isError || step === 'error') {
    return (
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h3 className="font-medium text-destructive mb-2">Authentication Error</h3>
            <p className="text-sm text-muted-foreground">
              {errorMessage || 'Unable to complete authentication'}
            </p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full">
      <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <p className="text-sm font-medium mb-1">{getStepMessage()}</p>
          <p className="text-xs text-muted-foreground">
            This may take a few moments...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Page-level loading component
export function PageLoading({ title = 'Loading', description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col justify-center items-center min-h-[400px] p-4">
      <div className="text-center space-y-4">
        <LoadingSpinner size="xl" />
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading: boolean;
  loadingText?: string;
  children: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function LoadingButton({ 
  isLoading, 
  loadingText, 
  children, 
  disabled,
  ...props 
}: LoadingButtonProps) {
  return (
    <Button 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? (loadingText || 'Loading...') : children}
    </Button>
  );
}