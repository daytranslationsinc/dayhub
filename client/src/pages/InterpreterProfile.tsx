import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, Upload, User, MapPin, Languages, Award, DollarSign, FileText, Mic } from "lucide-react";
import { storagePut } from "../../../server/storage";

export default function InterpreterProfile() {
  const [, setLocation] = useLocation();
  const [interpreterId, setInterpreterId] = useState<number | null>(null);
  
  // Get interpreter ID from session storage (set after login)
  useEffect(() => {
    const storedId = sessionStorage.getItem("interpreterId");
    if (storedId) {
      setInterpreterId(parseInt(storedId));
    } else {
      setLocation("/interpreter-login");
    }
  }, [setLocation]);

  // Fetch validation data
  const { data: validationData } = trpc.interpreterAuth.getValidationData.useQuery();

  // Fetch interpreter profile
  const { data: profile, isLoading, refetch } = trpc.interpreterAuth.getProfile.useQuery(
    { interpreterId: interpreterId! },
    { enabled: interpreterId !== null }
  );

  // Form state
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("USA");
  const [zipCode, setZipCode] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("English");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [certifications, setCertifications] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("0");
  const [hourlyRate, setHourlyRate] = useState("");
  const [proficiencyLevel, setProficiencyLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [voiceClipUrl, setVoiceClipUrl] = useState("");

  // File upload states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || "");
      setCity(profile.city || "");
      setState(profile.state || "");
      setCountry(profile.country || "USA");
      setZipCode(profile.zipCode || "");
      setSourceLanguage(profile.sourceLanguage || "English");
      setTargetLanguage(profile.targetLanguage || "");
      setSpecialties(profile.specialties || "");
      setCertifications(profile.certifications || "");
      setYearsOfExperience(profile.yearsOfExperience?.toString() || "0");
      setHourlyRate(profile.hourlyRate?.toString() || "");
      setProficiencyLevel(profile.proficiencyLevel || "");
      setNotes(profile.notes || "");
      setProfilePhotoUrl((profile as any).profilePhotoUrl || "");
      setResumeUrl((profile as any).resumeUrl || "");
      setVoiceClipUrl((profile as any).voiceClipUrl || "");
    }
  }, [profile]);

  const updateProfileMutation = trpc.interpreterAuth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to update profile", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!interpreterId) {
      toast.error("Not logged in");
      return;
    }

    updateProfileMutation.mutate({
      interpreterId,
      phone: phone || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      zipCode: zipCode || undefined,
      sourceLanguage: sourceLanguage || undefined,
      targetLanguage: targetLanguage || undefined,
      specialties: specialties || undefined,
      certifications: certifications || undefined,
      yearsOfExperience: parseInt(yearsOfExperience) || undefined,
      hourlyRate: hourlyRate || undefined,
      proficiencyLevel: proficiencyLevel || undefined,
      profilePhotoUrl: profilePhotoUrl || undefined,
      resumeUrl: resumeUrl || undefined,
      voiceClipUrl: voiceClipUrl || undefined,
      notes: notes || undefined,
    });
  };

  const handleFileUpload = async (file: File, type: 'photo' | 'resume' | 'voice') => {
    const setUploading = type === 'photo' ? setUploadingPhoto : type === 'resume' ? setUploadingResume : setUploadingVoice;
    const setUrl = type === 'photo' ? setProfilePhotoUrl : type === 'resume' ? setResumeUrl : setVoiceClipUrl;

    try {
      setUploading(true);

      // Validate file
      if (type === 'photo' && !file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }
      if (type === 'resume' && !file.type.includes('pdf') && !file.type.includes('doc')) {
        toast.error("Please upload a PDF or Word document");
        return;
      }
      if (type === 'voice' && !file.type.startsWith('audio/')) {
        toast.error("Please upload an audio file");
        return;
      }

      // For voice clips, validate duration (should be around 30 seconds)
      if (type === 'voice') {
        const audio = new Audio(URL.createObjectURL(file));
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            if (audio.duration > 45) {
              toast.error("Voice clip must be 30 seconds or less");
              setUploading(false);
              resolve(false);
              return;
            }
            resolve(true);
          });
        });
      }

      // Read file as buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Upload to S3 via server
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileData: Array.from(buffer),
        }),
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await response.json();
      setUrl(url);
      toast.success(`${type === 'photo' ? 'Photo' : type === 'resume' ? 'Resume' : 'Voice clip'} uploaded successfully!`);
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>Please log in again</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/interpreter-login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
      <div className="container max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Edit Your Profile</CardTitle>
            <CardDescription>
              Update your information to help clients find and book you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                    <Input
                      id="yearsOfExperience"
                      type="number"
                      min="0"
                      max="50"
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {validationData?.countries.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {country === "USA" && (
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {validationData?.usStates.map((s) => (
                            <SelectItem key={s.code} value={s.code}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="10001"
                    />
                  </div>
                </div>
              </div>

              {/* Languages */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Languages className="w-5 h-5" />
                  Languages
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sourceLanguage">Source Language</Label>
                    <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {validationData?.languages.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetLanguage">Target Language *</Label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {validationData?.languages.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proficiencyLevel">Proficiency Level</Label>
                    <Select value={proficiencyLevel} onValueChange={setProficiencyLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {validationData?.proficiencyLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Certifications & Rate */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Certifications & Rate
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="certifications">Certifications</Label>
                    <Input
                      id="certifications"
                      value={certifications}
                      onChange={(e) => setCertifications(e.target.value)}
                      placeholder="Court Certified, Medical Certified"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">
                      <DollarSign className="w-4 h-4 inline" />
                      Hourly Rate
                    </Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="75.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialties">Specialties</Label>
                  <Textarea
                    id="specialties"
                    value={specialties}
                    onChange={(e) => setSpecialties(e.target.value)}
                    placeholder="Legal, Medical, Business"
                    rows={2}
                  />
                </div>
              </div>

              {/* Media Uploads */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Media & Documents
                </h3>

                {/* Profile Photo */}
                <div className="space-y-2">
                  <Label>Profile Photo</Label>
                  {profilePhotoUrl && (
                    <img src={profilePhotoUrl} alt="Profile" className="w-32 h-32 object-cover rounded-lg mb-2" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'photo');
                    }}
                    disabled={uploadingPhoto}
                  />
                  {uploadingPhoto && <p className="text-sm text-muted-foreground">Uploading...</p>}
                </div>

                {/* Resume */}
                <div className="space-y-2">
                  <Label>
                    <FileText className="w-4 h-4 inline mr-1" />
                    Resume / CV
                  </Label>
                  {resumeUrl && (
                    <p className="text-sm text-green-600">✓ Resume uploaded</p>
                  )}
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'resume');
                    }}
                    disabled={uploadingResume}
                  />
                  {uploadingResume && <p className="text-sm text-muted-foreground">Uploading...</p>}
                </div>

                {/* Voice Clip */}
                <div className="space-y-2">
                  <Label>
                    <Mic className="w-4 h-4 inline mr-1" />
                    30-Second Voice Authentication Clip
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Please record: "My name is [Your Name] and I'm recording my voice for Day Translations to show authenticity, accuracy, and a dedication to professionalism."
                  </p>
                  {voiceClipUrl && (
                    <audio src={voiceClipUrl} controls className="w-full" />
                  )}
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'voice');
                    }}
                    disabled={uploadingVoice}
                  />
                  {uploadingVoice && <p className="text-sm text-muted-foreground">Uploading...</p>}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information about your services..."
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
