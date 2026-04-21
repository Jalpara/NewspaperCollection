import Link from "next/link";
import { headers } from "next/headers";
import { BillStatus } from "@prisma/client";
import { BILL_STATUSES, MONTH_LABELS } from "@/lib/constants";
import { generateBillsAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { getBillPaidAmount, getPendingAmount } from "@/lib/billing";
import { buildAbsoluteUrl, buildBillWhatsappMessage, buildPublicBillPath, buildWhatsappShareUrl, getRequestOrigin } from "@/lib/bill-links";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { AdminShell } from "@/components/admin-shell";
import { PageNotice } from "@/components/page-notice";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; status?: string; customer?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const month = params.month ? Number(params.month) : undefined;
  const year = params.year ? Number(params.year) : undefined;
  const customer = params.customer?.trim() ?? "";
  const status = params.status && params.status !== "all" ? params.status : undefined;
  const notice = params.notice;
  const numericCustomer = Number(customer);
  const statusFilter =
    status === "open"
      ? { in: ["unpaid", "partial"] as BillStatus[] }
      : (status as "paid" | "unpaid" | "partial" | undefined);

  const [bills, yearRows] = await Promise.all([
    prisma.bill.findMany({
      where: {
        month,
        year,
        status: statusFilter,
        customer: customer
          ? {
              OR: [
                { name: { contains: customer } },
                { phone: { contains: customer } },
                ...(Number.isNaN(numericCustomer) ? [] : [{ id: numericCustomer }]),
              ],
            }
          : undefined,
      },
      include: {
        customer: true,
        transactions: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { id: "desc" }],
    }),
    prisma.bill.findMany({
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    }),
  ]);
  const origin = getRequestOrigin(await headers());

  const rows = bills.map((bill) => {
    const paidAmount = getBillPaidAmount(bill);
    const pendingAmount = getPendingAmount(bill.grandTotal, paidAmount);
    const publicBillUrl = buildAbsoluteUrl(buildPublicBillPath(bill.id), origin);
    const whatsappUrl = buildWhatsappShareUrl(
      bill.customer.phone,
      buildBillWhatsappMessage({
        customerName: bill.customer.name,
        billId: bill.id,
        month: bill.month,
        year: bill.year,
        grandTotal: bill.grandTotal,
        pendingAmount,
        status: bill.status,
        billUrl: publicBillUrl,
      }),
    );

    return {
      ...bill,
      paidAmount,
      pendingAmount,
      publicBillUrl,
      whatsappUrl,
    };
  });

  const totalGrand = rows.reduce((sum, bill) => sum + bill.grandTotal, 0);
  const totalPending = rows.reduce((sum, bill) => sum + bill.pendingAmount, 0);
  const openCount = rows.filter((bill) => bill.pendingAmount > 0).length;
  const paidCount = rows.filter((bill) => bill.status === "paid").length;
  const now = new Date();

  const clearFiltersHref = "/admin/bills";
  const exportHref = `/api/admin/bills/export${month || year || status ? `?${new URLSearchParams({
    ...(month ? { month: String(month) } : {}),
    ...(year ? { year: String(year) } : {}),
    ...(status && status !== "open" ? { status } : {}),
  }).toString()}` : ""}`;
  const years = yearRows.map((row) => row.year);
  const quickFilters = [
    { label: "All bills", href: "/admin/bills", active: !status && !month && !year && !customer },
    { label: "Open bills", href: `/admin/bills?${new URLSearchParams({ ...(month ? { month: String(month) } : {}), ...(year ? { year: String(year) } : {}), ...(customer ? { customer } : {}), status: "open" }).toString()}`, active: status === "open" },
    { label: "Paid", href: `/admin/bills?${new URLSearchParams({ ...(month ? { month: String(month) } : {}), ...(year ? { year: String(year) } : {}), ...(customer ? { customer } : {}), status: "paid" }).toString()}`, active: status === "paid" },
  ];

  return (
    <AdminShell
      title="Bill management"
      description="Bulk-generate monthly bills, filter the list, and open bill-level payment details."
    >
      <PageNotice message={notice} />

      <Card className="app-card">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="section-title">Bills</CardTitle>
                <CardDescription className="section-copy">Filter by month, year, status, or customer.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="h-11 rounded-2xl">Generate bills</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-[28px]">
                  <DialogHeader>
                    <DialogTitle>Generate monthly bills</DialogTitle>
                    <DialogDescription>Create or refresh bills for all active customers.</DialogDescription>
                  </DialogHeader>
                  <form action={generateBillsAction} className="space-y-4">
                    <input type="hidden" name="redirectTo" value="/admin/bills" />
                    <div className="space-y-2">
                      <Label htmlFor="month">Month</Label>
                      <Input id="month" name="month" type="number" min="1" max="12" defaultValue={now.getMonth() + 1} className="h-12 rounded-2xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input id="year" name="year" type="number" min="2024" max="2100" defaultValue={now.getFullYear()} className="h-12 rounded-2xl" />
                    </div>
                    <Button type="submit" className="h-11 w-full rounded-2xl">Generate bills</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <Button key={filter.label} asChild variant={filter.active ? "default" : "outline"} className="rounded-full">
                  <Link href={filter.href}>{filter.label}</Link>
                </Button>
              ))}
            </div>

            <form className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[1.5fr_0.85fr_0.85fr_0.85fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer search</Label>
                <Input id="customer" name="customer" placeholder="Name, phone, or customer ID" defaultValue={customer} className="h-11 rounded-2xl bg-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <select id="month" name="month" defaultValue={month ? String(month) : ""} className="flex h-11 w-full rounded-2xl border border-input bg-white px-3 py-2 text-sm">
                  <option value="">All months</option>
                  {MONTH_LABELS.slice(1).map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <select id="year" name="year" defaultValue={year ? String(year) : ""} className="flex h-11 w-full rounded-2xl border border-input bg-white px-3 py-2 text-sm">
                  <option value="">All years</option>
                  {years.map((itemYear) => (
                    <option key={itemYear} value={itemYear}>
                      {itemYear}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" defaultValue={status ?? ""} className="flex h-11 w-full rounded-2xl border border-input bg-white px-3 py-2 text-sm">
                  <option value="">All statuses</option>
                  <option value="open">Open only</option>
                  {BILL_STATUSES.map((itemStatus) => (
                    <option key={itemStatus} value={itemStatus}>
                      {itemStatus}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col justify-end gap-2 sm:flex-row xl:flex-col">
                <Button type="submit" className="h-11 rounded-2xl">
                  Apply
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-2xl">
                  <Link href={clearFiltersHref}>Clear</Link>
                </Button>
              </div>
            </form>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Filtered bills</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{rows.length}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Open bills</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{openCount}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Total value</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(totalGrand)}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Pending amount</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(totalPending)}</p>
                <p className="mt-1 text-xs text-slate-500">{paidCount} fully paid in this view</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button asChild variant="outline" className="rounded-full">
                <Link href={exportHref}>Export CSV</Link>
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>#{bill.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{bill.customer.name}</p>
                        <p className="text-xs text-slate-500">{bill.customer.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {bill.month}/{bill.year}
                    </TableCell>
                    <TableCell>{formatCurrency(bill.grandTotal)}</TableCell>
                    <TableCell>{formatCurrency(bill.pendingAmount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={bill.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" className="rounded-full">
                          <Link href={bill.whatsappUrl} target="_blank" rel="noreferrer">
                            WhatsApp
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="rounded-full">
                          <Link href={`/admin/bills/${bill.id}`}>Open</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!rows.length ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                No bills matched these filters.
              </div>
            ) : null}
          </CardContent>
      </Card>
    </AdminShell>
  );
}
