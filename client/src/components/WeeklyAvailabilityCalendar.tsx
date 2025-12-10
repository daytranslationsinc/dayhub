import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TimeSlot {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface WeeklyAvailabilityCalendarProps {
  interpreterId: number;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? "00" : "30";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  const value = `${String(hour).padStart(2, "0")}:${minute}`;
  const label = `${displayHour}:${minute} ${ampm}`;
  return { value, label };
});

export function WeeklyAvailabilityCalendar({ interpreterId }: WeeklyAvailabilityCalendarProps) {
  const [editingSlot, setEditingSlot] = useState<Partial<TimeSlot>>({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
  });

  const utils = trpc.useUtils();
  const { data: slots = [], isLoading } = trpc.getInterpreterAvailability.useQuery({ interpreterId });
  
  const createSlotMutation = trpc.createAvailabilitySlot.useMutation({
    onSuccess: () => {
      utils.getInterpreterAvailability.invalidate({ interpreterId });
      toast.success("Availability slot added");
      setEditingSlot({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add availability slot");
    },
  });

  const deleteSlotMutation = trpc.deleteAvailabilitySlot.useMutation({
    onSuccess: () => {
      utils.getInterpreterAvailability.invalidate({ interpreterId });
      toast.success("Availability slot removed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove availability slot");
    },
  });

  const handleAddSlot = () => {
    if (!editingSlot.dayOfWeek && editingSlot.dayOfWeek !== 0) {
      toast.error("Please select a day");
      return;
    }
    if (!editingSlot.startTime || !editingSlot.endTime) {
      toast.error("Please select start and end times");
      return;
    }
    if (editingSlot.startTime >= editingSlot.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    createSlotMutation.mutate({
      interpreterId,
      dayOfWeek: editingSlot.dayOfWeek,
      startTime: editingSlot.startTime,
      endTime: editingSlot.endTime,
    });
  };

  const handleDeleteSlot = (slotId: number) => {
    deleteSlotMutation.mutate({ slotId });
  };

  // Group slots by day of week
  const slotsByDay = DAYS_OF_WEEK.map((day) => ({
    ...day,
    slots: slots.filter((slot: any) => slot.dayOfWeek === day.value),
  }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Availability</CardTitle>
          <CardDescription>Loading availability schedule...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Weekly Availability
        </CardTitle>
        <CardDescription>
          Set your recurring available time slots for each day of the week
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Slot Form */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <h3 className="font-semibold mb-3">Add Availability Slot</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              value={String(editingSlot.dayOfWeek)}
              onValueChange={(value) => setEditingSlot({ ...editingSlot, dayOfWeek: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={String(day.value)}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={editingSlot.startTime}
              onValueChange={(value) => setEditingSlot({ ...editingSlot, startTime: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Start time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={time.value} value={time.value}>
                    {time.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={editingSlot.endTime}
              onValueChange={(value) => setEditingSlot({ ...editingSlot, endTime: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="End time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={time.value} value={time.value}>
                    {time.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleAddSlot} disabled={createSlotMutation.isPending} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Slot
            </Button>
          </div>
        </div>

        {/* Weekly Calendar View */}
        <div className="space-y-3">
          <h3 className="font-semibold">Current Schedule</h3>
          {slotsByDay.map((day) => (
            <div key={day.value} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{day.label}</span>
                {day.slots.length === 0 && (
                  <span className="text-xs text-muted-foreground">No availability</span>
                )}
              </div>
              {day.slots.length > 0 && (
                <div className="space-y-2">
                  {day.slots.map((slot: any) => {
                    const startTime = TIME_OPTIONS.find((t) => t.value === slot.startTime)?.label || slot.startTime;
                    const endTime = TIME_OPTIONS.find((t) => t.value === slot.endTime)?.label || slot.endTime;
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between bg-primary/10 rounded px-3 py-2"
                      >
                        <span className="text-sm">
                          {startTime} - {endTime}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSlot(slot.id)}
                          disabled={deleteSlotMutation.isPending}
                          className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {slots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No availability slots set yet</p>
            <p className="text-sm">Add your first slot above to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
