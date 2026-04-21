import { deleteNewspaperAction, saveNewspaperAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { AdminShell } from "@/components/admin-shell";
import { PageNotice } from "@/components/page-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function NewspapersPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdmin();
  const { notice } = await searchParams;
  const newspapers = await prisma.newspaper.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <AdminShell title="Newspapers" description="Manage publication names, prices, and active status.">
      <PageNotice message={notice} />

      <Card className="app-card">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="section-title">Publication list</CardTitle>
            <CardDescription className="section-copy">Use the table for updates. Add new records through the dialog.</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-11 rounded-2xl">Add newspaper</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-[28px]">
              <DialogHeader>
                <DialogTitle>Add newspaper</DialogTitle>
                <DialogDescription>Create a new publication and monthly base price.</DialogDescription>
              </DialogHeader>
              <form action={saveNewspaperAction} className="space-y-4">
                <input type="hidden" name="redirectTo" value="/admin/newspapers" />
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="The Hindu" className="h-12 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base price</Label>
                  <Input id="basePrice" name="basePrice" type="number" step="0.01" placeholder="230" className="h-12 rounded-2xl" />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="active" defaultChecked className="size-4 accent-[--color-primary]" />
                  Active
                </label>
                <Button type="submit" className="h-11 w-full rounded-2xl">
                  Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Base price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newspapers.map((newspaper) => (
                <TableRow key={newspaper.id}>
                  <TableCell>#{newspaper.id}</TableCell>
                  <TableCell>
                    <form action={saveNewspaperAction} className="flex flex-col gap-2 md:flex-row md:items-center">
                      <input type="hidden" name="id" value={newspaper.id} />
                      <input type="hidden" name="redirectTo" value="/admin/newspapers" />
                      <Input name="name" defaultValue={newspaper.name} className="h-10 min-w-44 rounded-xl" />
                      <Input
                        name="basePrice"
                        type="number"
                        step="0.01"
                        defaultValue={newspaper.basePrice}
                        className="h-10 w-28 rounded-xl"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" name="active" defaultChecked={newspaper.active} className="size-4 accent-[--color-primary]" />
                        Active
                      </label>
                      <Button type="submit" variant="outline" className="h-10 rounded-xl">
                        Update
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>{formatCurrency(newspaper.basePrice)}</TableCell>
                  <TableCell>{newspaper.active ? "Active" : "Inactive"}</TableCell>
                  <TableCell className="text-right">
                    <form action={deleteNewspaperAction}>
                      <input type="hidden" name="id" value={newspaper.id} />
                      <input type="hidden" name="redirectTo" value="/admin/newspapers" />
                      <Button type="submit" variant="ghost" className="h-10 rounded-xl text-red-600 hover:text-red-700">
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
