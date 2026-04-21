import { notFound } from "next/navigation";
import { deleteSubscriptionAction, saveCustomerAction, saveSubscriptionAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { countDeliveryDatesForMonth, parseDeliveryDays } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { DELIVERY_DAYS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { AdminShell } from "@/components/admin-shell";
import { MonthlyPaymentTracker } from "@/components/monthly-payment-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: Number(id) },
    include: {
      subscriptions: {
        include: { newspaper: true },
        orderBy: { createdAt: "desc" },
      },
      bills: {
        include: { transactions: true },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const newspapers = await prisma.newspaper.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  const now = new Date();
  const billingMonth = now.getMonth() + 1;
  const billingYear = now.getFullYear();

  return (
    <AdminShell
      title={customer.name}
      description="Update customer information, assign newspapers, and control delivery-day pricing."
    >
      <Card className="rounded-3xl border-white/80 bg-white/90 shadow-lg shadow-slate-200/40">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Customer info</CardTitle>
              <CardDescription>Core details and currently subscribed newspapers.</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="rounded-full">
                  Edit customer profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-[28px]">
                <DialogHeader>
                  <DialogTitle>Customer profile</DialogTitle>
                  <DialogDescription>Update billing and delivery identity for this customer.</DialogDescription>
                </DialogHeader>
                <form action={saveCustomerAction} className="space-y-4">
                  <input type="hidden" name="id" value={customer.id} />
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" defaultValue={customer.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={customer.phone} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flatNo">Flat no</Label>
                    <Input id="flatNo" name="flatNo" defaultValue={customer.flatNo ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buildingName">Building name</Label>
                    <Input id="buildingName" name="buildingName" defaultValue={customer.buildingName ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" name="address" defaultValue={customer.address} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="active" defaultChecked={customer.active} className="size-4 accent-[--color-primary]" />
                    Active
                  </label>
                  <Button type="submit" className="rounded-full">
                    Update customer
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="text-slate-500">Phone</p>
            <p className="mt-1 font-medium text-slate-900">{customer.phone}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="text-slate-500">Flat no</p>
            <p className="mt-1 font-medium text-slate-900">{customer.flatNo ?? "Not added"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p className="text-slate-500">Building name</p>
            <p className="mt-1 font-medium text-slate-900">{customer.buildingName ?? "Not added"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm md:col-span-2">
            <p className="text-slate-500">Address</p>
            <p className="mt-1 font-medium text-slate-900">{customer.address}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm md:col-span-2">
            <p className="text-slate-500">Subscribed newspapers</p>
            <p className="mt-1 font-medium text-slate-900">
              {customer.subscriptions.length
                ? customer.subscriptions.map((subscription) => subscription.newspaper.name).join(", ")
                : "No subscriptions yet"}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6">
        <Card className="rounded-3xl border-white/80 bg-white/90 shadow-lg shadow-slate-200/40">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Subscribed newspapers</CardTitle>
                <CardDescription>
                  Price is per paper. Current month estimate uses weekday occurrences in {billingMonth}/{billingYear}.
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" className="rounded-full">
                    Add subscribed newspaper
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg rounded-[28px]">
                  <DialogHeader>
                    <DialogTitle>Add subscription</DialogTitle>
                    <DialogDescription>Assign newspapers and define exact delivery days for this customer.</DialogDescription>
                  </DialogHeader>
                  <form action={saveSubscriptionAction} className="space-y-4">
                    <input type="hidden" name="customerId" value={customer.id} />
                    <div className="space-y-2">
                      <Label htmlFor="newspaperId">Newspaper</Label>
                      <select
                        id="newspaperId"
                        name="newspaperId"
                        className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select newspaper
                        </option>
                        {newspapers.map((newspaper) => (
                          <option key={newspaper.id} value={newspaper.id}>
                            {newspaper.name} ({formatCurrency(newspaper.basePrice)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery days</Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {DELIVERY_DAYS.map((day) => (
                          <label key={day} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                            <input type="checkbox" name="deliveryDays" value={day} className="size-4 accent-[--color-primary]" />
                            {day}
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="active" defaultChecked className="size-4 accent-[--color-primary]" />
                      Active
                    </label>
                    <Button type="submit" className="rounded-full">
                      Save subscription
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {customer.subscriptions.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Newspaper</TableHead>
                    <TableHead>Base per paper</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>This month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.subscriptions.map((subscription) => {
                    const selectedDays = parseDeliveryDays(subscription.deliveryDays);
                    const monthlyCount = countDeliveryDatesForMonth(subscription.deliveryDays, billingMonth, billingYear);
                    const pricePerPaper = subscription.newspaper.basePrice;

                    return (
                      <TableRow key={subscription.id}>
                        <TableCell className="font-medium">{subscription.newspaper.name}</TableCell>
                        <TableCell>{formatCurrency(subscription.newspaper.basePrice)}</TableCell>
                        <TableCell>{selectedDays.join(", ")}</TableCell>
                        <TableCell>
                          {monthlyCount} x {formatCurrency(pricePerPaper)}
                        </TableCell>
                        <TableCell>{subscription.active ? "Active" : "Inactive"}</TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline" className="rounded-xl">
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg rounded-[28px]">
                              <DialogHeader>
                                <DialogTitle>{subscription.newspaper.name}</DialogTitle>
                                <DialogDescription>Update delivery days and subscription status.</DialogDescription>
                              </DialogHeader>
                              <form action={saveSubscriptionAction} className="space-y-4">
                                <input type="hidden" name="id" value={subscription.id} />
                                <input type="hidden" name="customerId" value={customer.id} />
                                <input type="hidden" name="newspaperId" value={subscription.newspaperId} />
                                <div className="grid grid-cols-2 gap-2">
                                  {DELIVERY_DAYS.map((day) => (
                                    <label
                                      key={day}
                                      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        name="deliveryDays"
                                        value={day}
                                        defaultChecked={selectedDays.includes(day)}
                                        className="size-4 accent-[--color-primary]"
                                      />
                                      {day}
                                    </label>
                                  ))}
                                </div>
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input type="checkbox" name="active" defaultChecked={subscription.active} className="size-4 accent-[--color-primary]" />
                                  Active
                                </label>
                                <div className="flex items-center justify-between gap-3">
                                  <Button type="submit" className="rounded-full">
                                    Update
                                  </Button>
                                </div>
                              </form>
                              <form action={deleteSubscriptionAction}>
                                <input type="hidden" name="id" value={subscription.id} />
                                <input type="hidden" name="customerId" value={customer.id} />
                                <Button type="submit" variant="ghost" className="rounded-full text-red-600 hover:text-red-700">
                                  Remove subscription
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-[20px] border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No subscriptions yet. Use the button above to add the first newspaper.
              </div>
            )}
          </CardContent>
        </Card>

        <MonthlyPaymentTracker bills={customer.bills} actionHref={(billId) => `/admin/bills/${billId}`} />
      </section>
    </AdminShell>
  );
}
