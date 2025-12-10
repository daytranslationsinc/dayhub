import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Users,
  Globe2,
  MapPin,
  Languages as LanguagesIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedMetro, setSelectedMetro] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedInterpreter, setSelectedInterpreter] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    metro: "",
    country: "USA",
    targetLanguage: "",
    sourceLanguage: "English",
    zipCode: "",
    specialties: "",
    certifications: "",
    notes: "",
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: searchResults, isLoading } = trpc.searchInterpreters.useQuery({
    query: searchQuery,
    targetLanguage: selectedLanguage || undefined,
    metro: selectedMetro || undefined,
    limit: 20,
    offset: currentPage * 20,
  });

  const { data: stats } = trpc.getStats.useQuery();
  const { data: languages } = trpc.getLanguages.useQuery();
  const { data: metros } = trpc.getMetros.useQuery();

  // Mutations
  const createMutation = trpc.createInterpreter.useMutation({
    onSuccess: () => {
      toast.success("Interpreter created successfully");
      setIsAddDialogOpen(false);
      resetForm();
      utils.searchInterpreters.invalidate();
      utils.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create interpreter: ${error.message}`);
    },
  });

  const updateMutation = trpc.updateInterpreter.useMutation({
    onSuccess: () => {
      toast.success("Interpreter updated successfully");
      setIsEditDialogOpen(false);
      setSelectedInterpreter(null);
      resetForm();
      utils.searchInterpreters.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update interpreter: ${error.message}`);
    },
  });

  const deleteMutation = trpc.deleteInterpreter.useMutation({
    onSuccess: () => {
      toast.success("Interpreter deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedInterpreter(null);
      utils.searchInterpreters.invalidate();
      utils.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete interpreter: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      metro: "",
      country: "USA",
      targetLanguage: "",
    sourceLanguage: "English",
    zipCode: "",
      specialties: "",
      certifications: "",
      notes: "",
    });
  };

  const handleEdit = (interpreter: any) => {
    setSelectedInterpreter(interpreter);
    setFormData({
      firstName: interpreter.firstName || "",
      lastName: interpreter.lastName || "",
      phone: interpreter.phone || "",
      email: interpreter.email || "",
      city: interpreter.city || "",
      state: interpreter.state || "",
      metro: interpreter.metro || "",
      country: interpreter.country || "USA",
      targetLanguage: interpreter.targetLanguage || "",
      sourceLanguage: interpreter.sourceLanguage || "English",
      zipCode: interpreter.zipCode || "",
      specialties: interpreter.specialties ? JSON.parse(interpreter.specialties).join(", ") : "",
      certifications: interpreter.certifications || "",
      notes: interpreter.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (interpreter: any) => {
    setSelectedInterpreter(interpreter);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitCreate = () => {
    // Languages now use targetLanguage
    const specialties = formData.specialties.split(",").map((s) => s.trim()).filter(Boolean);

    createMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      metro: formData.metro || undefined,
      country: formData.country,
      targetLanguage: formData.targetLanguage,
      sourceLanguage: formData.sourceLanguage,
      zipCode: formData.zipCode,
      specialties: specialties.length > 0 ? specialties : undefined,
      certifications: formData.certifications || undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleSubmitUpdate = () => {
    if (!selectedInterpreter) return;

    // Languages now use targetLanguage
    const specialties = formData.specialties.split(",").map((s) => s.trim()).filter(Boolean);

    updateMutation.mutate({
      id: selectedInterpreter.id,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      metro: formData.metro || undefined,
      country: formData.country,
      targetLanguage: formData.targetLanguage,
      sourceLanguage: formData.sourceLanguage,
      zipCode: formData.zipCode,
      specialties: specialties.length > 0 ? specialties : undefined,
      certifications: formData.certifications || undefined,
      notes: formData.notes || undefined,
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedInterpreter) return;
    deleteMutation.mutate({ id: selectedInterpreter.id });
  };

  const interpreters = searchResults?.interpreters || [];
  const hasMore = searchResults?.hasMore || false;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Interpreter Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your interpreter database
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Total Interpreters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalInterpreters || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <LanguagesIcon className="w-4 h-4 text-primary" />
                Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{languages?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Metro Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metros?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-primary" />
                Total Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCalls || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Interpreters</CardTitle>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Interpreter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Languages</SelectItem>
                  {languages?.slice(0, 50).map((lang: string) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMetro} onValueChange={setSelectedMetro}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="All Metro Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Metro Areas</SelectItem>
                  {metros?.slice(0, 50).map((metro: string) => (
                    <SelectItem key={metro} value={metro}>
                      {metro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Languages</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : interpreters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No interpreters found
                      </TableCell>
                    </TableRow>
                  ) : (
                    interpreters.map((interpreter: any) => (
                        <TableRow key={interpreter.id}>
                          <TableCell className="font-medium">
                            {interpreter.firstName} {interpreter.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {interpreter.targetLanguage || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {interpreter.city}, {interpreter.state}
                          </TableCell>
                          <TableCell className="text-sm">
                            {interpreter.email || interpreter.phone || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(interpreter)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(interpreter)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {(hasMore || currentPage > 0) && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage + 1}
                </span>
                <Button
                  variant="outline"
                  disabled={!hasMore}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedInterpreter(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? "Edit Interpreter" : "Add New Interpreter"}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen
                ? "Update interpreter information"
                : "Add a new interpreter to the database"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="New York"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="NY"
                maxLength={2}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="metro">Metro Area</Label>
              <Input
                id="metro"
                value={formData.metro}
                onChange={(e) => setFormData({ ...formData, metro: e.target.value })}
                placeholder="New York-Newark-Jersey City"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="targetLanguage">Target Language *</Label>
              <Input
                id="targetLanguage"
                value={formData.targetLanguage}
                onChange={(e) => setFormData({ ...formData, targetLanguage: e.target.value })}
                placeholder="Spanish"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="specialties">Specialties (comma-separated)</Label>
              <Input
                id="specialties"
                value={formData.specialties}
                onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                placeholder="Medical, Legal, Business"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="certifications">Certifications</Label>
              <Input
                id="certifications"
                value={formData.certifications}
                onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                placeholder="ATA Certified, NAJIT Certified"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedInterpreter(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleSubmitUpdate : handleSubmitCreate}
              disabled={
                !formData.firstName ||
                !formData.lastName ||
                !formData.targetLanguage ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEditDialogOpen ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Interpreter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedInterpreter?.firstName}{" "}
              {selectedInterpreter?.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
