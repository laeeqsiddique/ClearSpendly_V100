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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Crown, 
  Shield, 
  User, 
  Eye,
  Settings,
  Loader2,
  AlertTriangle
} from "lucide-react";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    user: {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
    };
    role: string;
  } | null;
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

export function ChangeRoleDialog({ open, onOpenChange, member, onSuccess }: ChangeRoleDialogProps) {
  const [newRole, setNewRole] = useState(member?.role || "member");
  const [isLoading, setIsLoading] = useState(false);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!member || newRole === member.role) return;

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        onOpenChange(false);
        
        // Call success callback to refresh team list
        onSuccess?.();
        
        // TODO: Show success message
        console.log("Role changed successfully");
      } else {
        const error = await response.json();
        console.error("Error changing role:", error.error);
        // TODO: Show error message
      }
      
    } catch (error) {
      console.error("Error changing role:", error);
      // TODO: Show error message
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRole = roleOptions.find(r => r.value === newRole);
  const currentRole = roleOptions.find(r => r.value === member?.role);
  const SelectedRoleIcon = selectedRole?.icon || User;

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20">
              <Settings className="h-5 w-5 text-purple-600" />
            </div>
            <span>Change Role</span>
          </DialogTitle>
          <DialogDescription>
            Update the role and permissions for this team member.
          </DialogDescription>
        </DialogHeader>

        {/* Member Info */}
        <div className="flex items-center space-x-4 p-4 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-800">
          <Avatar className="h-12 w-12">
            {member.user.avatar_url ? (
              <AvatarImage src={member.user.avatar_url} alt={member.user.full_name || member.user.email} />
            ) : (
              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold">
                {getInitials(member.user.full_name, member.user.email)}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {member.user.full_name || member.user.email}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {member.user.email}
            </p>
            {currentRole && (
              <Badge className={`${currentRole.color} border-0 mt-1`}>
                <currentRole.icon className="h-3 w-3 mr-1" />
                Current: {currentRole.label}
              </Badge>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">New Role</label>
            <Select value={newRole} onValueChange={setNewRole} disabled={isLoading}>
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
            {selectedRole && newRole !== member.role && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-800"
              >
                <div className="flex items-start space-x-3">
                  <Badge className={`${selectedRole.color} border-0`}>
                    <SelectedRoleIcon className="h-3 w-3 mr-1" />
                    New Role: {selectedRole.label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {selectedRole.description}
                </p>
              </motion.div>
            )}
          </div>

          {/* Warning for role downgrade */}
          {member.role === 'admin' && (newRole === 'member' || newRole === 'viewer') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800"
            >
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Role Downgrade Warning</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    This member will lose admin privileges and may no longer be able to manage team members or access all data.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

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
              disabled={isLoading || newRole === member.role}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating Role...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Update Role
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}