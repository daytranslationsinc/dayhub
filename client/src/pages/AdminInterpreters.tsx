import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Check, X, Eye, Download, Plus, Mail } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function AdminInterpreters() {
  const { data: searchResults, refetch } = trpc.searchInterpreters.useQuery({
    limit: 100,
    offset: 0,
  });

  const interpreters = searchResults?.interpreters || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Interpreter Management</h1>
            <p className="text-muted-foreground mt-2">
              Review and manage interpreter profiles
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/interpreters/create">
                <Plus className="w-4 h-4 mr-2" />
                Create New
              </Link>
            </Button>
            <ExportButton />
          </div>
        </div>

        <div className="grid gap-4">
          {interpreters.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No interpreters found</p>
              </CardContent>
            </Card>
          ) : (
            interpreters.map((interpreter: any) => (
              <Card key={interpreter.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {interpreter.firstName} {interpreter.lastName}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {interpreter.email} • {interpreter.phone}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {interpreter.isAvailable ? (
                        <Badge variant="default" className="bg-green-500">Available</Badge>
                      ) : (
                        <Badge variant="secondary">Busy</Badge>
                      )}
                      {interpreter.rating && (
                        <Badge variant="outline">
                          ⭐ {parseFloat(interpreter.rating).toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">
                        {interpreter.city}, {interpreter.state}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Metro</p>
                      <p className="font-medium">{interpreter.metro || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Languages</p>
                      <p className="font-medium">
                        {interpreter.sourceLanguage} → {interpreter.targetLanguage}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Experience</p>
                      <p className="font-medium">
                        {interpreter.yearsOfExperience || 0} years
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/interpreter/${interpreter.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function ExportButton() {
  const exportMutation = trpc.exportInterpretersCSV.useQuery(
    {},
    { enabled: false }
  );

  const handleExport = async () => {
    try {
      const result = await exportMutation.refetch();
      if (result.data) {
        // Create a blob and download
        const blob = new Blob([result.data.csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `interpreters-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success(`Exported ${result.data.count} interpreters`);
      }
    } catch (error) {
      toast.error("Export failed. Please try again.");
    }
  };

  return (
    <Button onClick={handleExport} disabled={exportMutation.isFetching}>
      <Download className="w-4 h-4 mr-2" />
      {exportMutation.isFetching ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
