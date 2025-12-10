import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, LogIn } from "lucide-react";

export default function InterpreterLogin() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const tokenFromUrl = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Request login link mutation
  const requestLoginMutation = trpc.interpreterAuth.requestLoginLink.useMutation({
    onSuccess: () => {
      setEmailSent(true);
      toast.success("Login link sent!", {
        description: "Check your email for the magic link to log in.",
      });
    },
    onError: (error) => {
      toast.error("Failed to send login link", {
        description: error.message,
      });
    },
  });

  // Verify token mutation
  const verifyTokenMutation = trpc.interpreterAuth.verifyLoginToken.useMutation({
    onSuccess: (data) => {
      // Store interpreter ID in session storage
      sessionStorage.setItem("interpreterId", data.id.toString());
      sessionStorage.setItem("interpreterName", `${data.firstName} ${data.lastName}`);
      
      toast.success(`Welcome back, ${data.firstName}!`);
      setLocation("/interpreter-profile");
    },
    onError: (error) => {
      toast.error("Login failed", {
        description: error.message,
      });
    },
  });

  // Auto-verify token if present in URL
  useEffect(() => {
    if (tokenFromUrl) {
      verifyTokenMutation.mutate({ token: tokenFromUrl });
    }
  }, [tokenFromUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    requestLoginMutation.mutate({ email });
  };

  if (verifyTokenMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Logging you in...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Interpreter Login</CardTitle>
          <CardDescription>
            {emailSent 
              ? "Check your email for the magic link"
              : "Enter your email to receive a login link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <Mail className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">Login link sent!</p>
                <p className="text-sm text-green-700 mt-1">
                  Check your email inbox for the magic link to access your profile.
                </p>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setEmailSent(false)}
              >
                Send to a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Use the email address registered in the DayHub system
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={requestLoginMutation.isPending}
              >
                {requestLoginMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Send Login Link
                  </>
                )}
              </Button>

              <div className="text-center pt-4">
                <Button
                  variant="link"
                  onClick={() => setLocation("/")}
                >
                  Back to Home
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
