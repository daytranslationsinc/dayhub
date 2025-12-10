import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PasswordProvider, usePassword } from "./contexts/PasswordContext";
import { PasswordLogin } from "./components/PasswordLogin";
import Home from "./pages/Home";
import InterpreterDetail from "./pages/InterpreterDetail";
// import MyBookings from "./pages/MyBookings"; // Removed - requires OAuth
// import MyFavorites from "./pages/MyFavorites"; // Removed - requires OAuth
import { PublicProfile } from "./pages/PublicProfile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminInterpreters from "./pages/AdminInterpreters";
import AdminReviews from "./pages/AdminReviews";
import AdminImport from "./pages/AdminImport";
// import AdminVerification from "./pages/AdminVerification";
import InterpreterLogin from "./pages/InterpreterLogin";
import InterpreterProfile from "./pages/InterpreterProfile";

function ProtectedRouter() {
  const { isAuthenticated } = usePassword();

  if (!isAuthenticated) {
    return <PasswordLogin />;
  }

  return <Router />;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/interpreter/:id" component={InterpreterDetail} />
      {/* MyBookings and MyFavorites routes removed to prevent OAuth signup */}
      <Route path="/profile/:id" component={PublicProfile} />
      {/* Interpreter self-service portal */}
      <Route path="/interpreter-login" component={InterpreterLogin} />
      <Route path="/interpreter-profile" component={InterpreterProfile} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/interpreters" component={AdminInterpreters} />
      <Route path="/admin/reviews" component={AdminReviews} />
      <Route path="/admin/import" component={AdminImport} />
      {/* <Route path="/admin/verification" component={AdminVerification} /> */}
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <PasswordProvider>
          <TooltipProvider>
            <Toaster />
            <ProtectedRouter />
          </TooltipProvider>
        </PasswordProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
