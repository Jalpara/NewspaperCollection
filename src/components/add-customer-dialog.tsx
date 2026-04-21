"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { saveCustomerAction } from "@/lib/actions";
import { DELIVERY_DAYS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NewspaperOption = {
  id: number;
  name: string;
  basePrice: number;
};

export function AddCustomerDialog({
  newspapers,
}: {
  newspapers: NewspaperOption[];
}) {
  const [query, setQuery] = useState("");

  const filteredNewspapers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return newspapers;
    }

    return newspapers.filter((newspaper) => newspaper.name.toLowerCase().includes(term));
  }, [newspapers, query]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-2xl">Add customer</Button>
      </DialogTrigger>
      <DialogContent className="h-[min(92vh,860px)] max-w-[min(100vw-1rem,72rem)] overflow-hidden rounded-[28px] p-0 sm:h-[min(88vh,860px)] lg:h-[min(88vh,900px)] lg:max-w-[min(100vw-3rem,88rem)] xl:max-w-[min(100vw-5rem,96rem)]">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>Create a new delivery account and optionally assign newspapers immediately.</DialogDescription>
        </DialogHeader>

        <form action={saveCustomerAction} className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[0.78fr_1.22fr]">
          <input type="hidden" name="redirectTo" value="/admin/customers" />

          <div className="flex min-h-0 flex-col border-b border-slate-200 p-4 sm:p-5 lg:border-r lg:border-b-0 lg:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Customer details</p>
              <p className="mt-2 text-sm text-slate-500">Basic identity and address information for the new account.</p>
            </div>

            <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Rajesh Kumar" className="h-12 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" placeholder="9876543210" className="h-12 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flatNo">Flat no</Label>
                <Input id="flatNo" name="flatNo" placeholder="A-302" className="h-12 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buildingName">Building name</Label>
                <Input id="buildingName" name="buildingName" placeholder="Mohite Towers" className="h-12 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" placeholder="House no, area, city" className="h-12 rounded-2xl" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="active" defaultChecked className="size-4 accent-[--color-primary]" />
                Active
              </label>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <Button type="submit" className="h-11 w-full rounded-2xl">Save customer</Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-col p-4 sm:p-5 lg:p-6">
            <div className="space-y-2">
              <Label htmlFor="newspaper-search">Initial subscriptions</Label>
              <p className="text-xs text-slate-500">Search newspapers, select the ones needed, then choose delivery days for each selected paper.</p>
            </div>

            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="newspaper-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search newspaper"
                  className="h-12 rounded-2xl pl-9"
                />
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {filteredNewspapers.length} newspaper{filteredNewspapers.length === 1 ? "" : "s"} available
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {filteredNewspapers.map((newspaper) => (
                <div key={newspaper.id} className="rounded-[22px] border border-slate-200 bg-white p-4">
                  <label className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="subscriptionNewspaperId"
                        value={newspaper.id}
                        className="size-4 accent-[--color-primary]"
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{newspaper.name}</p>
                        <p className="text-sm text-slate-500">{formatCurrency(newspaper.basePrice)} per paper</p>
                      </div>
                    </div>
                  </label>

                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Delivery days</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {DELIVERY_DAYS.map((day) => (
                        <label
                          key={`${newspaper.id}-${day}`}
                          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            name={`deliveryDays_${newspaper.id}`}
                            value={day}
                            className="size-4 accent-[--color-primary]"
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {!filteredNewspapers.length ? (
                <div className="rounded-[22px] border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No newspaper matched your search.
                </div>
              ) : null}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
