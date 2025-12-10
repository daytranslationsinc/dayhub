import { useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Languages,
  Award,
  Clock,
  Globe2,
  Loader2,
  ExternalLink,
  Star,
  User,
  Calendar,
  Upload,
} from "lucide-react";
import { StarRating } from "@/components/StarRating";
// import { FavoriteButton } from "@/components/FavoriteButton"; // Removed to prevent OAuth signup
import { FileUpload } from "@/components/FileUpload";
import { WeeklyAvailabilityCalendar } from "@/components/WeeklyAvailabilityCalendar";
import { RequestAvailabilityDialog } from "@/components/RequestAvailabilityDialog";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function InterpreterDetail() {
  const [, params] = useRoute("/interpreter/:id");
  const interpreterId = params?.id ? parseInt(params.id) : 0;
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  const { data: interpreter, isLoading, error } = trpc.getInterpreter.useQuery(
    { id: interpreterId },
    { enabled: interpreterId > 0 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading interpreter profile...</p>
        </div>
      </div>
    );
  }

  if (error || !interpreter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Interpreter Not Found</CardTitle>
            <CardDescription>
              The interpreter you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header with gradient */}
      <div className="bg-brand-gradient py-8 px-4">
        <div className="container max-w-5xl mx-auto">
          <Link href="/">
            <Button variant="secondary" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          </Link>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                {interpreter.firstName} {interpreter.lastName}
              </h1>
              {(interpreter as any).isVetted && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold text-base px-4 py-2 shadow-lg">
                  ⭐ Vetted
                </Badge>
              )}
              {(interpreter as any).isAvailable !== undefined && (
                <Badge 
                  variant={(interpreter as any).isAvailable ? "default" : "secondary"}
                  className={(interpreter as any).isAvailable ? "bg-green-500 hover:bg-green-600 text-lg px-4 py-2" : "bg-gray-400 text-lg px-4 py-2"}
                >
                  {(interpreter as any).isAvailable ? "● Available" : "● Busy"}
                </Badge>
              )}
            </div>
            {/* FavoriteButton removed to prevent OAuth signup */}
          </div>
          <p className="text-white/90 text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {interpreter.city}, {interpreter.state}
            {interpreter.metro && (
              <span className="text-white/70 text-base ml-2">
                • {interpreter.metro}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-5xl mx-auto px-4 py-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Languages Card */}
            <Card className="shadow-lg animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-primary" />
                  Languages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {interpreter.targetLanguage ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Target Language</p>
                      <Badge variant="secondary" className="text-base py-2 px-4">
                        {interpreter.targetLanguage}
                      </Badge>
                    </div>
                    {interpreter.sourceLanguage && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Source Language</p>
                        <Badge variant="outline" className="text-base py-2 px-4">
                          {interpreter.sourceLanguage}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No language specified</p>
                )}
              </CardContent>
            </Card>

            {/* Specialties Card */}
            {interpreter.specialties && interpreter.specialties.length > 0 && (
              <Card className="shadow-lg animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Specialties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {interpreter.specialties.map((specialty: string) => (
                      <Badge key={specialty} variant="outline" className="text-base py-2 px-4">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications Card */}
            {interpreter.certifications && (
              <Card className="shadow-lg animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">{interpreter.certifications}</p>
                </CardContent>
              </Card>
            )}

            {/* Vetted Notes - Special Section for Vetted Interpreters */}
            {(interpreter as any).isVetted && (interpreter as any).vettedNotes && (
              <Card className="shadow-lg animate-slide-up border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background" style={{ animationDelay: "0.25s" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    ⭐ Vetted Interpreter Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap font-medium">{(interpreter as any).vettedNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* Additional Information */}
            {interpreter.notes && (
              <Card className="shadow-lg animate-slide-up" style={{ animationDelay: "0.3s" }}>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{interpreter.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Contact & Actions */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="shadow-lg animate-slide-up sticky top-4" style={{ animationDelay: "0.1s" }}>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Get in touch with this interpreter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone */}
                {interpreter.phone && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      Phone
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-medium flex-1">{interpreter.phone}</p>
                      <Button size="sm" variant="default" asChild>
                        <a href={`tel:${interpreter.phone}`}>
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {interpreter.phone && interpreter.email && <Separator />}

                {/* Email */}
                {interpreter.email && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      Email
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-sm break-all">{interpreter.email}</p>
                      <Button size="sm" variant="outline" asChild className="w-full">
                        <a href={`mailto:${interpreter.email}`}>
                          <Mail className="w-4 h-4 mr-1" />
                          Send Email
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {(!interpreter.phone && !interpreter.email) && (
                  <p className="text-sm text-muted-foreground">
                    No contact information available
                  </p>
                )}

                {/* Request Availability Button */}
                {interpreter.email && (
                  <>
                    <Separator />
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white font-semibold shadow-lg"
                      size="lg"
                      onClick={() => setRequestDialogOpen(true)}
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      Request Availability
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Send an in-person interpretation request
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Request Availability Dialog */}
            <RequestAvailabilityDialog
              open={requestDialogOpen}
              onOpenChange={setRequestDialogOpen}
              interpreter={{
                id: interpreter.id,
                firstName: interpreter.firstName,
                lastName: interpreter.lastName,
                email: interpreter.email,
                sourceLanguage: interpreter.sourceLanguage,
                targetLanguage: interpreter.targetLanguage,
              }}
            />

            {/* Location Card */}
            <Card className="shadow-lg animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">City</p>
                  <p className="font-medium">{interpreter.city}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">State</p>
                  <p className="font-medium">{interpreter.state}</p>
                </div>
                {interpreter.metro && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Metro Area</p>
                    <p className="font-medium">{interpreter.metro}</p>
                  </div>
                )}
                {interpreter.timezone && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Timezone
                    </p>
                    <p className="font-medium">{interpreter.timezone}</p>
                  </div>
                )}
                {interpreter.country && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Globe2 className="w-4 h-4" />
                      Country
                    </p>
                    <p className="font-medium">{interpreter.country}</p>
                  </div>
                )}

                {/* Map Link */}
                {interpreter.lat && interpreter.lng && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    asChild
                  >
                    <a
                      href={`https://www.google.com/maps?q=${interpreter.lat},${interpreter.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on Google Maps
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Source Card */}
            {interpreter.source && (
              <Card className="shadow-lg animate-slide-up" style={{ animationDelay: "0.3s" }}>
                <CardHeader>
                  <CardTitle className="text-base">Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="text-sm">
                    {interpreter.source}
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Profile Media Section */}
        <ProfileMediaSection interpreterId={interpreterId} />

        {/* Weekly Availability Calendar */}
        <div className="mb-8">
          <WeeklyAvailabilityCalendar interpreterId={interpreterId} />
        </div>

        {/* Booking Request Section */}
        <BookingRequestSection interpreterId={interpreterId} interpreterName={`${interpreter.firstName} ${interpreter.lastName}`} />

        {/* Reviews Section */}
        <ReviewsSection interpreterId={interpreterId} />
      </div>
    </div>
  );
}

// Booking Request Section Component
function BookingRequestSection({ interpreterId, interpreterName }: { interpreterId: number; interpreterName: string }) {
  const { data: user } = trpc.auth.me.useQuery();
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBookingMutation = trpc.createBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking request submitted successfully!");
      setScheduledDate("");
      setScheduledTime("");
      setDuration(60);
      setNotes("");
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit booking request");
      setIsSubmitting(false);
    },
  });

  const handleSubmitBooking = async () => {
    if (!user) {
      toast.error("Please log in to book an appointment");
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error("Please select a date and time");
      return;
    }

    setIsSubmitting(true);
    const dateTimeString = `${scheduledDate}T${scheduledTime}:00`;
    createBookingMutation.mutate({
      interpreterId,
      scheduledDate: dateTimeString,
      duration,
      notes,
    });
  };

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="mb-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Request Appointment
          </CardTitle>
          <CardDescription>
            Schedule an appointment with {interpreterName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={minDate}
                    className="w-full h-10 px-3 border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full h-10 px-3 border rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                <textarea
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                  placeholder="Add any special requirements or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {notes.length}/500 characters
                </p>
              </div>
              <Button
                onClick={handleSubmitBooking}
                disabled={isSubmitting || !scheduledDate || !scheduledTime}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Request Appointment
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">Booking feature disabled</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Profile Media Section Component
function ProfileMediaSection({ interpreterId }: { interpreterId: number }) {
  const { data: user } = trpc.auth.me.useQuery();
  const [uploading, setUploading] = useState(false);
  const uploadMutation = trpc.uploadProfilePhoto.useMutation();

  const handleFileUpload = async (file: File, type: 'photo' | 'certification'): Promise<string> => {
    setUploading(true);
    try {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const base64Data = e.target?.result as string;
            const [, base64] = base64Data.split(','); // Remove data:image/png;base64, prefix
            const mimeType = file.type;
            const result = await uploadMutation.mutateAsync({
              interpreterId,
              fileName: file.name,
              fileData: base64,
              mimeType,
            });
            toast.success(`${type === 'photo' ? 'Profile photo' : 'Certification'} uploaded successfully`);
            setUploading(false);
            resolve(result.url || '');
          } catch (error) {
            setUploading(false);
            reject(error);
          }
        };
        reader.onerror = () => {
          setUploading(false);
          reject(new Error('File read failed'));
        };
        reader.readAsDataURL(file);
      });
    } catch (error) {
      setUploading(false);
      toast.error('Upload failed. Please try again.');
      throw error;
    }
  };

  // Only show for logged-in users
  if (!user) return null;

  return (
    <div className="space-y-6 my-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Profile Media
          </CardTitle>
          <CardDescription>
            Upload profile photo and certification documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profile Photo Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile Photo</label>
              <FileUpload
                accept="image/*"
                maxSize={5}
                onUpload={(file) => handleFileUpload(file, 'photo')}
              />
              {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
            </div>

            {/* Certification Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Certification Document</label>
              <FileUpload
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={10}
                onUpload={(file) => handleFileUpload(file, 'certification')}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Reviews Section Component
function ReviewsSection({ interpreterId }: { interpreterId: number }) {
  const { data: user } = trpc.auth.me.useQuery();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: reviews = [], refetch } = trpc.getReviews.useQuery(
    { interpreterId },
    { enabled: interpreterId > 0 }
  );

  const { data: userReview } = trpc.getUserReview.useQuery(
    { interpreterId },
    { enabled: !!user && interpreterId > 0 }
  );

  const submitReviewMutation = trpc.submitReview.useMutation({
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      setRating(0);
      setComment("");
      setIsSubmitting(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to submit review: " + error.message);
      setIsSubmitting(false);
    },
  });

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error("Please log in to submit a review");
      return;
    }

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    submitReviewMutation.mutate({
      interpreterId,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <div className="mt-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Reviews & Ratings
          </CardTitle>
          <CardDescription>
            {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Submit Review Form */}
          {user && !userReview && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              <h3 className="font-semibold">Write a Review</h3>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Your Rating
                </label>
                <StarRating
                  rating={rating}
                  size="lg"
                  showNumber={false}
                  interactive={true}
                  onRatingChange={setRating}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Your Review (Optional)
                </label>
                <textarea
                  className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                  placeholder="Share your experience with this interpreter..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {comment.length}/500 characters
                </p>
              </div>
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmitting || rating === 0}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>
            </div>
          )}

          {userReview && (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                ✓ You have already reviewed this interpreter
              </p>
            </div>
          )}

          {!user && (
            <div className="border rounded-lg p-4 bg-muted/20 text-center">
              <p className="text-sm text-muted-foreground">
                Please log in to write a review
              </p>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-4">
              <Separator />
              <h3 className="font-semibold">All Reviews</h3>
              {reviews.map((review: any) => (
                <div key={review.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {review.userName || "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={review.rating} size="sm" showNumber={false} />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-foreground mt-2">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No reviews yet. Be the first to review!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
