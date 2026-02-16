import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState(''); // For Create
  const [companyCode, setCompanyCode] = useState(''); // For Join
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'create') {
        await signUp(email, password, { fullName, companyName, mode: 'create' });
        toast.success('Account and Company created successfully');
      } else {
        await signUp(email, password, { fullName, companyCode, mode: 'join' });
        toast.success('Joined Company successfully');
      }
      navigate('/dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <img src="/logo.png" alt="The Genworks" className="h-10 w-10 object-contain rounded" />
            <CardTitle className="text-2xl font-bold text-primary">The Genworks</CardTitle>
          </div>
          <CardDescription className="text-center">
            {mode === 'create' ? 'Create a new Company Workspace' : 'Join an existing Company Workspace'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" onValueChange={(val) => setMode(val as 'create' | 'join')} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create New</TabsTrigger>
              <TabsTrigger value="join">Join Existing</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <TabsContent value="create" className="space-y-4 data-[state=active]:block data-[state=inactive]:hidden">
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-medium">
                    Company Name
                  </label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required={mode === 'create'}
                  />
                </div>
              </TabsContent>

              <TabsContent value="join" className="space-y-4 data-[state=active]:block data-[state=inactive]:hidden">
                <div className="space-y-2">
                  <label htmlFor="companyCode" className="text-sm font-medium">
                    Company Code
                  </label>
                  <Input
                    id="companyCode"
                    type="text"
                    placeholder="e.g. tm-a1b2c3"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    required={mode === 'join'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ask your administrator for the company invite code.
                  </p>
                </div>
              </TabsContent>

              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Your Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? (mode === 'create' ? 'Creating...' : 'Joining...')
                  : (mode === 'create' ? 'Create & Sign Up' : 'Join & Sign Up')}
              </Button>
            </form>
          </Tabs>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
