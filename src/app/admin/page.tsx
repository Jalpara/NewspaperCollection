import Link from "next/link";
import { ArrowRight, CircleDollarSign, FileText, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { AdminShell } from "@/components/admin-shell";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillPaidAmount, getMonthLabel } from "@/lib/billing";

function getRecentPeriods(count: number) {
  const now = new Date();
  const periods: Array<{ key: string; month: number; year: number; label: string }> = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    periods.push({
      key: `${year}-${month}`,
      month,
      year,
      label: `${getMonthLabel(month)} ${String(year).slice(-2)}`,
    });
  }

  return periods;
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [customerCount, recentBills] = await Promise.all([
    prisma.customer.count({ where: { active: true } }),
    prisma.bill.findMany({
      include: { transactions: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
  ]);

  const latestBillIdByCustomer = new Map<number, number>();
  for (const bill of recentBills.toSorted((left, right) => {
    if (left.year !== right.year) {
      return right.year - left.year;
    }

    if (left.month !== right.month) {
      return right.month - left.month;
    }

    return right.id - left.id;
  })) {
    if (!latestBillIdByCustomer.has(bill.customerId)) {
      latestBillIdByCustomer.set(bill.customerId, bill.id);
    }
  }

  const latestBills = recentBills.filter((bill) => latestBillIdByCustomer.get(bill.customerId) === bill.id);
  const latestOpenBills = latestBills.filter((bill) => bill.status === "unpaid" || bill.status === "partial");
  const latestPaidBills = latestBills.filter((bill) => bill.status === "paid");
  const latestUnpaidBills = latestBills.filter((bill) => bill.status === "unpaid");

  const outstandingAmount = latestOpenBills.reduce((sum, bill) => {
    const paid = getBillPaidAmount(bill);
    return sum + Math.max(bill.grandTotal - paid, 0);
  }, 0);

  const recentPeriods = getRecentPeriods(6);
  const trendData = recentPeriods.map((period) => {
    const billsForPeriod = recentBills.filter((bill) => bill.month === period.month && bill.year === period.year);
    const billed = billsForPeriod.reduce((sum, bill) => sum + bill.grandTotal, 0);
    const collected = billsForPeriod.reduce(
      (sum, bill) => sum + Math.min(getBillPaidAmount(bill), bill.grandTotal),
      0,
    );
    const outstanding = Math.max(billed - collected, 0);
    const collectionRate = billed > 0 ? (collected / billed) * 100 : 0;
    const openCount = billsForPeriod.filter((bill) => bill.status !== "paid").length;

    return {
      ...period,
      billed,
      collected,
      outstanding,
      collectionRate,
      openCount,
    };
  });
  const maxTrendValue = Math.max(...trendData.map((item) => item.billed), 1);
  const currentPeriod = trendData[trendData.length - 1];
  const averageCollectionRate =
    trendData.reduce((sum, item) => sum + item.collectionRate, 0) / Math.max(trendData.filter((item) => item.billed > 0).length, 1);

  const quickActions = [
    {
      href: "/admin/customers",
      title: "Manage customers",
      copy: "Add customers, update account details, and edit subscriptions.",
      icon: Users,
    },
    {
      href: "/admin/bills",
      title: "Generate bills",
      copy: "Create monthly bills, review totals, and mark them paid.",
      icon: FileText,
    },
    {
      href: "/admin/transactions",
      title: "Record transactions",
      copy: "Record payments and link them to customer bills.",
      icon: CircleDollarSign,
    },
  ];

  return (
    <AdminShell title="Dashboard" description="Quick overview of billing, collection, and admin actions.">
      <Card className="app-card">
        <CardHeader>
          <CardTitle className="section-title">Billing overview</CardTitle>
          <CardDescription className="section-copy">Six-month trend for billed value, collections, and remaining receivables.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">This month billed</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(currentPeriod?.billed ?? 0)}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800">This month collected</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(currentPeriod?.collected ?? 0)}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">This month open bills</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{currentPeriod?.openCount ?? 0}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Avg collection rate</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{averageCollectionRate.toFixed(0)}%</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                Billed
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Collected
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Outstanding
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              {trendData.map((item) => {
                const billedHeight = Math.max((item.billed / maxTrendValue) * 100, item.billed > 0 ? 12 : 0);
                const collectedHeight = item.billed > 0 ? Math.max((item.collected / maxTrendValue) * 100, item.collected > 0 ? 10 : 0) : 0;
                const outstandingHeight = item.billed > 0 ? Math.max((item.outstanding / maxTrendValue) * 100, item.outstanding > 0 ? 10 : 0) : 0;
                const backgroundFill = Math.max(Math.min(item.collectionRate, 100), 0);
                const backgroundTone =
                  item.collectionRate >= 80
                    ? "from-emerald-100/95 via-emerald-50/90 to-white"
                    : item.collectionRate >= 45
                      ? "from-amber-100/95 via-amber-50/85 to-white"
                      : "from-rose-100/95 via-rose-50/85 to-white";

                return (
                  <div key={item.key} className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <div
                      className={`pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t ${backgroundTone} transition-all`}
                      style={{ height: `${backgroundFill}%` }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-white/25 via-transparent to-transparent" />

                    <div className="relative">
                    <div className="flex h-44 items-end justify-center gap-2">
                      <div className="flex w-5 flex-col justify-end rounded-full bg-slate-200/80">
                        <div className="rounded-full bg-slate-800" style={{ height: `${billedHeight}%` }} />
                      </div>
                      <div className="flex w-5 flex-col justify-end rounded-full bg-emerald-100">
                        <div className="rounded-full bg-emerald-500" style={{ height: `${collectedHeight}%` }} />
                      </div>
                      <div className="flex w-5 flex-col justify-end rounded-full bg-amber-100">
                        <div className="rounded-full bg-amber-400" style={{ height: `${outstandingHeight}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 text-center">
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">Collection rate {item.collectionRate.toFixed(0)}%</p>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span>Billed</span>
                        <span className="font-medium text-slate-900">{formatCurrency(item.billed)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Collected</span>
                        <span className="font-medium text-slate-900">{formatCurrency(item.collected)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Outstanding</span>
                        <span className="font-medium text-slate-900">{formatCurrency(item.outstanding)}</span>
                      </div>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[20px] border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm text-emerald-800">Outstanding receivables</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{formatCurrency(outstandingAmount)}</p>
              </div>
              <p className="text-sm text-slate-600">
                Based on {latestOpenBills.length} current open bill{latestOpenBills.length === 1 ? "" : "s"} across all customers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active customers" value={String(customerCount)} description="Live delivery accounts." />
        <MetricCard title="Unpaid bills" value={String(latestUnpaidBills.length)} description="Current bills waiting for payment." />
        <MetricCard title="Paid bills" value={String(latestPaidBills.length)} description="Current bills fully settled." />
        <MetricCard title="Outstanding" value={formatCurrency(outstandingAmount)} description="Amount still to collect." />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="app-card flex min-h-44 flex-col justify-between p-5 transition hover:border-slate-300 hover:shadow-md"
            >
              <div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{action.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{action.copy}</p>
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm font-medium text-emerald-700">
                Open
                <ArrowRight className="size-4" />
              </div>
            </Link>
          );
        })}
      </section>
    </AdminShell>
  );
}
