import Link from "next/link";
import { ArrowRight, CircleDollarSign, Smartphone, Users } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="app-shell justify-center gap-5 py-6 sm:py-10">
      <section className="app-card p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">{APP_CONFIG.appName}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Smart billing and collections for Mohite Newspaper Agency.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Generate monthly bills, show a clear UPI QR, and mark payments only after manual verification.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="app-card">
          <CardHeader className="space-y-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CircleDollarSign className="size-5" />
            </div>
            <CardTitle className="text-2xl tracking-tight">Admin portal</CardTitle>
            <CardDescription className="text-sm leading-6">
              Customer records, newspapers, monthly bills, outstanding balances, and transaction marking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-slate-400" />
                Manage 2,000+ customers cleanly
              </div>
              <div className="flex items-center gap-2">
                <CircleDollarSign className="size-4 text-slate-400" />
                Generate and track monthly bills
              </div>
            </div>
            <Button asChild className="h-12 w-full rounded-2xl text-base">
              <Link href="/admin/login">
                Open admin portal
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardHeader className="space-y-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Smartphone className="size-5" />
            </div>
            <CardTitle className="text-2xl tracking-tight">Customer portal</CardTitle>
            <CardDescription className="text-sm leading-6">
              Built for phone users to quickly see amount due, scan the QR, and check payment status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm text-slate-600">
              <div>Current bill and previous balance</div>
              <div>Large QR for UPI payment</div>
              <div>Simple payment history</div>
            </div>
            <Button asChild variant="outline" className="h-12 w-full rounded-2xl text-base">
              <Link href="/customer/login">
                Open customer portal
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
