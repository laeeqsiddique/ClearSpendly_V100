"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Receipt, 
  Calendar, 
  DollarSign, 
  Store, 
  CreditCard,
  Tag,
  AlertCircle,
  Save,
  ArrowLeft,
  FileText,
  Clock,
  Car,
  Coffee,
  Building,
  Package
} from "lucide-react";
import Link from "next/link";

// IRS Schedule C categories
const EXPENSE_CATEGORIES = [
  { value: "advertising", label: "Advertising" },
  { value: "car_truck", label: "Car and truck expenses" },
  { value: "commissions", label: "Commissions and fees" },
  { value: "depletion", label: "Depletion" },
  { value: "depreciation", label: "Depreciation" },
  { value: "employee_benefit", label: "Employee benefit programs" },
  { value: "insurance", label: "Insurance" },
  { value: "interest", label: "Interest" },
  { value: "legal_professional", label: "Legal and professional services" },
  { value: "office", label: "Office expense" },
  { value: "pension", label: "Pension and profit-sharing plans" },
  { value: "rent_lease", label: "Rent or lease" },
  { value: "repairs", label: "Repairs and maintenance" },
  { value: "supplies", label: "Supplies" },
  { value: "taxes_licenses", label: "Taxes and licenses" },
  { value: "travel", label: "Travel" },
  { value: "meals", label: "Meals" },
  { value: "utilities", label: "Utilities" },
  { value: "wages", label: "Wages" },
  { value: "other", label: "Other expenses" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "paypal", label: "PayPal" },
  { value: "other", label: "Other" },
];

const NO_RECEIPT_REASONS = [
  { value: "parking_meter", label: "Parking meter/street parking" },
  { value: "tip", label: "Tip or gratuity" },
  { value: "toll", label: "Toll without receipt" },
  { value: "small_cash", label: "Small cash purchase" },
  { value: "lost_receipt", label: "Receipt lost or damaged" },
  { value: "digital_no_receipt", label: "Digital purchase without receipt" },
  { value: "vendor_no_receipt", label: "Vendor doesn't provide receipts" },
  { value: "other", label: "Other reason" },
];

// Quick templates
const EXPENSE_TEMPLATES = [
  {
    id: "parking",
    name: "Parking",
    icon: Car,
    data: {
      category: "car_truck",
      payment_method: "cash",
      manual_entry_reason: "parking_meter",
      vendor: "Street Parking",
    }
  },
  {
    id: "coffee_meeting",
    name: "Coffee Meeting",
    icon: Coffee,
    data: {
      category: "meals",
      payment_method: "credit_card",
      manual_entry_reason: "small_cash",
      vendor: "Coffee Shop",
    }
  },
  {
    id: "office_supplies",
    name: "Office Supplies",
    icon: Package,
    data: {
      category: "supplies",
      payment_method: "credit_card",
      manual_entry_reason: "small_cash",
      vendor: "Office Supply Store",
    }
  },
  {
    id: "toll",
    name: "Toll",
    icon: Building,
    data: {
      category: "car_truck",
      payment_method: "cash",
      manual_entry_reason: "toll",
      vendor: "Toll Booth",
    }
  },
];

