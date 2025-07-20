"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, DollarSign, MoreHorizontal, Edit, Trash2, Route } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ConfirmationDialog } from "./confirmation-dialog";
import { getCurrentIRSRate } from "../_utils/irs-rate";

interface MileageLog {
  id: string;
  date: string;
  start_location: string;
  end_location: string;
  miles: number;
  purpose: string;
  business_purpose_category: string;
  deduction_amount: number;
  notes?: string;
  created_at: string;
}

interface MileageListProps {
  onEdit?: (log: MileageLog) => void;
  refreshTrigger?: number;
}

const purposeIcons: Record<string, string> = {
  client_visit: "👥",
  business_meeting: "🤝",
  supplies: "📦",
  bank: "🏦",
  office: "🏢",
  networking: "🌐",
  delivery: "🚚",
  other: "💼",
};

const purposeLabels: Record<string, string> = {
  client_visit: "Client Visit",
  business_meeting: "Business Meeting",
  supplies: "Business Supplies",
  bank: "Bank Visit",
  office: "Office/Coworking",
  networking: "Networking Event",
  delivery: "Delivery/Service",
  other: "Other Business",
};

export function MileageList({ onEdit, refreshTrigger }: MileageListProps = {}) {
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, logId: string | null, logName: string}>({
    open: false,
    logId: null,
    logName: ""
  });
  const [deleting, setDeleting] = useState(false);
  const [irsRate, setIrsRate] = useState(0.655);
  const supabase = createClient();

  useEffect(() => {
    fetchMileageLogs();
    getCurrentIRSRate().then(setIrsRate);
  }, [refreshTrigger]);

  const fetchMileageLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const { data, error } = await supabase
        .from('mileage_log')
        .select('*')
        .eq('tenant_id', membership.tenant_id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMileageLogs(data || []);
    } catch (error) {
      console.error('Error fetching mileage logs:', error);
      toast.error("Failed to load mileage logs");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (log: MileageLog) => {
    setDeleteConfirm({
      open: true,
      logId: log.id,
      logName: `${log.start_location} → ${log.end_location}`
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.logId) return;
    
    setDeleting(true);
    
    try {
      const { error } = await supabase
        .from('mileage_log')
        .delete()
        .eq('id', deleteConfirm.logId);

      if (error) throw error;

      setMileageLogs(prev => prev.filter(log => log.id !== deleteConfirm.logId));
      toast.success("Mileage log deleted");
      
      setDeleteConfirm({ open: false, logId: null, logName: "" });
    } catch (error) {
      console.error('Error deleting mileage log:', error);
      toast.error("Failed to delete mileage log");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-100 rounded w-32"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (mileageLogs.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg border-dashed border-2 border-purple-200">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Route className="w-12 h-12 text-purple-400 mb-4" />
          <h3 className="font-semibold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">No trips logged yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start tracking your business miles to maximize tax deductions
          </p>
          <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">Log Your First Trip</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {mileageLogs.map((log) => (
        <Card key={log.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    {purposeIcons[log.business_purpose_category] || "💼"}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {purposeLabels[log.business_purpose_category] || "Other"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(log.date), "MMM d, yyyy")}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{log.start_location}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{log.end_location}</span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {log.purpose}
                  </p>

                  {log.notes && (
                    <p className="text-xs text-muted-foreground italic">
                      {log.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-semibold">{log.miles} miles</div>
                  <div className="text-sm text-green-600 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {log.deduction_amount?.toFixed(2) || (log.miles * irsRate).toFixed(2)}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(log)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => handleDelete(log)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      <ConfirmationDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, logId: null, logName: "" })}
        onConfirm={confirmDelete}
        title="Delete Mileage Log"
        description={`Are you sure you want to delete the trip "${deleteConfirm.logName}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        loading={deleting}
      />
    </div>
  );
}