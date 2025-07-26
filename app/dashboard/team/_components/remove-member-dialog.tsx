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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Crown, 
  Shield, 
  User, 
  Eye,
  UserMinus,
  Loader2,
  AlertTriangle,
  Trash2
} from "lucide-react";

interface RemoveMemberDialogProps {
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
    invitation_status: string;
  } | null;
  onSuccess?: () => void;
}

const roleConfig = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
  },
  admin: {
    label: "Admin", 
    icon: Shield,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
  },
  member: {
    label: "Member",
    icon: User,
    color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
  }
};

export function RemoveMemberDialog({ open, onOpenChange, member, onSuccess }: RemoveMemberDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const handleConfirmRemoval = async () => {
    if (!member) return;

    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onOpenChange(false);
        
        // Call success callback to refresh team list
        onSuccess?.();
        
        // TODO: Show success message
        console.log("Member removed successfully");
      } else {
        const error = await response.json();
        console.error("Error removing member:", error.error);
        // TODO: Show error message
      }
      
    } catch (error) {
      console.error("Error removing member:", error);
      // TODO: Show error message
    } finally {
      setIsLoading(false);
    }
  };

  if (!member) return null;

  const roleInfo = roleConfig[member.role as keyof typeof roleConfig];
  const isPending = member.invitation_status === 'pending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20">
              <UserMinus className="h-5 w-5 text-red-600" />
            </div>
            <span>{isPending ? 'Cancel Invitation' : 'Remove Team Member'}</span>
          </DialogTitle>
          <DialogDescription>
            {isPending 
              ? 'This will cancel the pending invitation. The invited user will not be able to join your team.'
              : 'This action cannot be undone. The member will lose access to your team and all associated data.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Warning Alert */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">
                {isPending ? 'Cancel Invitation' : 'Permanent Action'}
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {isPending 
                  ? 'The invitation will be cancelled and cannot be restored. You will need to send a new invitation if needed.'
                  : 'This member will immediately lose access to your team. All their data and permissions will be revoked.'
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Member Info */}
        <div className="flex items-center space-x-4 p-4 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-900/10 dark:border-gray-800">
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
            <div className="flex items-center space-x-2 mt-1">
              {roleInfo && (
                <Badge className={`${roleInfo.color} border-0`}>
                  <roleInfo.icon className="h-3 w-3 mr-1" />
                  {roleInfo.label}
                </Badge>
              )}
              {isPending && (
                <Badge variant="outline" className="text-xs">
                  Pending Invitation
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Actions */}
        <div className="space-y-4">
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
              type="button"
              variant="destructive"
              onClick={handleConfirmRemoval}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isPending ? 'Cancelling...' : 'Removing...'}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isPending ? 'Cancel Invitation' : 'Remove Member'}
                </>
              )}
            </Button>
          </div>

          {/* Additional consequences for active members */}
          {!isPending && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p className="font-medium mb-1">What happens when you remove this member:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>They will lose access to your team immediately</li>
                  <li>All permissions and roles will be revoked</li>
                  <li>They won't be able to view or edit team data</li>
                  <li>You can re-invite them later if needed</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}