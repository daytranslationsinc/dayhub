import { useState } from 'react';
import { usePassword } from '@/contexts/PasswordContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export function PasswordLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { authenticate } = usePassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = authenticate(password);
    if (!success) {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.32_0.05_250)] to-[oklch(0.45_0.02_250)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-[oklch(0.32_0.05_250)] rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold">DayHub</CardTitle>
          <CardDescription className="text-lg">
            A hub for searching all interpreters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Enter Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter password to access"
                className="w-full"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg">
              Access DayHub
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>This site is password protected.</p>
            <p className="mt-1">Please contact the administrator for access.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
