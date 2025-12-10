import { useState } from "react";
import { Heart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "./ui/button";

interface FavoriteButtonProps {
  interpreterId: number;
  initialIsFavorited?: boolean;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
}

export function FavoriteButton({ 
  interpreterId, 
  initialIsFavorited = false,
  size = "sm",
  showLabel = false
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const { data: user } = trpc.auth.me.useQuery();

  const addFavoriteMutation = trpc.addFavorite.useMutation({
    onSuccess: () => {
      setIsFavorited(true);
      toast.success("Added to favorites");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add to favorites");
    },
  });

  const removeFavoriteMutation = trpc.removeFavorite.useMutation({
    onSuccess: () => {
      setIsFavorited(false);
      toast.success("Removed from favorites");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove from favorites");
    },
  });

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent card/link click
    e.stopPropagation();

    if (!user) {
      toast.error("Please log in to save favorites");
      return;
    }

    if (isFavorited) {
      removeFavoriteMutation.mutate({ interpreterId });
    } else {
      addFavoriteMutation.mutate({ interpreterId });
    }
  };

  const isLoading = addFavoriteMutation.isPending || removeFavoriteMutation.isPending;

  return (
    <Button
      variant={isFavorited ? "default" : "outline"}
      size={size}
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`${isFavorited ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
    >
      <Heart 
        className={`w-4 h-4 ${isFavorited ? "fill-current" : ""} ${showLabel ? "mr-2" : ""}`}
      />
      {showLabel && (isFavorited ? "Favorited" : "Add to Favorites")}
    </Button>
  );
}
