import { requireAdmin } from "@/lib/auth";
import { getBillPaidAmount, getPendingAmount } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { AdminShell } from "@/components/admin-shell";
import { PageNotice } from "@/components/page-notice";
import { StatusBadge } from "@/components/status-badge";
import { TransactionEntryDialog } from "@/components/transaction-entry-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdmin();
  const { notice } = await searchParams;

  const [customers, bills, transactions] = await Promise.all([
    prisma.customer.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.bill.findMany({
      include: { transactions: true },
      orderBy: [{ year: "desc" }, { month: "desc" }, { id: "desc" }],
      take: 300,
    }),
    prisma.transaction.findMany({
      include: { customer: true, bill: true },
      orderBy: { timestamp: "desc" },
      take: 100,
    }),
  ]);

  const latestBillIdByCustomer = new Map<number, number>();
  for (const bill of bills) {
    if (!latestBillIdByCustomer.has(bill.customerId)) {
      latestBillIdByCustomer.set(bill.customerId, bill.id);
    }
  }

  const billOptions = bills
    .filter((bill) => latestBillIdByCustomer.get(bill.customerId) === bill.id)
    .map((bill) => {
    const paidAmount = getBillPaidAmount(bill);
    const pendingAmount = getPendingAmount(bill.grandTotal, paidAmount);

    return {
      id: bill.id,
      customerId: bill.customerId,
      month: bill.month,
      year: bill.year,
      grandTotal: bill.grandTotal,
      pendingAmount,
      paidAmount,
      status: bill.status,
    };
    });

  const customerOptions = customers.map((customer) => {
    const customerBills = billOptions.filter((bill) => bill.customerId === customer.id);
    const totalPending = customerBills.reduce((sum, bill) => sum + bill.pendingAmount, 0);
    const openBillCount = customerBills.filter((bill) => bill.pendingAmount > 0).length;

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      totalPending,
      openBillCount,
    };
  });

  return (
    <AdminShell
      title="Transactions"
      description="Record manual payment entries and review bill-linked payment history."
    >
      <PageNotice message={notice} />

      <Card className="app-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="section-title">Latest transactions</CardTitle>
            <CardDescription className="section-copy">Most recent 100 payment events.</CardDescription>
          </div>
          <TransactionEntryDialog
            customers={customerOptions}
            bills={billOptions}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Bill</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.customer.name}</TableCell>
                  <TableCell>{transaction.billId ? `#${transaction.billId}` : "Unlinked"}</TableCell>
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
    </AdminShell>
  );
}
