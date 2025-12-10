import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, MessageSquare, Calendar, Star } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = trpc.getStats.useQuery();
  const { data: searchResults } = trpc.searchInterpreters.useQuery({
    limit: 100,
    offset: 0,
  });

  const totalInterpreters = searchResults?.total || 0;
  // Booking stats would go here

  const statCards = [
    {
      title: "Total Interpreters",
      value: totalInterpreters,
      icon: Users,
      description: "Registered interpreters",
      color: "text-blue-600",
    },
    {
      title: "Total Calls",
      value: stats?.totalCalls || 0,
      icon: MessageSquare,
      description: "Call logs recorded",
      color: "text-green-600",
    },
    {
      title: "Metro Areas",
      value: stats?.topMetros?.length || 0,
      icon: Star,
      description: "Coverage areas",
      color: "text-purple-600",
    },
    {
      title: "Active Today",
      value: totalInterpreters,
      icon: Calendar,
      description: "Available interpreters",
      color: "text-orange-600",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of platform statistics and activity
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest platform updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Platform Active</p>
                    <p className="text-xs text-muted-foreground">All systems operational</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{totalInterpreters} Interpreters</p>
                    <p className="text-xs text-muted-foreground">Across {stats?.topMetros?.length || 0} metro areas</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">82+ Languages</p>
                    <p className="text-xs text-muted-foreground">Available for interpretation</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <a
                  href="/admin/interpreters"
                  className="block p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <p className="font-medium">Manage Interpreters</p>
                  <p className="text-xs text-muted-foreground">Review and approve new interpreters</p>
                </a>
                <a
                  href="/admin/reviews"
                  className="block p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <p className="font-medium">Moderate Reviews</p>
                  <p className="text-xs text-muted-foreground">Review flagged content</p>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
