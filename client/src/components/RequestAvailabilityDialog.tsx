import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Mail, Phone, User, Loader2 } from "lucide-react";

interface RequestAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interpreter: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    sourceLanguage: string | null;
    targetLanguage: string | null;
  };
}

export function RequestAvailabilityDialog({ open, onOpenChange, interpreter }: RequestAvailabilityDialogProps) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [requestedTime, setRequestedTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState(interpreter.sourceLanguage || "English");
  const [targetLanguage, setTargetLanguage] = useState(interpreter.targetLanguage || "Spanish");
  const [notes, setNotes] = useState("");

  const createRequestMutation = trpc.createAvailabilityRequest.useMutation({
    onSuccess: () => {
      toast.success("Request sent successfully!", {
        description: `${interpreter.firstName} ${interpreter.lastName} will receive an email with your request.`,
      });
      onOpenChange(false);
      // Reset form
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setRequestedDate("");
      setRequestedTime("");
      setDuration("60");
      setLocation("");
      setNotes("");
    },
    onError: (error) => {
      toast.error("Failed to send request", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!interpreter.email) {
      toast.error("Cannot send request", {
        description: "This interpreter does not have an email address on file.",
      });
      return;
    }

    if (!clientName || !clientEmail || !requestedDate || !requestedTime || !location) {
      toast.error("Please fill in all required fields");
      return;
    }

    createRequestMutation.mutate({
      interpreterId: interpreter.id,
      interpreterEmail: interpreter.email,
      interpreterName: `${interpreter.firstName} ${interpreter.lastName}`,
      clientName,
      clientEmail,
      clientPhone: clientPhone || undefined,
      requestedDate,
      requestedTime,
      duration: parseInt(duration),
      location,
      sourceLanguage,
      targetLanguage,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request In-Person Interpretation</DialogTitle>
          <DialogDescription>
            Send an availability request to {interpreter.firstName} {interpreter.lastName}. They will receive an email and can accept or decline your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Information */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Your Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">
                  <User className="w-4 h-4 inline mr-1" />
                  Your Name *
                </Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Your Email *
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientPhone">
                <Phone className="w-4 h-4 inline mr-1" />
                Your Phone (Optional)
              </Label>
              <Input
                id="clientPhone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Appointment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestedDate">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date *
                </Label>
                <Input
                  id="requestedDate"
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestedTime">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time *
                </Label>
                <Input
                  id="requestedTime"
                  type="time"
                  value={requestedTime}
                  onChange={(e) => setRequestedTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration *</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">8 hours (full day)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location (Address) *
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="123 Main St, City, State ZIP"
                required
              />
            </div>
          </div>

          {/* Language Details */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Language Requirements</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceLanguage">From Language *</Label>
                <Input
                  id="sourceLanguage"
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetLanguage">To Language *</Label>
                <Input
                  id="targetLanguage"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requirements or additional information..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRequestMutation.isPending}>
              {createRequestMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
