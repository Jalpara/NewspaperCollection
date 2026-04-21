import { notFound } from "next/navigation";
import { createTransactionAction, regenerateBillAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { MONTHLY_DELIVERY_FEE, findNewerBill, generateBillNote, getBillPaidAmount, getBillQrPayload, parseDeliveryDays } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { AdminShell } from "@/components/admin-shell";
import { QrBillCard } from "@/components/qr-bill-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
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

  const newerBill = await findNewerBill(bill.customerId, bill.month, bill.year, bill.id);
  const isSuperseded = Boolean(newerBill);

  const paidAmount = getBillPaidAmount(bill);
  const note = generateBillNote(
    {
      name: bill.customer.name,
      flatNo: bill.customer.flatNo,
      buildingName: bill.customer.buildingName,
    },
    bill.month,
    bill.year,
  );
  const payload = getBillQrPayload({
    customer: {
      name: bill.customer.name,
      flatNo: bill.customer.flatNo,
      buildingName: bill.customer.buildingName,
    },
    month: bill.month,
    year: bill.year,
    grandTotal: bill.grandTotal,
  });

  return (
    <AdminShell
      title={`Bill #${bill.id}`}
      description={
        isSuperseded
          ? `Review charges. This bill has been carried forward into bill #${newerBill?.id} and cannot accept new payments.`
          : "Review charges, show the generated QR, and record transactions for automatic status updates."
      }
    >
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-3xl border-white/80 bg-white/90 shadow-lg shadow-slate-200/40">
          <CardHeader>
            <CardTitle>{bill.customer.name}</CardTitle>
            <CardDescription>
              Customer #{bill.customerId} | {bill.month}/{bill.year}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-4">
                <span>Status</span>
                <StatusBadge status={bill.status} />
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
                <span>Grand total</span>
                <strong>{formatCurrency(bill.grandTotal)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Paid so far</span>
                <strong>{formatCurrency(paidAmount)}</strong>
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
            </div>

            <form action={regenerateBillAction}>
              <input type="hidden" name="billId" value={bill.id} />
              <Button type="submit" variant="outline" className="rounded-full">
                Regenerate bill totals and QR
              </Button>
            </form>
          </CardContent>
        </Card>

        <QrBillCard payload={payload} amount={bill.grandTotal} note={note} />
      </section>

      <section className="grid gap-6">
        <Card className="rounded-3xl border-white/80 bg-white/90 shadow-lg shadow-slate-200/40">
          <CardHeader>
            <CardTitle>Add transaction</CardTitle>
            <CardDescription>
              {isSuperseded
                ? `This bill has been carried forward into bill #${newerBill?.id} and can no longer accept payment entries.`
                : "Bill status updates automatically from non-cancelled transactions linked to this bill."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuperseded ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                The unpaid amount from this bill is already included in the latest bill. Record any payment on bill #{newerBill?.id} instead.
              </div>
            ) : (
              <form action={createTransactionAction} className="space-y-4">
                <input type="hidden" name="customerId" value={bill.customerId} />
                <input type="hidden" name="billId" value={bill.id} />
                <div className="space-y-2">
                  <Label htmlFor="tx-amount">Amount</Label>
                  <Input id="tx-amount" name="amount" type="number" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx-method">Payment method</Label>
                  <select id="tx-method" name="paymentMethod" defaultValue="upi" className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm">
                    <option value="upi">upi</option>
                    <option value="cash">cash</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx-status">Status</Label>
                  <select id="tx-status" name="status" defaultValue="confirmed" className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm">
                    <option value="recorded">recorded</option>
                    <option value="confirmed">confirmed</option>
                    <option value="pending">pending</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tx-note">Payment note</Label>
                  <Input id="tx-note" name="paymentNote" />
                </div>
                <Button type="submit" className="rounded-full">
                  Save transaction
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-3xl border-white/80 bg-white/90 shadow-lg shadow-slate-200/40">
          <CardHeader>
            <CardTitle>Subscribed newspapers</CardTitle>
            <CardDescription>Charge basis used for this customer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bill.customer.subscriptions.map((subscription) => (
              <div key={subscription.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-slate-900">{subscription.newspaper.name}</p>
                  <p className="text-slate-500">{formatCurrency(subscription.newspaper.basePrice)}</p>
                </div>
                <p className="mt-2 text-slate-600">{parseDeliveryDays(subscription.deliveryDays).join(", ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-white/80 bg-white/90 shadow-lg shadow-slate-200/40">
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>Transactions linked to this bill.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                    <TableCell className="capitalize">{transaction.paymentMethod}</TableCell>
                    <TableCell>
                      <StatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </AdminShell>
  );
}
