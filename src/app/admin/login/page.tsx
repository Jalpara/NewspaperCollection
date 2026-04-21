import Link from "next/link";
import { adminLoginAction } from "@/lib/actions";
import { getCurrentAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (admin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-8">
        <Card className="w-full rounded-3xl">
          <CardHeader>
            <CardTitle>Already signed in</CardTitle>
            <CardDescription>You can continue directly to the admin portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="rounded-full">
              <Link href="/admin">Open dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const params = await searchParams;

  return (
    <main className="app-shell max-w-xl justify-center py-6">
      <Card className="app-card w-full">
        <CardHeader className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Admin access</p>
          <CardTitle className="text-2xl tracking-tight">Sign in</CardTitle>
          <CardDescription>Use your admin credentials to manage billing operations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={adminLoginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" placeholder="admin" className="h-12 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="admin1234" className="h-12 rounded-2xl" />
            </div>
            {params.error ? <p className="text-sm text-red-600">Invalid username or password.</p> : null}
            <Button type="submit" className="h-12 w-full rounded-2xl text-base">
              Sign in
            </Button>
          </form>
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            Seed defaults: username <strong>admin</strong>, password <strong>admin1234</strong>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
