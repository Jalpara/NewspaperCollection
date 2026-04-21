import Link from "next/link";
import { deleteCustomerAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin-shell";
import { AddCustomerDialog } from "@/components/add-customer-dialog";
import { PageNotice } from "@/components/page-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; notice?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const notice = params.notice;
  const numericQ = Number(q);
  const searchFilters = [
    { name: { contains: q } },
    { phone: { contains: q } },
    ...(Number.isNaN(numericQ) ? [] : [{ id: numericQ }]),
  ];

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: searchFilters,
        }
      : undefined,
    include: {
      subscriptions: {
        where: { active: true },
      },
      bills: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const newspapers = await prisma.newspaper.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <AdminShell
      title="Customer management"
      description="Create customers, search by name or phone, and open detailed subscription settings."
    >
      <PageNotice message={notice} />

      <Card className="app-card">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="section-title">Customers</CardTitle>
                <CardDescription className="section-copy">Search by customer ID, name, or phone number.</CardDescription>
              </div>
              <AddCustomerDialog newspapers={newspapers} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex flex-col gap-3 sm:flex-row">
              <Input name="q" defaultValue={q} placeholder="Search customer" />
              <Button type="submit" variant="outline" className="rounded-full">
                Search
              </Button>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Subscriptions</TableHead>
                  <TableHead>Current bill</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>#{customer.id}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.subscriptions.length}</TableCell>
                    <TableCell>{customer.bills[0] ? `#${customer.bills[0].id}` : "None"}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button asChild variant="outline" className="rounded-full">
                        <Link href={`/admin/customers/${customer.id}`}>Open</Link>
                      </Button>
                      <form action={deleteCustomerAction} className="inline">
                        <input type="hidden" name="id" value={customer.id} />
                        <input type="hidden" name="redirectTo" value="/admin/customers" />
                        <Button type="submit" variant="ghost" className="rounded-full text-red-600 hover:text-red-700">
                          Delete
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
      </Card>
    </AdminShell>
  );
}
