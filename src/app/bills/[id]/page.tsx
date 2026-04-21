import Link from "next/link";
import { notFound } from "next/navigation";
import { MONTHLY_DELIVERY_FEE, generateBillNote, getBillPaidAmount, getBillQrPayload, getPendingAmount, parseDeliveryDays } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { QrBillCard } from "@/components/qr-bill-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PublicBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bill = await prisma.bill.findUnique({
    where: { id: Number(id) },
    include: {
      customer: {
        include: {
          subscriptions: {
            where: { active: true },
            include: { newspaper: true },
          },
        },
      },
      transactions: {
        orderBy: { timestamp: "desc" },
      },
    },
  });

  if (!bill) {
    notFound();
  }

  const newerBill = await prisma.bill.findFirst({
    where: {
      customerId: bill.customerId,
      OR: [
        { year: { gt: bill.year } },
        {
          year: bill.year,
          month: { gt: bill.month },
        },
      ],
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const paidAmount = getBillPaidAmount(bill);
  const pendingAmount = getPendingAmount(bill.grandTotal, paidAmount);
  const payableAmount = pendingAmount || bill.grandTotal;
  const isSuperseded = Boolean(newerBill);
  const note = generateBillNote(
    {
      name: bill.customer.name,
      flatNo: bill.customer.flatNo,
      buildingName: bill.customer.buildingName,
    },
    bill.month,
    bill.year,
  );
  const payload =
    pendingAmount > 0 && !isSuperseded
      ? getBillQrPayload({
          customer: {
            name: bill.customer.name,
            flatNo: bill.customer.flatNo,
            buildingName: bill.customer.buildingName,
          },
          month: bill.month,
          year: bill.year,
          grandTotal: pendingAmount,
        })
      : bill.qrPayload;

  return (
    <main className="app-shell gap-4 pb-8">
      <header className="app-card flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Public bill</p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950">{bill.customer.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Bill #{bill.id} · {bill.month}/{bill.year}
            </p>
          </div>
          <StatusBadge status={bill.status} />
        </div>
        <Button asChild variant="outline" className="h-11 rounded-2xl">
          <Link href="/">Home</Link>
        </Button>
      </header>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="app-card">
          <CardHeader>
            <CardTitle className="section-title">Bill summary</CardTitle>
            <CardDescription className="section-copy">
              {isSuperseded
                ? "This bill has been carried forward into a newer bill and is no longer payable directly."
                : "Open this link directly to review charges and pay pending dues."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <span>Total bill amount</span>
                <strong>{formatCurrency(bill.grandTotal)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Pending amount</span>
                <strong>{formatCurrency(pendingAmount)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Paid so far</span>
                <strong>{formatCurrency(paidAmount)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Newspapers + delivery</span>
                <strong>{formatCurrency(bill.totalAmount)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Delivery charge</span>
                <strong>{formatCurrency(MONTHLY_DELIVERY_FEE)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Previous balance</span>
                <strong>{formatCurrency(bill.previousBalance)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Generated</span>
                <strong>{formatDate(bill.generatedAt)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Paid at</span>
                <strong>{formatDate(bill.paidAt)}</strong>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Bill note</p>
              <p className="mt-1 text-sm text-slate-600">{note}</p>
              <p className="mt-3 text-sm text-slate-500">
                {isSuperseded
                  ? `A newer bill for ${newerBill?.month}/${newerBill?.year} has already been generated. Any unpaid amount from this bill is included there.`
                  : pendingAmount > 0
                  ? "Scan the QR to pay the remaining due. Payment status updates after manual confirmation."
                  : "This bill is already settled. No payment is pending for this billing period."}
              </p>
              {isSuperseded && newerBill ? (
                <Button asChild variant="outline" className="mt-4 rounded-full">
                  <Link href={`/bills/${newerBill.id}`}>Open latest bill</Link>
                </Button>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Subscribed newspapers</p>
              <div className="mt-3 space-y-3">
                {bill.customer.subscriptions.map((subscription) => (
                  <div key={subscription.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium text-slate-900">{subscription.newspaper.name}</p>
                      <p className="text-slate-500">{formatCurrency(subscription.newspaper.basePrice)}</p>
                    </div>
                    <p className="mt-2 text-slate-600">{parseDeliveryDays(subscription.deliveryDays).join(", ")}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {isSuperseded ? (
          <Card className="app-card">
            <CardHeader>
              <CardTitle className="section-title">Payment moved to latest bill</CardTitle>
              <CardDescription className="section-copy">
                Older unpaid bills cannot be used once a newer month is generated because the due amount rolls forward.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <span>This bill pending</span>
                  <strong>{formatCurrency(pendingAmount)}</strong>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span>Latest bill</span>
                  <strong>#{newerBill?.id}</strong>
                </div>
              </div>
              {newerBill ? (
                <Button asChild className="rounded-2xl">
                  <Link href={`/bills/${newerBill.id}`}>Go to latest bill</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <QrBillCard payload={payload} amount={payableAmount} note={note} />
        )}
      </section>
    </main>
  );
}