export default function AddExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // Form fields - Fix timezone issue for initial date
  const [date, setDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [businessPurpose, setBusinessPurpose] = useState("");
  const [manualEntryReason, setManualEntryReason] = useState("");
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);

  const applyTemplate = (templateId: string) => {
    const template = EXPENSE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setCategory(template.data.category);
      setPaymentMethod(template.data.payment_method);
      setManualEntryReason(template.data.manual_entry_reason);
      setVendor(template.data.vendor);
      setSelectedTemplate(templateId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!amount || !vendor || !category || !paymentMethod || !businessPurpose || !manualEntryReason) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Warning for large amounts
    if (amountNum > 500) {
      const confirm = window.confirm(
        "This is a large amount for a manual entry. Are you sure you want to continue? Consider uploading supporting documentation."
      );
      if (!confirm) return;
    }

    setLoading(true);

    try {
      // Fix timezone issue: ensure date is treated as local date, not UTC
      const localDate = new Date(date + 'T00:00:00');
      const formattedDate = localDate.toISOString().split('T')[0];

      const response = await fetch("/api/expenses/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receipt_type: "manual",
          receipt_date: formattedDate,
          total_amount: amountNum,
          vendor_name: vendor,
          category,
          payment_method: paymentMethod,
          business_purpose: businessPurpose,
          manual_entry_reason: manualEntryReason,
          notes,
          recurring,
          // These fields are required by the receipt table but not applicable for manual entries
          original_file_url: null,
          ocr_status: "completed",
          source: "manual_entry",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save expense");
      }

      toast.success("Expense saved successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Failed to save expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild 
              className="w-fit hover:bg-purple-50"
            >
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 mb-6 shadow-lg">
                <FileText className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
                Add Manual Expense
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Record business expenses when you don't have a receipt. Perfect for parking, tips, tolls, and small cash purchases.
              </p>
            </div>
          </div>

          {/* IRS Notice */}
          <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <AlertDescription className="text-blue-800 font-medium">
              <strong className="text-blue-900">IRS Notice:</strong> Keep supporting documentation (bank statements, emails, etc.) for all manual entries. 
              Expenses over $75 require additional proof for meals and entertainment.
            </AlertDescription>
          </Alert>

          {/* Quick Templates */}
          <Card className="bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">Quick Templates</CardTitle>
                  <CardDescription className="text-gray-600">Select a common expense type to pre-fill the form</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {EXPENSE_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    className={`flex flex-col items-center gap-3 h-auto py-6 transition-all duration-300 group ${
                      selectedTemplate === template.id 
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105 border-0"
                        : "border-2 border-purple-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:border-purple-400 hover:scale-105 hover:shadow-md"
                    }`}
                    onClick={() => applyTemplate(template.id)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      selectedTemplate === template.id
                        ? "bg-white/20"
                        : "bg-gradient-to-r from-purple-100 to-blue-100 group-hover:from-purple-200 group-hover:to-blue-200"
                    }`}>
                      <template.icon className={`h-5 w-5 ${
                        selectedTemplate === template.id ? "text-white" : "text-purple-600"
                      }`} />
                    </div>
                    <span className="text-sm font-medium">{template.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main Form */}
          <form onSubmit={handleSubmit}>
            <Card className="bg-gradient-to-br from-white via-gray-50/50 to-purple-50/30 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="pb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Expense Details</CardTitle>
                    <CardDescription className="text-gray-600">All fields marked with * are required for IRS compliance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date and Amount Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="date" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center">
                        <Calendar className="h-3 w-3 text-purple-600" />
                      </div>
                      Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-lg h-12 text-base"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="amount" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center">
                        <DollarSign className="h-3 w-3 text-green-600" />
                      </div>
                      Amount *
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-lg h-12 text-base font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Vendor */}
                <div className="space-y-3">
                  <Label htmlFor="vendor" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                      <Store className="h-3 w-3 text-blue-600" />
                    </div>
                    Vendor/Description *
                  </Label>
                  <Input
                    id="vendor"
                    placeholder="Who did you pay or what did you buy?"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-lg h-12 text-base"
                    required
                  />
                </div>

                {/* Category and Payment Method */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center">
                        <Tag className="h-3 w-3 text-orange-600" />
                      </div>
                      Category *
                    </Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger id="category" className="border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-lg h-12 text-base">
                        <SelectValue placeholder="Select expense category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="payment_method" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-indigo-100 flex items-center justify-center">
                        <CreditCard className="h-3 w-3 text-indigo-600" />
                      </div>
                      Payment Method *
                    </Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                      <SelectTrigger id="payment_method" className="border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-lg h-12 text-base">
                        <SelectValue placeholder="How did you pay?" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Business Purpose */}
                <div className="space-y-3">
                  <Label htmlFor="business_purpose" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center">
                      <FileText className="h-3 w-3 text-emerald-600" />
                    </div>
                    Business Purpose *
                  </Label>
                  <Textarea
                    id="business_purpose"
                    placeholder="Explain why this was a business expense (required for IRS)"
                    value={businessPurpose}
                    onChange={(e) => setBusinessPurpose(e.target.value)}
                    className="border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-lg text-base min-h-[80px]"
                    rows={3}
                    required
                  />
                </div>

                {/* No Receipt Reason */}
                <div className="space-y-3">
                  <Label htmlFor="manual_entry_reason" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center">
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                    </div>
                    Why No Receipt? *
                  </Label>
                  <Select value={manualEntryReason} onValueChange={setManualEntryReason} required>
                    <SelectTrigger id="manual_entry_reason" className="border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-lg h-12 text-base">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {NO_RECEIPT_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <Label htmlFor="notes" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                      <FileText className="h-3 w-3 text-gray-600" />
                    </div>
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="border-2 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-lg text-base min-h-[70px]"
                    rows={2}
                  />
                </div>

                {/* Recurring Checkbox */}
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <Checkbox
                    id="recurring"
                    checked={recurring}
                    onCheckedChange={(checked) => setRecurring(checked as boolean)}
                    className="border-purple-300 data-[state=checked]:bg-purple-600"
                  />
                  <Label
                    htmlFor="recurring"
                    className="text-base font-medium text-gray-700 cursor-pointer flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center">
                      <Clock className="h-3 w-3 text-purple-600" />
                    </div>
                    This is a recurring expense
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-center gap-6 mt-10">
              <Button 
                variant="outline" 
                asChild 
                className="border-2 border-gray-300 hover:bg-gray-50 px-8 py-3 text-base font-medium h-12 rounded-lg"
              >
                <Link href="/dashboard">
                  Cancel
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl px-12 py-3 text-base font-semibold h-12 rounded-lg transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Expense
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}