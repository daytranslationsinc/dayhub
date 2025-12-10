import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { trpc } from "../lib/trpc";

type ImportStep = "upload" | "validate" | "import" | "complete";

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export default function AdminImport() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  const importMutation = trpc.importInterpretersCSV.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvData(content);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleValidate = () => {
    // Basic CSV validation
    const errors: ValidationError[] = [];
    const lines = csvData.split("\n");
    
    if (lines.length < 2) {
      errors.push({ row: 0, field: "file", message: "CSV file is empty or has no data rows" });
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const requiredFields = ["name", "email", "phone", "sourcelanguage", "targetlanguage"];
    
    requiredFields.forEach(field => {
      if (!headers.includes(field)) {
        errors.push({ row: 0, field, message: `Missing required column: ${field}` });
      }
    });

    // Validate data rows
    for (let i = 1; i < Math.min(lines.length, 11); i++) { // Validate first 10 rows
      const values = lines[i].split(",");
      if (values.length !== headers.length) {
        errors.push({ row: i + 1, field: "row", message: "Column count mismatch" });
      }
    }

    setValidationErrors(errors);
    setStep("validate");
  };

  const handleImport = async () => {
    setStep("import");
    try {
      const result = await importMutation.mutateAsync({ csvData });
      setImportResults(result);
      setStep("complete");
    } catch (error) {
      console.error("Import failed:", error);
      setValidationErrors([{ row: 0, field: "import", message: "Import failed. Please check your data and try again." }]);
      setStep("validate");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setCsvData("");
    setValidationErrors([]);
    setImportResults(null);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Import Interpreters</CardTitle>
            <CardDescription>
              Upload a CSV file to import multiple interpreters at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8">
              {["upload", "validate", "import", "complete"].map((s, idx) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      step === s
                        ? "bg-blue-600 text-white"
                        : ["validate", "import", "complete"].indexOf(step) > idx
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="ml-2 text-sm font-medium capitalize">{s}</span>
                  {idx < 3 && <div className="w-16 h-0.5 bg-gray-300 mx-4" />}
                </div>
              ))}
            </div>

            {/* Upload Step */}
            {step === "upload" && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700"
                  >
                    Click to upload CSV file
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    or drag and drop
                  </p>
                </div>

                {file && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      File selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Required CSV Columns:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• name</li>
                    <li>• email</li>
                    <li>• phone</li>
                    <li>• sourceLanguage</li>
                    <li>• targetLanguage</li>
                    <li>• city (optional)</li>
                    <li>• state (optional)</li>
                    <li>• metroArea (optional)</li>
                  </ul>
                </div>

                <Button
                  onClick={handleValidate}
                  disabled={!file}
                  className="w-full"
                >
                  Continue to Validation
                </Button>
              </div>
            )}

            {/* Validate Step */}
            {step === "validate" && (
              <div className="space-y-4">
                {validationErrors.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                      Validation passed! Ready to import {csvData.split("\n").length - 1} interpreters.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      Found {validationErrors.length} validation errors:
                      <ul className="mt-2 space-y-1">
                        {validationErrors.slice(0, 5).map((error, idx) => (
                          <li key={idx} className="text-sm">
                            Row {error.row}, {error.field}: {error.message}
                          </li>
                        ))}
                        {validationErrors.length > 5 && (
                          <li className="text-sm">
                            ... and {validationErrors.length - 5} more errors
                          </li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4">
                  <Button onClick={handleReset} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={validationErrors.length > 0 || importMutation.isPending}
                    className="flex-1"
                  >
                    {importMutation.isPending ? "Importing..." : "Start Import"}
                  </Button>
                </div>
              </div>
            )}

            {/* Import Step */}
            {step === "import" && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Importing interpreters...</p>
              </div>
            )}

            {/* Complete Step */}
            {step === "complete" && importResults && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    Import completed successfully!
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {importResults.success}
                        </div>
                        <div className="text-sm text-gray-600">Successfully Imported</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600">
                          {importResults.failed}
                        </div>
                        <div className="text-sm text-gray-600">Failed</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Button onClick={handleReset} className="w-full">
                  Import Another File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
