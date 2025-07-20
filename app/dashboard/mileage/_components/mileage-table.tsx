"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, DollarSign, MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
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

interface MileageTableProps {
  onEdit?: (log: MileageLog) => void;
  refreshTrigger?: number;
  startDate?: string;
  endDate?: string;
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

export function MileageTable({ onEdit, refreshTrigger, startDate, endDate }: MileageTableProps = {}) {
  const [mileageLogs, setMileageLogs] = useState<MileageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<{open: boolean, logId: string | null, logName: string}>({
    open: false,
    logId: null,
    logName: ""
  });
  const [deleting, setDeleting] = useState(false);
  const [irsRate, setIrsRate] = useState(0.655);
  
  const itemsPerPage = 10;
  const supabase = createClient();

  useEffect(() => {
    fetchMileageLogs();
    getCurrentIRSRate().then(setIrsRate);
  }, [refreshTrigger, currentPage, searchTerm, purposeFilter, startDate, endDate]);

  const fetchMileageLogs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      // Build query
      let query = supabase
        .from('mileage_log')
        .select('*', { count: 'exact' })
        .eq('tenant_id', membership.tenant_id);

      // Apply filters
      if (searchTerm) {
        query = query.or(`start_location.ilike.%${searchTerm}%,end_location.ilike.%${searchTerm}%,purpose.ilike.%${searchTerm}%`);
      }

      if (purposeFilter !== "all") {
        query = query.eq('business_purpose_category', purposeFilter);
      }

      // Apply date filtering
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      // Apply pagination
      const { data, error, count } = await query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;
      
      setMileageLogs(data || []);
      setTotalCount(count || 0);
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

      toast.success("Mileage log deleted");
      setDeleteConfirm({ open: false, logId: null, logName: "" });
      fetchMileageLogs(); // Refresh the table
    } catch (error) {
      console.error('Error deleting mileage log:', error);
      toast.error("Failed to delete mileage log");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const resetFilters = () => {
    setSearchTerm("");
    setPurposeFilter("all");
    setCurrentPage(1);
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Business Trips
          </CardTitle>
          <Badge variant="secondary">
            {totalCount} total trips
          </Badge>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search trips, locations, or purpose..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          
          <Select value={purposeFilter} onValueChange={(value) => {
            setPurposeFilter(value);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by purpose" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Purposes</SelectItem>
              {Object.entries(purposeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    {purposeIcons[value]} {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {(searchTerm || purposeFilter !== "all") && (
            <Button variant="outline" onClick={resetFilters} className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : mileageLogs.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No trips found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || purposeFilter !== "all" 
                ? "Try adjusting your filters or search term"
                : "Start logging your business trips to see them here"
              }
            </p>
            {(searchTerm || purposeFilter !== "all") && (
              <Button variant="outline" onClick={resetFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Trip</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Miles</TableHead>
                    <TableHead>Deduction</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mileageLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {format(new Date(log.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{log.start_location}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <span>→</span> {log.end_location}
                          </div>
                          <div className="text-sm text-gray-600">{log.purpose}</div>
                          {log.notes && (
                            <div className="text-xs text-gray-500 italic">{log.notes}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                          <span>{purposeIcons[log.business_purpose_category] || "💼"}</span>
                          <span className="text-xs">{purposeLabels[log.business_purpose_category] || "Other"}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.miles} mi
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        ${log.deduction_amount?.toFixed(2) || (log.miles * irsRate).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} trips
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        
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
      </CardContent>
    </Card>
  );
}