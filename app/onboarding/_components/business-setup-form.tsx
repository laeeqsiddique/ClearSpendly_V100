"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { 
  Building, 
  MapPin, 
  Phone, 
  Globe, 
  FileText, 
  Users,
  Target,
  Loader2,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const businessSetupSchema = z.object({
  // Basic Company Information
  companyName: z.string().min(1, "Company name is required").default("My Business"),
  businessType: z.enum(["sole-proprietorship", "partnership", "llc", "corporation", "s-corp", "nonprofit"]).optional(),
  industry: z.string().optional(),
  teamSize: z.enum(["1", "2-10", "11-50", "51-200", "201-500", "500+"]).optional(),
  
  // Contact Information
  country: z.string().default("US"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  
  // Tax Information (Optional)
  taxId: z.string().optional(),
  taxIdType: z.enum(["ein", "ssn", "itin", "other"]).optional(),
  
  // Preferences
  accountingSoftware: z.array(z.string()).optional(),
  primaryCurrency: z.string().default("USD"),
  timezone: z.string().optional(),
  
  // Features & Needs
  primaryUseCase: z.array(z.string()).optional(),
  expectedReceiptsPerMonth: z.enum(["0-10", "11-50", "51-200", "201-500", "500+"]).optional(),
  
  // Optional fields
  description: z.string().max(500).optional(),
  referralSource: z.string().optional(),
  
  // Legal agreements (optional for now to allow progression)
  agreesToTerms: z.boolean().optional().default(true),
  agreesToPrivacy: z.boolean().optional().default(true),
  agreesToMarketing: z.boolean().optional().default(false)
});

export type BusinessSetupFormData = z.infer<typeof businessSetupSchema>;

interface BusinessSetupFormProps {
  onSubmit: (data: BusinessSetupFormData) => Promise<void>;
  onSkip?: () => void;
  initialData?: Partial<BusinessSetupFormData>;
  isLoading?: boolean;
  className?: string;
}

const BUSINESS_TYPES = [
  { value: "sole-proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "s-corp", label: "S Corporation" },
  { value: "nonprofit", label: "Nonprofit Organization" }
];

const INDUSTRIES = [
  { value: "technology", label: "Technology & Software" },
  { value: "consulting", label: "Consulting & Professional Services" },
  { value: "healthcare", label: "Healthcare & Medical" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "construction", label: "Construction & Real Estate" },
  { value: "finance", label: "Finance & Insurance" },
  { value: "education", label: "Education & Training" },
  { value: "hospitality", label: "Hospitality & Food Service" },
  { value: "nonprofit", label: "Nonprofit & Government" },
  { value: "agriculture", label: "Agriculture & Natural Resources" },
  { value: "transportation", label: "Transportation & Logistics" },
  { value: "media", label: "Media & Entertainment" },
  { value: "other", label: "Other" }
];

const TEAM_SIZES = [
  { value: "1", label: "Just me" },
  { value: "2-10", label: "2-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "500+", label: "500+ employees" }
];

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "OTHER", label: "Other" }
];

const ACCOUNTING_SOFTWARE = [
  "QuickBooks",
  "Xero", 
  "FreshBooks",
  "Wave",
  "Sage",
  "NetSuite",
  "Zoho Books",
  "Excel/Google Sheets",
  "Other",
  "None"
];

const PRIMARY_USE_CASES = [
  "Business expense tracking",
  "Tax preparation",
  "Reimbursement management",
  "Budget monitoring",
  "Financial reporting",
  "Audit preparation",
  "Team expense management",
  "Client billing/invoicing"
];

const RECEIPT_VOLUMES = [
  { value: "0-10", label: "0-10 per month" },
  { value: "11-50", label: "11-50 per month" },
  { value: "51-200", label: "51-200 per month" },
  { value: "201-500", label: "201-500 per month" },
  { value: "500+", label: "500+ per month" }
];

export function BusinessSetupForm({
  onSubmit,
  onSkip,
  initialData,
  isLoading = false,
  className
}: BusinessSetupFormProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [completedSections, setCompletedSections] = useState<number[]>([]);

  const form = useForm<BusinessSetupFormData>({
    resolver: zodResolver(businessSetupSchema),
    defaultValues: {
      companyName: "My Business",
      country: "US",
      primaryCurrency: "USD",
      accountingSoftware: [],
      primaryUseCase: [],
      agreesToTerms: true,
      agreesToPrivacy: true,
      agreesToMarketing: false,
      ...initialData
    }
  });

  // Auto-fill test data function
  const fillTestData = () => {
    form.setValue("companyName", "Acme Corp");
    form.setValue("businessType", "llc");
    form.setValue("industry", "technology");
    form.setValue("teamSize", "11-50");
    form.setValue("country", "US");
    form.setValue("address", "123 Business Ave");
    form.setValue("city", "San Francisco");
    form.setValue("state", "CA");
    form.setValue("zipCode", "94102");
    form.setValue("phone", "+1 (555) 123-4567");
    form.setValue("website", "https://acme.com");
    form.setValue("taxId", "12-3456789");
    form.setValue("taxIdType", "ein");
    form.setValue("primaryCurrency", "USD");
    form.setValue("accountingSoftware", ["QuickBooks"]);
    form.setValue("primaryUseCase", ["Business expense tracking", "Tax preparation"]);
    form.setValue("expectedReceiptsPerMonth", "51-200");
    form.setValue("description", "A technology company focused on innovative solutions.");
    form.setValue("agreesToTerms", true);
    form.setValue("agreesToPrivacy", true);
    toast.success("Test data filled successfully!");
  };

  const sections = [
    {
      title: "Company Information",
      description: "Basic details about your business",
      icon: <Building className="w-5 h-5" />,
      fields: ["companyName", "businessType", "industry", "teamSize"]
    },
    {
      title: "Contact Details",
      description: "Where your business is located",
      icon: <MapPin className="w-5 h-5" />,
      fields: ["country", "address", "city", "state", "zipCode", "phone", "website"]
    },
    {
      title: "Tax Information",
      description: "Optional tax details for better record keeping",
      icon: <FileText className="w-5 h-5" />,
      fields: ["taxId", "taxIdType"]
    },
    {
      title: "Preferences",
      description: "Customize your experience",
      icon: <Target className="w-5 h-5" />,
      fields: ["accountingSoftware", "primaryCurrency", "primaryUseCase", "expectedReceiptsPerMonth"]
    },
    {
      title: "Final Details",
      description: "Additional information and agreements",
      icon: <Info className="w-5 h-5" />,
      fields: ["description", "referralSource", "agreesToTerms", "agreesToPrivacy", "agreesToMarketing"]
    }
  ];

  const handleSectionValidation = async (sectionIndex: number) => {
    const sectionFields = sections[sectionIndex].fields;
    const isValid = await form.trigger(sectionFields as any);
    
    if (isValid) {
      setCompletedSections(prev => [...new Set([...prev, sectionIndex])]);
      if (sectionIndex < sections.length - 1) {
        setCurrentSection(sectionIndex + 1);
      }
    }
    
    return isValid;
  };

  const handleSubmit = async (data: BusinessSetupFormData) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Business setup error:', error);
      toast.error('Failed to save business information. Please try again.');
    }
  };

  const canProceedToNext = () => {
    const sectionFields = sections[currentSection].fields;
    return sectionFields.every(field => {
      const value = form.getValues(field as any);
      if (field === 'agreesToTerms' || field === 'agreesToPrivacy') {
        return value === true;
      }
      if (['companyName', 'businessType', 'industry', 'teamSize', 'country'].includes(field)) {
        return value && value.toString().length > 0;
      }
      return true; // Optional fields
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Development helper */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <Button
              onClick={fillTestData}
              variant="outline"
              size="sm"
              className="w-full border-green-300 text-green-700 hover:bg-green-100"
            >
              Fill Test Data (Development)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress indicator */}
      <div className="flex justify-center space-x-2 mb-8">
        {sections.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-3 h-3 rounded-full transition-colors",
              index === currentSection ? "bg-purple-500" :
              completedSections.includes(index) ? "bg-green-500" :
              "bg-gray-200"
            )}
          />
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                {sections[currentSection].icon}
                <div>
                  <CardTitle>{sections[currentSection].title}</CardTitle>
                  <CardDescription>{sections[currentSection].description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Section 0: Company Information */}
              {currentSection === 0 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corp" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select business type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BUSINESS_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDUSTRIES.map(industry => (
                              <SelectItem key={industry.value} value={industry.value}>
                                {industry.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="teamSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Size *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select team size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TEAM_SIZES.map(size => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Section 1: Contact Details */}
              {currentSection === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COUNTRIES.map(country => (
                              <SelectItem key={country.value} value={country.value}>
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Business Ave" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="San Francisco" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input placeholder="CA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP/Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="94102" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourcompany.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Section 2: Tax Information */}
              {currentSection === 2 && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Tax information is optional</p>
                        <p className="mt-1">Providing tax details helps with categorization and reporting, but you can add this later.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID Number</FormLabel>
                          <FormControl>
                            <Input placeholder="12-3456789" {...field} />
                          </FormControl>
                          <FormDescription>
                            EIN, SSN, or other tax identifier
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="taxIdType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ein">EIN</SelectItem>
                              <SelectItem value="ssn">SSN</SelectItem>
                              <SelectItem value="itin">ITIN</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Section 3: Preferences */}
              {currentSection === 3 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="accountingSoftware"
                    render={() => (
                      <FormItem>
                        <FormLabel>Accounting Software (Optional)</FormLabel>
                        <FormDescription>
                          Which accounting software do you currently use?
                        </FormDescription>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {ACCOUNTING_SOFTWARE.map((software) => (
                            <FormField
                              key={software}
                              control={form.control}
                              name="accountingSoftware"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={software}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(software)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), software])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== software
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {software}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="primaryUseCase"
                    render={() => (
                      <FormItem>
                        <FormLabel>Primary Use Cases</FormLabel>
                        <FormDescription>
                          What will you primarily use ClearSpendly for?
                        </FormDescription>
                        <div className="grid grid-cols-1 gap-2 mt-2">
                          {PRIMARY_USE_CASES.map((useCase) => (
                            <FormField
                              key={useCase}
                              control={form.control}
                              name="primaryUseCase"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={useCase}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(useCase)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), useCase])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== useCase
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {useCase}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="expectedReceiptsPerMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Receipt Volume</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="How many receipts do you process monthly?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RECEIPT_VOLUMES.map(volume => (
                              <SelectItem key={volume.value} value={volume.value}>
                                {volume.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          This helps us recommend the right plan for you
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Section 4: Final Details */}
              {currentSection === 4 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us a bit about your business..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This helps us provide better recommendations (max 500 characters)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="referralSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How did you hear about us? (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="search">Search Engine</SelectItem>
                            <SelectItem value="social">Social Media</SelectItem>
                            <SelectItem value="referral">Friend/Colleague Referral</SelectItem>
                            <SelectItem value="blog">Blog/Article</SelectItem>
                            <SelectItem value="podcast">Podcast</SelectItem>
                            <SelectItem value="advertisement">Advertisement</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="agreesToTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">
                              I agree to the{" "}
                              <a href="/terms-of-service" target="_blank" className="text-purple-600 hover:underline">
                                Terms of Service
                              </a>
                              {" "}*
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="agreesToPrivacy"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">
                              I agree to the{" "}
                              <a href="/privacy-policy" target="_blank" className="text-purple-600 hover:underline">
                                Privacy Policy
                              </a>
                              {" "}*
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="agreesToMarketing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">
                              I would like to receive product updates and marketing communications
                            </FormLabel>
                            <FormDescription>
                              You can unsubscribe at any time
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Internal navigation for multi-section form */}
          {sections.length > 1 && (
            <div className="flex justify-between pt-4 border-t">
              <div>
                {currentSection > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentSection(currentSection - 1)}
                  >
                    Previous Section
                  </Button>
                )}
              </div>
              <div>
                {currentSection < sections.length - 1 && (
                  <Button
                    type="button"
                    onClick={() => handleSectionValidation(currentSection)}
                    disabled={!canProceedToNext()}
                  >
                    Next Section
                  </Button>
                )}
              </div>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}