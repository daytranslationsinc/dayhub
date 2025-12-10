import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SavedSearch {
  id: number;
  name: string;
  searchQuery?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  city?: string;
  state?: string;
  metro?: string;
  specialty?: string;
  certification?: string;
  isPreset?: boolean;
}

interface SavedSearchSidebarProps {
  currentFilters: {
    searchQuery: string;
    sourceLanguage: string;
    targetLanguage: string;
    selectedMetro: string;
    selectedState: string;
  };
  onLoadSearch: (search: SavedSearch) => void;
}

export function SavedSearchSidebar({ currentFilters, onLoadSearch }: SavedSearchSidebarProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState("");

  const { data: savedSearches = [], refetch } = trpc.getSavedSearches.useQuery();
  const createMutation = trpc.createSavedSearch.useMutation({
    onSuccess: () => {
      toast.success("Search saved successfully!");
      setShowSaveDialog(false);
      setSearchName("");
      refetch();
    },
    onError: () => {
      toast.error("Failed to save search");
    },
  });

  const deleteMutation = trpc.deleteSavedSearch.useMutation({
    onSuccess: () => {
      toast.success("Search deleted");
      refetch();
    },
    onError: () => {
      toast.error("Failed to delete search");
    },
  });

  const handleSaveSearch = () => {
    if (!searchName.trim()) {
      toast.error("Please enter a name for this search");
      return;
    }

    createMutation.mutate({
      name: searchName,
      searchQuery: currentFilters.searchQuery || undefined,
      sourceLanguage: currentFilters.sourceLanguage || undefined,
      targetLanguage: currentFilters.targetLanguage || undefined,
      metro: currentFilters.selectedMetro || undefined,
      state: currentFilters.selectedState || undefined,
    });
  };

  const presetSearches = (savedSearches as SavedSearch[]).filter((s) => s.isPreset);
  const userSearches = (savedSearches as SavedSearch[]).filter((s) => !s.isPreset);

  return (
    <div className="space-y-4">
      {/* Save Current Search Button */}
      <Button
        onClick={() => setShowSaveDialog(true)}
        variant="outline"
        className="w-full"
        disabled={!currentFilters.searchQuery && !currentFilters.sourceLanguage && !currentFilters.targetLanguage && !currentFilters.selectedMetro && !currentFilters.selectedState}
      >
        <Bookmark className="w-4 h-4 mr-2" />
        Save Current Search
      </Button>

      {/* Preset Searches */}
      {presetSearches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Quick Searches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {presetSearches.map((search) => (
              <Button
                key={search.id}
                variant="ghost"
                className="w-full justify-start text-sm h-auto py-2"
                onClick={() => onLoadSearch(search)}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">{search.name}</span>
                  <div className="flex flex-wrap gap-1">
                    {search.sourceLanguage && (
                      <Badge variant="secondary" className="text-xs">
                        From: {search.sourceLanguage}
                      </Badge>
                    )}
                    {search.targetLanguage && (
                      <Badge variant="secondary" className="text-xs">
                        To: {search.targetLanguage}
                      </Badge>
                    )}
                    {search.metro && (
                      <Badge variant="outline" className="text-xs">
                        {search.metro}
                      </Badge>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* User Saved Searches */}
      {userSearches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              My Saved Searches
              <Badge variant="secondary" className="ml-auto">
                {userSearches.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {userSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Button
                  variant="ghost"
                  className="flex-1 justify-start text-sm h-auto py-1 px-2"
                  onClick={() => onLoadSearch(search)}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">{search.name}</span>
                    <div className="flex flex-wrap gap-1">
                      {search.sourceLanguage && (
                        <Badge variant="secondary" className="text-xs">
                          From: {search.sourceLanguage}
                        </Badge>
                      )}
                      {search.targetLanguage && (
                        <Badge variant="secondary" className="text-xs">
                          To: {search.targetLanguage}
                        </Badge>
                      )}
                      {search.metro && (
                        <Badge variant="outline" className="text-xs">
                          {search.metro}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate({ id: search.id })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Give this search a name so you can quickly access it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Search Name</Label>
              <Input
                id="search-name"
                placeholder="e.g., Spanish Medical - NYC"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveSearch();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Current Filters</Label>
              <div className="flex flex-wrap gap-2">
                {currentFilters.searchQuery && (
                  <Badge variant="secondary">Query: {currentFilters.searchQuery}</Badge>
                )}
                {currentFilters.sourceLanguage && (
                  <Badge variant="secondary">From: {currentFilters.sourceLanguage}</Badge>
                )}
                {currentFilters.targetLanguage && (
                  <Badge variant="secondary">To: {currentFilters.targetLanguage}</Badge>
                )}
                {currentFilters.selectedMetro && (
                  <Badge variant="secondary">Metro: {currentFilters.selectedMetro}</Badge>
                )}
                {currentFilters.selectedState && (
                  <Badge variant="secondary">State: {currentFilters.selectedState}</Badge>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Search"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
