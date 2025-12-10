import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin, FileText, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function MyBookings() {
  const { data: user } = trpc.auth.me.useQuery();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: bookings = [], refetch } = trpc.getUserBookings.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );

  const deleteBookingMutation = trpc.deleteBooking.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      refetch();
      setDeletingId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel booking");
      setDeletingId(null);
    },
  });

  const updateStatusMutation = trpc.updateBookingStatus.useMutation({
    onSuccess: () => {
      toast.success("Booking status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update booking");
    },
  });

  const handleCancelBooking = (bookingId: number) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      setDeletingId(bookingId);
      deleteBookingMutation.mutate({ bookingId });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      confirmed: { variant: "default", label: "Confirmed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
      completed: { variant: "outline", label: "Completed" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container max-w-4xl mx-auto py-12 px-4">
          <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">My Bookings</h2>
              <p className="text-muted-foreground mb-6">Please log in to view your bookings</p>
              <Button asChild>
                <a href={getLoginUrl()}>Log In</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container max-w-6xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Link>
          </Button>
          <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">Manage your interpreter appointments</p>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="pt-6 text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by searching for an interpreter and requesting an appointment
              </p>
              <Button asChild>
                <Link href="/">Browse Interpreters</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-2">
                        <User className="w-5 h-5 text-primary" />
                        {booking.interpreterFirstName} {booking.interpreterLastName}
                      </CardTitle>
                      <CardDescription>
                        Appointment Details
                      </CardDescription>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{formatDate(booking.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{formatTime(booking.scheduledDate)} ({formatDuration(booking.duration)})</span>
                    </div>
                    {booking.interpreterEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={`mailto:${booking.interpreterEmail}`}
                          className="text-primary hover:underline"
                        >
                          {booking.interpreterEmail}
                        </a>
                      </div>
                    )}
                    {booking.interpreterPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <a
                          href={`tel:${booking.interpreterPhone}`}
                          className="text-primary hover:underline"
                        >
                          {booking.interpreterPhone}
                        </a>
                      </div>
                    )}
                  </div>

                  {booking.notes && (
                    <div className="mb-4 p-3 bg-muted rounded-md">
                      <div className="flex items-start gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium mb-1">Notes:</p>
                          <p className="text-muted-foreground">{booking.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={`/interpreter/${booking.interpreterId}`}>
                        View Interpreter
                      </Link>
                    </Button>
                    {booking.status === "pending" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={deletingId === booking.id}
                      >
                        {deletingId === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Cancel Booking
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
