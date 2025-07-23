"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Building,
  MoreHorizontal,
  Search,
  Users,
  DollarSign
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  email: string;
  company_name?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  payment_terms: string;
  is_active: boolean;
}

interface ClientManagementProps {
  refreshTrigger?: number;
  openFormDirectly?: boolean;
}

export function ClientManagement({ refreshTrigger, openFormDirectly }: ClientManagementProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company_name: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "United States",
    payment_terms: "Net 30",
    notes: ""
  });

  const supabase = createClient();

  useEffect(() => {
    fetchClients();
  }, [refreshTrigger]);

  useEffect(() => {
    if (openFormDirectly) {
      setShowForm(true);
    }
  }, [openFormDirectly]);

  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name || "",
        email: editingClient.email || "",
        company_name: editingClient.company_name || "",
        phone: editingClient.phone || "",
        address_line1: editingClient.address_line1 || "",
        address_line2: "",
        city: editingClient.city || "",
        state: editingClient.state || "",
        postal_code: "",
        country: "United States",
        payment_terms: editingClient.payment_terms || "Net 30",
        notes: ""
      });
    } else {
      setFormData({
        name: "",
        email: "",
        company_name: "",
        phone: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "United States",
        payment_terms: "Net 30",
        notes: ""
      });
    }
  }, [editingClient]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) return;

      const { data, error } = await supabase
        .from('client')
        .select('*')
        .eq('tenant_id', membership.tenant_id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.email) {
        toast.error("Name and email are required");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: membership } = await supabase
        .from('membership')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!membership) throw new Error("No tenant membership found");

      const clientData = {
        ...formData,
        tenant_id: membership.tenant_id,
        user_id: user.id
      };

      if (editingClient) {
        const { error } = await supabase
          .from('client')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;
        toast.success("Client updated successfully!");
      } else {
        const { error } = await supabase
          .from('client')
          .insert(clientData);

        if (error) throw error;
        toast.success("Client created successfully!");
      }

      setShowForm(false);
      setEditingClient(null);
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error("Failed to save client. Please try again.");
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('client')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      
      toast.success("Client deleted successfully");
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error("Failed to delete client");
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.company_name && client.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="border-b border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Client Directory</CardTitle>
                <p className="text-sm text-muted-foreground">Manage your client contacts and information</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64 border-purple-200 focus:border-purple-500"
                />
              </div>
              
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="h-10 w-10 bg-gradient-to-r from-purple-200 to-blue-200 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-48"></div>
                    <div className="h-3 bg-gradient-to-r from-purple-200 to-blue-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? "Try adjusting your search criteria"
                  : "Add your first client to start creating invoices"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Client
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Name
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Company
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Contact
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">Payment Terms</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-purple-700">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.company_name ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <span>{client.company_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No company</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="w-3 h-3 mr-1 text-gray-400" />
                            <span className="truncate">{client.email}</span>
                          </div>
                          {client.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-blue-200 text-blue-700">
                          {client.payment_terms}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={client.is_active ? "default" : "secondary"}
                          className={client.is_active ? "bg-green-100 text-green-800 border-green-200" : ""}
                        >
                          {client.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-purple-50">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(client)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(client.id)}
                              className="text-red-600"
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
          )}
        </CardContent>
      </Card>

      {/* Client Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) {
          setEditingClient(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-purple-100 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              {editingClient ? "Edit Client" : "Add New Client"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {editingClient ? "Update client information and settings" : "Add a new client to your directory"}
            </p>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                    className="border-purple-200 focus:border-purple-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@company.com"
                    className="border-purple-200 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Company & Contact */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Building className="h-4 w-4 text-purple-600" />
                Company & Contact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium">Company Name</Label>
                  <Input
                    id="company"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Acme Corp"
                    className="border-purple-200 focus:border-purple-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="border-purple-200 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-600" />
                Address Information
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address_line1}
                    onChange={(e) => setFormData(prev => ({ ...prev, address_line1: e.target.value }))}
                    placeholder="123 Main Street"
                    className="border-purple-200 focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="New York"
                      className="border-purple-200 focus:border-purple-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="NY"
                      className="border-purple-200 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                Payment Settings
              </h4>
              <div className="space-y-2">
                <Label htmlFor="payment-terms" className="text-sm font-medium">Payment Terms</Label>
                <Select 
                  value={formData.payment_terms} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_terms: value }))}
                >
                  <SelectTrigger className="border-purple-200 focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                    <SelectItem value="Net 90">Net 90</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-purple-100 pt-4 mt-6">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {editingClient ? "Update Client" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}