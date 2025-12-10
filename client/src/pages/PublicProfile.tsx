import { useParams, useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Languages, Calendar, DollarSign, Award, Share2, Download } from "lucide-react";
import { StarRating } from "../components/StarRating";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const interpreterId = parseInt(id || "0");
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const { data: interpreter, isLoading } = trpc.getInterpreter.useQuery({
    id: interpreterId,
  });

  const { data: reviews } = trpc.getReviews.useQuery({
    interpreterId,
  });

  // Generate QR code
  useEffect(() => {
    if (qrCanvasRef.current && typeof window !== "undefined") {
      const profileUrl = window.location.href;
      
      QRCode.toCanvas(
        qrCanvasRef.current,
        profileUrl,
        {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );
    }
  }, []);

  const handleShare = async () => {
    const profileUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${interpreter?.firstName} ${interpreter?.lastName} - Interpreter Profile`,
          text: `Check out this interpreter profile`,
          url: profileUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        copyToClipboard(profileUrl);
      }
    } else {
      copyToClipboard(profileUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Profile link copied to clipboard!");
  };

  const downloadQR = () => {
    if (qrCanvasRef.current) {
      const url = qrCanvasRef.current.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `interpreter-${interpreterId}-qr.png`;
      link.href = url;
      link.click();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (!interpreter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Interpreter not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold">
                  {interpreter.firstName} {interpreter.lastName}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={parseFloat(interpreter.rating || "0")} />
                  <span className="text-sm text-gray-600">
                    ({reviews?.length || 0} reviews)
                  </span>
                </div>
                {interpreter.isAvailable && (
                  <Badge className="mt-2 bg-green-500">Available</Badge>
                )}
              </div>
              <Button onClick={handleShare} variant="outline" className="gap-2">
                <Share2 className="w-4 h-4" />
                Share Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-blue-600" />
                <span>
                  {interpreter.sourceLanguage} → {interpreter.targetLanguage}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>
                  {interpreter.city}, {interpreter.state}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>{interpreter.yearsOfExperience} years experience</span>
              </div>
              {interpreter.hourlyRate && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <span>${interpreter.hourlyRate}/hour</span>
                </div>
              )}
              {interpreter.certificationType && (
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span>{interpreter.certificationType}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle>Share This Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <canvas
                  ref={qrCanvasRef}
                  width={200}
                  height={200}
                  className="border-2 border-gray-300 rounded"
                />
                <Button onClick={downloadQR} variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download QR Code
                </Button>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">
                  Share this profile link or scan the QR code:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={window.location.href}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded text-sm"
                  />
                  <Button
                    onClick={() => copyToClipboard(window.location.href)}
                    variant="outline"
                    size="sm"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.map((review: any) => (
                <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={review.rating} />
                    <span className="text-sm text-gray-600">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700">{review.comment}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    - {review.userName}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <CardContent className="py-8 text-center">
            <h3 className="text-2xl font-bold mb-2">Ready to Book?</h3>
            <p className="mb-4">
              Visit the full platform to book an appointment with {interpreter.firstName}
            </p>
            <Button
              onClick={() => (window.location.href = `/interpreter/${interpreterId}`)}
              variant="secondary"
              size="lg"
            >
              View Full Profile & Book
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
