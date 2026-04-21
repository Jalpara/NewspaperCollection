import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { requireCustomer } from "@/lib/auth";
import { MONTHLY_DELIVERY_FEE, generateBillNote, getBillPaidAmount, getBillQrPayload, getPendingAmount, parseDeliveryDays } from "@/lib/billing";
import { APP_CONFIG } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { MonthlyPaymentTracker } from "@/components/monthly-payment-tracker";
import { QrBillCard } from "@/components/qr-bill-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CustomerPortalPage() {
  const customer = await requireCustomer();
  const freshCustomer = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: {
      subscriptions: {
        where: { active: true },
        include: { newspaper: true },
      },
      bills: {
        include: { transactions: true },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      },
      transactions: {
        orderBy: { timestamp: "desc" },
      },
    },
  });

  if (!freshCustomer) {
    return null;
  }

  const currentBill = freshCustomer.bills[0] ?? null;
  const currentBillPaidAmount = currentBill ? getBillPaidAmount(currentBill) : 0;
  const currentBillPendingAmount = currentBill ? getPendingAmount(currentBill.grandTotal, currentBillPaidAmount) : 0;
  const isCurrentBillPaid = currentBill?.status === "paid";
  const currentBillPayload = currentBill
    ? getBillQrPayload({
        customer: {
          name: freshCustomer.name,
          flatNo: freshCustomer.flatNo,
          buildingName: freshCustomer.buildingName,
        },
        month: currentBill.month,
        year: currentBill.year,
        grandTotal: currentBillPendingAmount || currentBill.grandTotal,
      })
    : null;
  const currentBillNote = currentBill
    ? generateBillNote(
        {
          name: freshCustomer.name,
          flatNo: freshCustomer.flatNo,
          buildingName: freshCustomer.buildingName,
        },
        currentBill.month,
        currentBill.year,
      )
    : null;

  return (
    <main className="app-shell gap-4 pb-8">
      <header className="app-card flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{APP_CONFIG.appName}</p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">{freshCustomer.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Customer #{freshCustomer.id} · {freshCustomer.phone}
            </p>
          </div>
          {currentBill ? <StatusBadge status={currentBill.status} /> : null}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-11 flex-1 rounded-2xl">
            <Link href="/">Home</Link>
          </Button>
          <form action={logoutAction} className="flex-1">
            <Button type="submit" variant="outline" className="h-11 w-full rounded-2xl">
              Logout
            </Button>
          </form>
        </div>
      </header>

      {currentBill ? (
        <>
          <section className="app-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {isCurrentBillPaid ? "Latest bill" : "Current bill"}
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{isCurrentBillPaid ? "Bill amount" : "Amount to pay"}</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
                  {formatCurrency(isCurrentBillPaid ? currentBill.grandTotal : currentBillPendingAmount)}
                </p>
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Period</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {currentBill.month}/{currentBill.year}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Newspapers + delivery</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(currentBill.totalAmount)}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Delivery charge</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(MONTHLY_DELIVERY_FEE)}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Paid so far</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(currentBillPaidAmount)}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Previous balance</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(currentBill.previousBalance)}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4 sm:col-span-3">
                <p className="text-sm text-slate-500">Remaining due</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(currentBillPendingAmount)}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4 sm:col-span-3">
                <p className="text-sm text-slate-500">Payment status</p>
                <div className="mt-2">
                  <StatusBadge status={currentBill.status} />
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Bill note</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{currentBillNote ?? currentBill.billNote}</p>
              <p className="mt-3 text-sm text-slate-500">
                {isCurrentBillPaid
                  ? "This bill is fully settled. No payment action is pending for this billing period."
                  : currentBill.status === "partial"
                    ? "A payment has already been recorded. Scan the QR below only for the remaining due amount."
                    : "Pay by scanning the QR below. Payment will show as paid after manual verification."}
              </p>
            </div>

            {isCurrentBillPaid ? (
              <div className="mt-4 rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">All paid</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Everything is paid for this bill.</p>
                <p className="mt-1 text-sm text-slate-600">
                  Payment was marked on {formatDate(currentBill.paidAt)}. Your next bill will appear here after monthly generation.
                </p>
              </div>
            ) : null}
          </section>

          {isCurrentBillPaid ? null : (
            <QrBillCard payload={currentBillPayload ?? currentBill.qrPayload} amount={currentBillPendingAmount || currentBill.grandTotal} note={currentBillNote ?? "Bill payment"} />
          )}
        </>
      ) : (
        <Card className="app-card">
          <CardHeader>
            <CardTitle className="section-title">No current bill</CardTitle>
            <CardDescription className="section-copy">
              Your latest bill will appear here once the admin generates it.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="app-card">
          <CardHeader>
            <CardTitle className="section-title">My newspapers</CardTitle>
            <CardDescription className="section-copy">Active subscriptions and delivery days.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {freshCustomer.subscriptions.map((subscription) => (
              <div key={subscription.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-900">{subscription.newspaper.name}</p>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(subscription.newspaper.basePrice)}</p>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {parseDeliveryDays(subscription.deliveryDays).join(", ")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="app-card">
          <CardHeader>
            <CardTitle className="section-title">Payment history</CardTitle>
            <CardDescription className="section-copy">Manual payments and reconciled entries recorded on your account.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {freshCustomer.transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 capitalize">Method: {transaction.paymentMethod}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {transaction.billId
                        ? `Linked to bill #${transaction.billId}`
                        : "Manual entry not linked to a bill"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{formatDate(transaction.timestamp)}</p>
                  </div>
                  <StatusBadge status={transaction.status} />
                </div>
                {transaction.paymentNote ? <p className="mt-1 text-sm text-slate-500">{transaction.paymentNote}</p> : null}
              </div>
            ))}
            {!freshCustomer.transactions.length ? (
              <div className="rounded-[20px] border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No payment entries have been recorded yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <MonthlyPaymentTracker bills={freshCustomer.bills} />
    </main>
  );
}
