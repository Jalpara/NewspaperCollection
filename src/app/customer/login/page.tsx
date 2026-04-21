import Link from "next/link";
import { getCurrentCustomer } from "@/lib/auth";
import { CustomerLoginForm } from "@/components/customer-login-form";
import { Button } from "@/components/ui/button";

export default async function CustomerLoginPage() {
  const customer = await getCurrentCustomer();

  return (
    <main className="app-shell max-w-5xl justify-center gap-4 py-6 lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <section className="app-card flex flex-col justify-between gap-6 p-6 sm:p-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Customer login</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            View bill. Scan QR. Check status.
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            This portal is designed for quick phone usage. The latest bill and payment QR are shown first.
          </p>
          <div className="grid gap-3 text-sm text-slate-600">
            <div>1. Login with phone number</div>
            <div>2. See the total amount due</div>
            <div>3. Scan the QR in any UPI app</div>
          </div>
        </div>
        {customer ? (
          <Button asChild className="h-12 rounded-2xl px-5">
            <Link href="/customer">Continue as {customer.name}</Link>
          </Button>
        ) : null}
      </section>
      <CustomerLoginForm />
    </main>
  );
}
