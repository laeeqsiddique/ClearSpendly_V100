"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Send, 
  Crown, 
  Shield, 
  User, 
  Eye,
  X,
  Loader2
} from "lucide-react";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const roleOptions = [
  {
    value: "viewer",
    label: "Viewer",
    icon: Eye,
    description: "Can view data but cannot make changes",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
  },
  {
    value: "member",
    label: "Member", 
    icon: User,
    description: "Can manage their own records and create new ones",
    color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
  },
  {
    value: "admin",
    label: "Admin",
    icon: Shield,
    description: "Can manage team members and access all data",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
  }
];

export function InviteDialog({ open, onOpenChange, onSuccess }: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError && validateEmail(value)) {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setEmailError("Email is required");
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/team/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });

      if (response.ok) {
        // Reset form
        setEmail("");
        setRole("member");
        setEmailError("");
        onOpenChange(false);
        
        // Call success callback to refresh team list
        onSuccess?.();
        
        // TODO: Show success message
        console.log("Invitation sent successfully");
      } else {
        const error = await response.json();
        setEmailError(error.error || "Failed to send invitation");
      }
      
    } catch (error) {
      console.error("Error sending invitation:", error);
      setEmailError("Failed to send invitation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRole = roleOptions.find(r => r.value === role);
  const SelectedRoleIcon = selectedRole?.icon || User;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <span>Invite Team Member</span>
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your Flowvya team. They'll receive an email with instructions to get started.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 border-purple-200"
              disabled={isLoading}
            />
            {emailError && (
              <p className="text-sm text-red-600 dark:text-red-400">{emailError}</p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label>Role & Permissions</Label>
            <Select value={role} onValueChange={setRole} disabled={isLoading}>
              <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 border-purple-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((roleOption) => {
                  const RoleIcon = roleOption.icon;
                  return (
                    <SelectItem key={roleOption.value} value={roleOption.value}>
                      <div className="flex items-center space-x-3">
                        <RoleIcon className="h-4 w-4 text-gray-500" />
                        <div className="flex flex-col">
                          <span className="font-medium">{roleOption.label}</span>
                          <span className="text-xs text-gray-500">{roleOption.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Selected Role Preview */}
            {selectedRole && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-800"
              >
                <div className="flex items-start space-x-3">
                  <Badge className={`${selectedRole.color} border-0`}>
                    <SelectedRoleIcon className="h-3 w-3 mr-1" />
                    {selectedRole.label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {selectedRole.description}
                </p>
              </motion.div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !email}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Invite...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Info Footer */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-3 text-xs text-gray-500 dark:text-gray-400">
            <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p>The invitation will be sent via email and will expire in 7 days.</p>
              <p className="mt-1">They can accept the invitation and create their account to join your team.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}