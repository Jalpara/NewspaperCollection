import Link from "next/link";
import { TransactionStatus } from "@prisma/client";
import { getBillPaidAmount, getPendingAmount } from "@/lib/billing";
import { MONTH_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TrackerBill = {
  id: number;
  month: number;
  year: number;
  totalAmount: number;
  previousBalance: number;
  grandTotal: number;
  status: "paid" | "unpaid" | "partial";
  generatedAt: Date;
  paidAt: Date | null;
  transactions: Array<{
    amount: number;
    status: TransactionStatus;
  }>;
};

function getMonthCardStyles(status: "paid" | "unpaid" | "partial" | "empty") {
  if (status === "paid") {
    return {
      card: "border-emerald-200 bg-emerald-50",
      label: "text-emerald-800",
      amount: "text-emerald-950",
    };
  }

  if (status === "partial") {
    return {
      card: "border-amber-200 bg-amber-50",
      label: "text-amber-800",
      amount: "text-amber-950",
    };
  }

  if (status === "unpaid") {
    return {
      card: "border-rose-200 bg-rose-50",
      label: "text-rose-800",
      amount: "text-rose-950",
    };
  }

  return {
    card: "border-slate-200 bg-slate-50",
    label: "text-slate-500",
    amount: "text-slate-900",
  };
}

export function MonthlyPaymentTracker({
  bills,
  actionHref,
  title = "Monthly payment tracker",
  description = "Green means fully paid, red means unpaid, and amber means part payment is still pending.",
}: {
  bills: TrackerBill[];
  actionHref?: (billId: number) => string;
  title?: string;
  description?: string;
}) {
  const billYears = Array.from(new Set(bills.map((bill) => bill.year))).sort((left, right) => right - left);

  return (
    <Card className="app-card">
      <CardHeader>
        <CardTitle className="section-title">{title}</CardTitle>
        <CardDescription className="section-copy">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {billYears.map((year) => {
          const billsForYear = bills.filter((bill) => bill.year === year);
          const billsByMonth = new Map(billsForYear.map((bill) => [bill.month, bill]));

          return (
            <section key={year} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">{year}</h3>
                <p className="text-sm text-slate-500">
                  {billsForYear.length} month{billsForYear.length === 1 ? "" : "s"} billed
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {MONTH_LABELS.slice(1).map((label, index) => {
                  const month = index + 1;
                  const bill = billsByMonth.get(month);

                  if (!bill) {
                    const styles = getMonthCardStyles("empty");

                    return (
                      <div key={`${year}-${month}`} className={`rounded-[20px] border p-4 ${styles.card}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{label}</p>
                            <p className={`mt-1 text-xs font-medium uppercase tracking-[0.14em] ${styles.label}`}>No bill</p>
                          </div>
                        </div>
                        <div className="mt-6">
                          <p className="text-sm text-slate-500">No billing record for this month yet.</p>
                        </div>
                      </div>
                    );
                  }

                  const paidAmount = getBillPaidAmount(bill);
                  const pendingAmount = getPendingAmount(bill.grandTotal, paidAmount);
                  const styles = getMonthCardStyles(bill.status);

                  return (
                    <div key={bill.id} className={`rounded-[20px] border p-4 ${styles.card}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{label}</p>
                          <p className={`mt-1 text-xs font-medium uppercase tracking-[0.14em] ${styles.label}`}>
                            {bill.status === "paid" ? "Paid" : bill.status === "partial" ? "Part paid" : "Not paid"}
                          </p>
                        </div>
                        <StatusBadge status={bill.status} />
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Bill total</p>
                          <p className={`mt-1 text-lg font-semibold ${styles.amount}`}>{formatCurrency(bill.grandTotal)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Current charges</p>
                            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(bill.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Previous balance</p>
                            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(bill.previousBalance)}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Paid</p>
                            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(paidAmount)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Pending</p>
                            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(pendingAmount)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <p className="text-sm text-slate-600">
                          {bill.paidAt ? `Paid on ${formatDate(bill.paidAt)}` : `Generated on ${formatDate(bill.generatedAt)}`}
                        </p>
                        {actionHref ? (
                          <Button asChild variant="outline" className="rounded-full">
                            <Link href={actionHref(bill.id)}>Open bill</Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {!billYears.length ? (
          <div className="rounded-[20px] border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No bills have been generated yet.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
