"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getCurrentIRSRate } from "../_utils/irs-rate";
import { 
  DollarSign, 
  Route, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Calendar,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface ExportViewProps {
  refreshTrigger?: number;
  startDate?: string;
  endDate?: string;
}

export function ExportView({ refreshTrigger, startDate, endDate }: ExportViewProps) {
  const [exportFormat, setExportFormat] = useState<string>("csv");
  const [exportRange, setExportRange] = useState<string>("current-year");
  const [customStartDate, setCustomStartDate] = useState(startDate || "");
  const [customEndDate, setCustomEndDate] = useState(endDate || "");
  const [isExporting, setIsExporting] = useState(false);
  const supabase = createClient();

  const getDateRange = () => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (exportRange) {
      case 'current-year':
        return {
          start: formatDate(new Date(today.getFullYear(), 0, 1)),
          end: formatDate(new Date(today.getFullYear(), 11, 31))
        };
      case 'last-year':
        return {
          start: formatDate(new Date(today.getFullYear() - 1, 0, 1)),
          end: formatDate(new Date(today.getFullYear() - 1, 11, 31))
        };
      case 'this-month':
        return {
          start: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
          end: formatDate(today)
        };
      case 'last-month':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: formatDate(lastMonth),
          end: formatDate(lastMonthEnd)
        };
      case 'selected-range':
        return {
          start: startDate || formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
          end: endDate || formatDate(today)
        };
      case 'custom':
        return {
          start: customStartDate || formatDate(new Date(today.getFullYear(), 0, 1)),
          end: customEndDate || formatDate(today)
        };
      default:
        return {
          start: formatDate(new Date(today.getFullYear(), 0, 1)),
          end: formatDate(today)
        };
    }
  };

  const fetchMileageData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: membership } = await supabase
      .from('membership')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) throw new Error("No tenant membership found");

    const dateRange = getDateRange();
    
    const { data: mileageData, error } = await supabase
      .from('mileage_log')
      .select(`
        date,
        start_location,
        end_location,
        miles,
        purpose,
        business_purpose_category,
        notes,
        deduction_amount,
        created_at
      `)
      .eq('tenant_id', membership.tenant_id)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)
      .order('date', { ascending: true });

    if (error) throw error;
    return mileageData || [];
  };

  const exportToCSV = async () => {
    try {
      setIsExporting(true);
      const data = await fetchMileageData();
      const irsRate = await getCurrentIRSRate();

      if (data.length === 0) {
        toast.error("No mileage data found for the selected date range");
        return;
      }

      // CSV headers
      const headers = [
        'Date',
        'Start Location',
        'End Location',
        'Miles',
        'Business Purpose',
        'Category',
        'Notes',
        'IRS Rate',
        'Deduction Amount'
      ].join(',');

      // CSV rows
      const rows = data.map(row => [
        row.date,
        `"${row.start_location || ''}"`,
        `"${row.end_location || ''}"`,
        row.miles || 0,
        `"${row.purpose || ''}"`,
        `"${row.business_purpose_category || ''}"`,
        `"${row.notes || ''}"`,
        irsRate,
        row.deduction_amount || (row.miles * irsRate)
      ].join(','));

      const csvContent = [headers, ...rows].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `mileage-export-${getDateRange().start}-to-${getDateRange().end}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Successfully exported ${data.length} mileage records to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const data = await fetchMileageData();
      const irsRate = await getCurrentIRSRate();

      if (data.length === 0) {
        toast.error("No mileage data found for the selected date range");
        return;
      }

      // Create Excel-compatible CSV with enhanced formatting
      const headers = [
        'Date',
        'Start Location',
        'End Location',
        'Miles Driven',
        'Business Purpose',
        'Purpose Category',
        'Additional Notes',
        'IRS Mileage Rate',
        'Tax Deduction Amount'
      ].join('\t');

      const rows = data.map(row => [
        row.date,
        row.start_location || '',
        row.end_location || '',
        row.miles || 0,
        row.purpose || '',
        row.business_purpose_category || '',
        row.notes || '',
        `$${irsRate.toFixed(3)}`,
        `$${(row.deduction_amount || (row.miles * irsRate)).toFixed(2)}`
      ].join('\t'));

      // Add summary row
      const totalMiles = data.reduce((sum, row) => sum + (row.miles || 0), 0);
      const totalDeduction = data.reduce((sum, row) => sum + (row.deduction_amount || (row.miles * irsRate)), 0);
      
      const summaryRow = [
        '',
        '',
        'TOTAL:',
        totalMiles.toFixed(1),
        '',
        '',
        '',
        '',
        `$${totalDeduction.toFixed(2)}`
      ].join('\t');

      const tsvContent = [headers, ...rows, '', summaryRow].join('\n');
      
      // Create and download file
      const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `mileage-export-${getDateRange().start}-to-${getDateRange().end}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Successfully exported ${data.length} mileage records to Excel`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setIsExporting(true);
      const data = await fetchMileageData();
      const irsRate = await getCurrentIRSRate();

      if (data.length === 0) {
        toast.error("No mileage data found for the selected date range");
        return;
      }

      // Create HTML content for PDF
      const dateRange = getDateRange();
      const totalMiles = data.reduce((sum, row) => sum + (row.miles || 0), 0);
      const totalDeduction = data.reduce((sum, row) => sum + (row.deduction_amount || (row.miles * irsRate)), 0);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mileage Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .total-row { background-color: #e8f5e8; font-weight: bold; }
            .small { font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Business Mileage Report</h1>
            <h2>IRS-Compliant Mileage Log</h2>
            <p class="small">Report Period: ${dateRange.start} to ${dateRange.end}</p>
            <p class="small">Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total Business Miles:</strong> ${totalMiles.toFixed(1)} miles</p>
            <p><strong>Total Trips:</strong> ${data.length} trips</p>
            <p><strong>IRS Standard Rate:</strong> $${irsRate.toFixed(3)} per mile</p>
            <p><strong>Total Tax Deduction:</strong> $${totalDeduction.toFixed(2)}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Start Location</th>
                <th>End Location</th>
                <th>Miles</th>
                <th>Business Purpose</th>
                <th>Deduction</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  <td>${new Date(row.date).toLocaleDateString()}</td>
                  <td>${row.start_location || ''}</td>
                  <td>${row.end_location || ''}</td>
                  <td>${(row.miles || 0).toFixed(1)}</td>
                  <td>${row.purpose || ''}</td>
                  <td>$${(row.deduction_amount || (row.miles * irsRate)).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>TOTAL</strong></td>
                <td><strong>${totalMiles.toFixed(1)}</strong></td>
                <td></td>
                <td><strong>$${totalDeduction.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="small">
            <p><strong>Note:</strong> This report meets IRS requirements for business mileage documentation.</p>
            <p>Keep this record with your tax documents for Schedule C filing.</p>
          </div>
        </body>
        </html>
      `;

      // Open print dialog (user can save as PDF)
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      toast.success(`PDF report generated for ${data.length} mileage records`);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error("Failed to generate PDF report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    switch (exportFormat) {
      case 'csv':
        await exportToCSV();
        break;
      case 'excel':
        await exportToExcel();
        break;
      case 'pdf':
        await exportToPDF();
        break;
      default:
        toast.error("Please select an export format");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tax Export & Reports</h3>
        <Badge variant="outline" className="text-xs">
          IRS Compliant
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-format">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      CSV (Comma Separated)
                    </div>
                  </SelectItem>
                  <SelectItem value="excel">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel Compatible
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      PDF Report
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-range">Date Range</Label>
              <Select value={exportRange} onValueChange={setExportRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-year">Current Year ({new Date().getFullYear()})</SelectItem>
                  <SelectItem value="last-year">Last Year ({new Date().getFullYear() - 1})</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="selected-range">Selected Date Range</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-start">Start Date</Label>
                  <Input
                    id="custom-start"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-end">End Date</Label>
                  <Input
                    id="custom-end"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button 
              onClick={handleExport} 
              disabled={isExporting} 
              className="w-full"
              size="lg"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Mileage Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* IRS Requirements & Information */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                IRS Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p className="font-medium text-green-800">✓ All Required Fields Included:</p>
                <ul className="text-green-700 space-y-1 ml-4">
                  <li>• Date of each trip</li>
                  <li>• Business purpose</li>
                  <li>• Starting location</li>
                  <li>• Destination</li>
                  <li>• Miles driven</li>
                  <li>• Deduction amount</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Tax Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-blue-700 space-y-2">
                <ul className="space-y-1">
                  <li>• Keep exported records with tax documents</li>
                  <li>• Use standard mileage method for simplicity</li>
                  <li>• Document business purpose for each trip</li>
                  <li>• Export data annually for Schedule C filing</li>
                  <li>• Consider quarterly exports for better organization</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}