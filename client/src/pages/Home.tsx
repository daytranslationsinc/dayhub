import { useState, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Languages, Phone, Mail, Globe2, Filter, Loader2, Download, Bookmark, Calendar, Heart, Map } from "lucide-react";
import { StarRating } from "@/components/StarRating";
// import { FavoriteButton } from "@/components/FavoriteButton"; // Removed to prevent OAuth signup
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { InterpreterMap } from "@/components/InterpreterMap";
import { SavedSearchSidebar } from "@/components/SavedSearchSidebar";
import { toast } from "sonner";

export default function Home() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSourceLanguage, setSelectedSourceLanguage] = useState<string>("");
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<string>("");
  const [selectedMetro, setSelectedMetro] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [zipCode, setZipCode] = useState<string>("");
  const [radius, setRadius] = useState<number>(25);
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [certificationType, setCertificationType] = useState<string>("");
  const [minExperience, setMinExperience] = useState<number>(0);
  const [maxExperience, setMaxExperience] = useState<number>(30);
  const [minRate, setMinRate] = useState<number>(0);
  const [maxRate, setMaxRate] = useState<number>(200);
  const [proficiencyLevel, setProficiencyLevel] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "distance">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [appliedFilters, setAppliedFilters] = useState({
    query: "",
    sourceLanguage: "",
    targetLanguage: "",
    metro: "",
    state: "",
    zipCode: "",
    radius: 25,
    availableOnly: false,
    certificationType: "",
    minExperience: 0,
    maxExperience: 30,
    minRate: 0,
    maxRate: 200,
    proficiencyLevel: "",
  });
  const pageSize = 12;

  const handleLoadSavedSearch = (search: any) => {
    if (search.searchQuery) setSearchQuery(search.searchQuery);
    if (search.sourceLanguage) setSelectedSourceLanguage(search.sourceLanguage);
    if (search.targetLanguage) setSelectedTargetLanguage(search.targetLanguage);
    if (search.metro) setSelectedMetro(search.metro);
    if (search.state) setSelectedState(search.state);
    setCurrentPage(0);
    toast.success(`Loaded search: ${search.name}`);
  };

  // Fetch filter options
  const { data: languages = [] } = trpc.getLanguages.useQuery();
  const { data: metros = [] } = trpc.getMetros.useQuery();
  const { data: states = [] } = trpc.getStates.useQuery();
  const { data: stats } = trpc.getStats.useQuery();

  // Search interpreters with filters (using applied filters)
  const { data: searchResults, isLoading } = trpc.searchInterpreters.useQuery({
    query: appliedFilters.query || undefined,
    sourceLanguage: appliedFilters.sourceLanguage || undefined,
    targetLanguage: appliedFilters.targetLanguage || undefined,
    metro: appliedFilters.metro || undefined,
    state: appliedFilters.state || undefined,
    zipCode: appliedFilters.zipCode || undefined,
    radius: appliedFilters.radius,
    availableOnly: appliedFilters.availableOnly || undefined,
    certificationType: appliedFilters.certificationType || undefined,
        minExperience: appliedFilters.minExperience !== 0 ? appliedFilters.minExperience : undefined,
        maxExperience: appliedFilters.maxExperience !== 30 ? appliedFilters.maxExperience : undefined,
        minRate: appliedFilters.minRate !== 0 ? appliedFilters.minRate : undefined,
        maxRate: appliedFilters.maxRate !== 200 ? appliedFilters.maxRate : undefined,
    proficiencyLevel: appliedFilters.proficiencyLevel || undefined,
    limit: pageSize,
    offset: currentPage * pageSize,
    sortBy: sortBy,
    sortOrder: sortOrder,
  });

  const interpreters = searchResults?.interpreters || [];
  const hasMore = searchResults?.hasMore || false;
  const totalResults = searchResults?.total || 0;

  const exportMutation = trpc.exportToCSV.useQuery(
    {
      query: appliedFilters.query || undefined,
      sourceLanguage: appliedFilters.sourceLanguage || undefined,
      targetLanguage: appliedFilters.targetLanguage || undefined,
      metro: appliedFilters.metro || undefined,
      state: appliedFilters.state || undefined,
    },
    {
      enabled: false,
    }
  );

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const result = await exportMutation.refetch();
      if (!result.data) throw new Error("No data");

      // Create and download CSV file
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `interpreters-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${result.data.count} interpreters to CSV`);
    } catch (error) {
      toast.error("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };  // Parse languages for each interpreter
  const interpretersWithLanguages = useMemo(() => {
    return interpreters.map((interpreter) => {
      let specialtiesList = [];
      try {
        if (interpreter.specialties && typeof interpreter.specialties === 'string') {
          specialtiesList = JSON.parse(interpreter.specialties);
        } else if (Array.isArray(interpreter.specialties)) {
          specialtiesList = interpreter.specialties;
        }
      } catch (e) {
        console.error('Failed to parse specialties:', e);
        specialtiesList = [];
      }
      return {
        ...interpreter,
        specialtiesList,
      };
    });
  }, [interpreters]);

  const handleSearch = useCallback(() => {
    setIsSearching(true);
    setAppliedFilters({
      query: searchQuery,
      sourceLanguage: selectedSourceLanguage,
      targetLanguage: selectedTargetLanguage,
      metro: selectedMetro,
      state: selectedState,
      zipCode: zipCode,
      radius: radius,
      availableOnly: availableOnly,
      certificationType: certificationType,
      minExperience: minExperience,
      maxExperience: maxExperience,
      minRate: minRate,
      maxRate: maxRate,
      proficiencyLevel: proficiencyLevel,
    });
    setCurrentPage(0);
    setTimeout(() => setIsSearching(false), 300);
  }, [searchQuery, selectedSourceLanguage, selectedTargetLanguage, selectedMetro, selectedState, zipCode, radius, availableOnly, certificationType, minExperience, maxExperience, minRate, maxRate, proficiencyLevel]);

  // Trigger initial search on component mount to show all interpreters
  useEffect(() => {
    // Set applied filters to show all interpreters on initial load
    setAppliedFilters({
      query: "",
      sourceLanguage: "",
      targetLanguage: "",
      metro: "",
      state: "",
      zipCode: "",
      radius: 25,
      availableOnly: false,
      certificationType: "",
      minExperience: 0,
      maxExperience: 30,
      minRate: 0,
      maxRate: 200,
      proficiencyLevel: "",
    });
  }, []); // Empty dependency array = run once on mount

  // Geocode ZIP code when it changes
  const geocodeQuery = trpc.geocode.useQuery(
    { address: zipCode },
    { 
      enabled: !!zipCode && /^\d{5}$/.test(zipCode),
    }
  );

  // Update user location when geocode result changes
  useEffect(() => {
    if (geocodeQuery.data) {
      setUserLocation(geocodeQuery.data);
    } else if (geocodeQuery.isError || !zipCode) {
      setUserLocation(null);
    }
  }, [geocodeQuery.data, geocodeQuery.isError, zipCode]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedSourceLanguage("");
    setSelectedTargetLanguage("");
    setSelectedMetro("");
    setSelectedState("");
    setZipCode("");
    setRadius(25);
    setAvailableOnly(false);
    setCertificationType("");
    setMinExperience(0);
    setMaxExperience(30);
    setMinRate(0);
    setMaxRate(200);
    setProficiencyLevel("");
    setAppliedFilters({
      query: "",
      sourceLanguage: "",
      targetLanguage: "",
      metro: "",
      state: "",
      zipCode: "",
      radius: 25,
      availableOnly: false,
      certificationType: "",
      minExperience: 0,
      maxExperience: 30,
      minRate: 0,
      maxRate: 200,
      proficiencyLevel: "",
    });
    setCurrentPage(0);
  };

  const hasActiveFilters = appliedFilters.query || appliedFilters.sourceLanguage || appliedFilters.targetLanguage || appliedFilters.metro || appliedFilters.state;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Navigation - Removed to prevent OAuth signup */}

      {/* Saved Search Sidebar */}
      {showSavedSearches && (
        <div className="fixed top-20 right-4 z-40 w-80 max-h-[calc(100vh-6rem)] overflow-y-auto bg-background border rounded-lg shadow-xl p-4">
          <SavedSearchSidebar
            currentFilters={{
              searchQuery,
              sourceLanguage: selectedSourceLanguage,
              targetLanguage: selectedTargetLanguage,
              selectedMetro,
              selectedState,
            }}
            onLoadSearch={handleLoadSavedSearch}
          />
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-16 md:py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 to-primary opacity-100"></div>
        <div className="container relative z-10 max-w-6xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 animate-fade-in">
            DayHub
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-3 md:mb-4 font-light">
            A hub for searching all interpreters
          </p>
          <p className="text-sm sm:text-base md:text-lg text-white/80 mb-6 md:mb-8 max-w-2xl mx-auto">
            Search from {stats?.totalInterpreters.toLocaleString() || "21,900+"} qualified interpreters across {metros.length} major US metropolitan areas
          </p>
          <div className="flex flex-wrap gap-3 md:gap-4 justify-center text-sm md:text-base text-white/90">
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5" />
              <span>{languages.length}+ Languages</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>{metros.length} Metro Areas</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe2 className="w-5 h-5" />
              <span>{states.length} States</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filters Section */}
      <section className="container max-w-7xl mx-auto -mt-10 px-4 relative z-20">
        <Card className="shadow-xl border-0 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Filter className="w-6 h-6 text-primary" />
              Search Interpreters
            </CardTitle>
            <CardDescription>
              Use filters to find the perfect interpreter for your needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="pl-10 h-12 text-lg"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
              <div className="flex items-center space-x-2 h-12 px-3 border rounded-md">
                <input
                  type="checkbox"
                  id="availableOnly"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="availableOnly" className="text-sm font-medium cursor-pointer">
                  Available Only
                </label>
              </div>

              <Select
                value={selectedSourceLanguage}
                onValueChange={(value) => setSelectedSourceLanguage(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Source Language" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Source Languages</SelectItem>
                  {languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedTargetLanguage}
                onValueChange={(value) => setSelectedTargetLanguage(value === "all" ? "" : value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Target Language" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Target Languages</SelectItem>
                  {languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedMetro}
                onValueChange={(value) => setSelectedMetro(value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select Metro Area" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Metro Areas</SelectItem>
                  {metros.map((metro) => (
                    <SelectItem key={metro} value={metro}>
                      {metro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedState}
                onValueChange={(value) => setSelectedState(value)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All States</SelectItem>
                  {states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="text"
                placeholder="ZIP Code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="h-12"
                maxLength={5}
              />

              <Select
                value={radius.toString()}
                onValueChange={(value) => setRadius(parseInt(value))}
                disabled={!zipCode}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Radius" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 miles</SelectItem>
                  <SelectItem value="10">10 miles</SelectItem>
                  <SelectItem value="25">25 miles</SelectItem>
                  <SelectItem value="50">50 miles</SelectItem>
                  <SelectItem value="100">100 miles</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="h-12 bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {/* Advanced Filters */}
            <details className="border rounded-lg">
              <summary className="cursor-pointer px-4 py-3 font-medium hover:bg-muted/50 transition-colors">
                Advanced Filters
              </summary>
              <div className="p-4 space-y-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Certification Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Certification Type</label>
                    <Select
                      value={certificationType}
                      onValueChange={(value) => setCertificationType(value === "all" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any Certification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Certification</SelectItem>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                        <SelectItem value="Conference">Conference</SelectItem>
                        <SelectItem value="Community">Community</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Proficiency Level */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Proficiency Level</label>
                    <Select
                      value={proficiencyLevel}
                      onValueChange={(value) => setProficiencyLevel(value === "all" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Level</SelectItem>
                        <SelectItem value="Native">Native</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Years of Experience */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Years of Experience: {minExperience} - {maxExperience}</label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={minExperience}
                        onChange={(e) => setMinExperience(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={maxExperience}
                        onChange={(e) => setMaxExperience(parseInt(e.target.value))}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Hourly Rate */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hourly Rate: ${minRate} - ${maxRate}</label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="10"
                        value={minRate}
                        onChange={(e) => setMinRate(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="10"
                        value={maxRate}
                        onChange={(e) => setMaxRate(parseInt(e.target.value))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </details>

            {/* Active Filters & Clear */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex flex-wrap gap-2">
                  {appliedFilters.query && (
                    <Badge variant="secondary">Search: {appliedFilters.query}</Badge>
                  )}
                  {appliedFilters.sourceLanguage && (
                    <Badge variant="secondary">Source: {appliedFilters.sourceLanguage}</Badge>
                  )}
                  {appliedFilters.targetLanguage && (
                    <Badge variant="secondary">Target: {appliedFilters.targetLanguage}</Badge>
                  )}
                  {appliedFilters.metro && (
                    <Badge variant="secondary">Metro: {appliedFilters.metro}</Badge>
                  )}
                  {appliedFilters.state && (
                    <Badge variant="secondary">State: {appliedFilters.state}</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear All
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Results Section */}
      <section className="container max-w-7xl mx-auto py-12 px-4">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Searching...
                </span>
              ) : (
                <span>
                  {totalResults} Interpreter{totalResults !== 1 ? "s" : ""} Found
                </span>
              )}
            </h2>
            {totalResults > 0 && (
              <p className="text-muted-foreground">
                Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalResults)} of {totalResults}
              </p>
            )}
          </div>
          {totalResults > 0 && (
            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  {appliedFilters.zipCode && <SelectItem value="distance">Distance</SelectItem>}
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">{sortBy === "rating" ? "Low to High" : "Ascending"}</SelectItem>
                  <SelectItem value="desc">{sortBy === "rating" ? "High to Low" : "Descending"}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showMap ? "default" : "outline"}
                onClick={() => setShowMap(!showMap)}
              >
                <Map className="w-4 h-4 mr-2" />
                {showMap ? "List View" : "Map View"}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCSV}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export to CSV
            </Button>
            </div>
          )}
        </div>

        {/* Interpreter Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : interpretersWithLanguages.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No interpreters found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search filters or clearing them to see more results
              </p>
              {hasActiveFilters && (
                <Button onClick={handleClearFilters}>Clear All Filters</Button>
              )}
            </CardContent>
          </Card>
        ) : showMap ? (
          <InterpreterMap 
            interpreters={interpretersWithLanguages} 
            userLocation={userLocation || undefined}
            radiusMiles={appliedFilters.zipCode ? appliedFilters.radius : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {interpretersWithLanguages.map((interpreter) => (
                <Link key={interpreter.id} href={`/interpreter/${interpreter.id}`}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {interpreter.firstName} {interpreter.lastName}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {(interpreter as any).isVetted && (
                            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold text-xs shadow-md">
                              ⭐ Vetted
                            </Badge>
                          )}
                          {(interpreter as any).approvalStatus === 'approved' && !(interpreter as any).isVetted && (
                            <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                              ✓ Verified
                            </Badge>
                          )}
                          {(interpreter as any).isAvailable !== undefined && (
                            <Badge 
                              variant={(interpreter as any).isAvailable ? "default" : "secondary"}
                              className={(interpreter as any).isAvailable ? "bg-green-500 hover:bg-green-600" : "bg-gray-400"}
                            >
                              {(interpreter as any).isAvailable ? "Available" : "Busy"}
                            </Badge>
                          )}
                          {/* FavoriteButton removed to prevent OAuth signup */}
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {interpreter.city}, {interpreter.state}
                        {interpreter.metro && (
                          <span className="text-xs ml-2 text-muted-foreground">
                            ({interpreter.metro})
                          </span>
                        )}
                        {(interpreter as any).distance && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {(interpreter as any).distance} mi
                          </Badge>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Languages */}
                      {interpreter.targetLanguage && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Language
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {interpreter.sourceLanguage || 'English'} → {interpreter.targetLanguage}
                          </Badge>
                        </div>
                      )}

                      {/* Rating */}
                      {(interpreter as any).rating && parseFloat((interpreter as any).rating) > 0 && (
                        <div>
                          <StarRating 
                            rating={parseFloat((interpreter as any).rating)} 
                            size="sm"
                            showNumber={true}
                          />
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="space-y-2 text-sm">
                        {interpreter.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span className="truncate">{interpreter.phone}</span>
                          </div>
                        )}
                        {interpreter.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{interpreter.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Source Badge */}
                      {interpreter.source && (
                        <div className="pt-2 border-t">
                          <Badge variant="outline" className="text-xs">
                            Source: {interpreter.source}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Map View */}
            {interpretersWithLanguages.length > 0 && (
              <div className="mt-12">
                <InterpreterMap interpreters={interpreters} />
              </div>
            )}

            {/* Pagination */}
            {(hasMore || currentPage > 0) && (
              <div className="flex items-center justify-center gap-4 mt-8">
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
          </>
        )}
      </section>
    </div>
  );
}
