"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Plus, 
  Mail, 
  Crown, 
  Shield, 
  User, 
  Eye,
  MoreHorizontal,
  UserMinus,
  Settings,
  Clock,
  Send
} from "lucide-react";
import { InviteDialog } from "./invite-dialog";
import { ChangeRoleDialog } from "./change-role-dialog";
import { RemoveMemberDialog } from "./remove-member-dialog";

interface TeamMember {
  id: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  role: string;
  invitation_status: string;
  invited_at: string | null;
  accepted_at: string | null;
  invited_by: string | null;
}

const roleConfig = {
  owner: {
    label: "Owner",
    icon: Crown,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    description: "Full access to everything"
  },
  admin: {
    label: "Admin", 
    icon: Shield,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    description: "Manage team and most operations"
  },
  member: {
    label: "Member",
    icon: User,
    color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", 
    description: "Can manage own records"
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
    description: "Read-only access"
  }
};

export default function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Fetch team members from API
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/team/members');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch team members:', errorData);
        setMembers([]);
        
        // Don't redirect on auth errors - the server-side check already handles this
        if (response.status === 401 || response.status === 403) {
          console.warn('Authentication/authorization issue for team members');
          // Just show empty state, don't redirect
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    // Use a more consistent format that doesn't depend on locale
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const handleChangeRole = (member: TeamMember) => {
    setSelectedMember(member);
    setChangeRoleDialogOpen(true);
  };

  const handleRemoveMember = (member: TeamMember) => {
    setSelectedMember(member);
    setRemoveMemberDialogOpen(true);
  };

  const handleResendInvite = async (member: TeamMember) => {
    try {
      const response = await fetch(`/api/team/members/${member.id}/resend-invite`, {
        method: 'POST',
      });

      if (response.ok) {
        // Show success message
        console.log("Invitation resent successfully");
        // Refresh the members list
        await fetchMembers();
      } else {
        const error = await response.json();
        console.error("Error resending invite:", error.error);
        // Show error message
      }
    } catch (error) {
      console.error("Error resending invite:", error);
      // Show error message
    }
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient matching main dashboard */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-transparent to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-300 opacity-20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-300 opacity-20 blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative p-6 min-h-screen">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-col items-start justify-center gap-2">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
                >
                  Team Management
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-lg text-muted-foreground"
                >
                  Manage your team members, roles, and permissions
                </motion.p>
              </div>
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex gap-2"
              >
                <Button 
                  onClick={() => setInviteDialogOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </motion.div>
            </div>

            {/* Team Stats Cards */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid gap-4 md:grid-cols-4"
            >
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{members.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Members</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {members.filter(m => m.invitation_status === 'accepted').length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Invites</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {members.filter(m => m.invitation_status === 'pending').length}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <Crown className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Admins</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {members.filter(m => m.role === 'admin' || m.role === 'owner').length}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Team Members List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Team Members</h2>
                  
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center space-x-4 animate-pulse">
                          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                          </div>
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {members.map((member, index) => {
                        const roleInfo = roleConfig[member.role as keyof typeof roleConfig];
                        const RoleIcon = roleInfo.icon;
                        
                        return (
                          <motion.div
                            key={member.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
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
                                <div className="flex items-center space-x-2">
                                  <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {member.user.full_name || member.user.email}
                                  </h3>
                                  {member.invitation_status === 'pending' && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                                  <span>{member.user.email}</span>
                                  <span>•</span>
                                  <span>Joined {formatDate(member.accepted_at)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <Badge className={`${roleInfo.color} border-0`}>
                                <RoleIcon className="h-3 w-3 mr-1" />
                                {roleInfo.label}
                              </Badge>
                              
                              {member.role !== 'owner' && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleChangeRole(member)}>
                                      <Settings className="h-4 w-4 mr-2" />
                                      Change Role
                                    </DropdownMenuItem>
                                    {member.invitation_status === 'pending' && (
                                      <DropdownMenuItem onClick={() => handleResendInvite(member)}>
                                        <Send className="h-4 w-4 mr-2" />
                                        Resend Invite
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-red-600 focus:text-red-600"
                                      onClick={() => handleRemoveMember(member)}
                                    >
                                      <UserMinus className="h-4 w-4 mr-2" />
                                      {member.invitation_status === 'pending' ? 'Cancel Invite' : 'Remove Member'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <InviteDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
        onSuccess={fetchMembers}
      />
      
      <ChangeRoleDialog
        open={changeRoleDialogOpen}
        onOpenChange={setChangeRoleDialogOpen}
        member={selectedMember}
        onSuccess={fetchMembers}
      />
      
      <RemoveMemberDialog
        open={removeMemberDialogOpen}
        onOpenChange={setRemoveMemberDialogOpen}
        member={selectedMember}
        onSuccess={fetchMembers}
      />
    </section>
  );
}