import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Heart, MapPin, Languages, Phone, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { FavoriteButton } from "@/components/FavoriteButton";
import { getLoginUrl } from "@/const";

export default function MyFavorites() {
  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery();
  const { data: favorites, isLoading: favoritesLoading, refetch } = trpc.getUserFavorites.useQuery(
    { limit: 100 },
    { enabled: !!user }
  );

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>Please log in to view your favorite interpreters</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Log In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-amber-500 text-white py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/20 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Heart className="w-10 h-10 fill-current" />
            <h1 className="text-4xl md:text-5xl font-bold">My Favorites</h1>
          </div>
          <p className="text-white/90 text-lg mt-2">
            Your saved interpreters for quick access
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {favoritesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !favorites || favorites.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-4">
                Start adding interpreters to your favorites to see them here
              </p>
              <Link href="/">
                <Button>Browse Interpreters</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-muted-foreground">
                {favorites.length} {favorites.length === 1 ? "interpreter" : "interpreters"} saved
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((favorite) => (
                <Link key={favorite.id} href={`/interpreter/${favorite.interpreterId}`}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {favorite.firstName} {favorite.lastName}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {favorite.isAvailable !== undefined && (
                            <Badge 
                              variant={favorite.isAvailable ? "default" : "secondary"}
                              className={favorite.isAvailable ? "bg-green-500 hover:bg-green-600" : "bg-gray-400"}
                            >
                              {favorite.isAvailable ? "Available" : "Busy"}
                            </Badge>
                          )}
                          <FavoriteButton 
                            interpreterId={favorite.interpreterId} 
                            initialIsFavorited={true}
                          />
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {favorite.city}, {favorite.state}
                        {favorite.metro && (
                          <span className="text-xs ml-2 text-muted-foreground">
                            ({favorite.metro})
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {favorite.sourceLanguage} → {favorite.targetLanguage}
                        </span>
                      </div>

                      {favorite.rating !== null && parseFloat(favorite.rating as any) > 0 && (
                        <div className="flex items-center gap-2">
                          <StarRating rating={parseFloat(favorite.rating as any)} size="sm" />
                          <span className="text-sm text-muted-foreground">
                            ({parseFloat(favorite.rating as any).toFixed(1)})
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {favorite.phone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Mail className="w-4 h-4" />
                          {favorite.email}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
