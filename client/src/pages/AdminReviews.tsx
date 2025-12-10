import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "@/components/StarRating";
import { Link } from "wouter";

export default function AdminReviews() {
  const { data: searchResults } = trpc.searchInterpreters.useQuery({
    limit: 50,
    offset: 0,
    sortBy: "rating",
    sortOrder: "desc",
  });

  const interpreters = searchResults?.interpreters || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Review Moderation</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage user reviews
          </p>
        </div>

        <div className="grid gap-4">
          {interpreters.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No reviews found</p>
              </CardContent>
            </Card>
          ) : (
            interpreters.map((interpreter: any) => {
              if (!interpreter.rating || parseFloat(interpreter.rating) === 0) return null;
              
              return (
                <Card key={interpreter.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {interpreter.firstName} {interpreter.lastName}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {interpreter.city}, {interpreter.state}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating rating={parseFloat(interpreter.rating)} />
                        <Badge variant="outline">
                          {parseFloat(interpreter.rating).toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Link href={`/interpreter/${interpreter.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View All Reviews
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
