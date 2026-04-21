"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { createTransactionAction } from "@/lib/actions";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CustomerOption = {
  id: number;
  name: string;
  phone: string;
  totalPending: number;
  openBillCount: number;
};

type BillOption = {
  id: number;
  customerId: number;
  month: number;
  year: number;
  grandTotal: number;
  pendingAmount: number;
  paidAmount: number;
  status: "paid" | "unpaid" | "partial";
};

function getBillLabel(bill: BillOption) {
  return `${bill.month}/${bill.year}`;
}

export function TransactionEntryDialog({
  customers,
  bills,
}: {
  customers: CustomerOption[];
  bills: BillOption[];
}) {
  const [query, setQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"recorded" | "confirmed" | "pending" | "cancelled">("recorded");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash">("upi");

  const filteredCustomers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(term) ||
        customer.phone.includes(term) ||
        String(customer.id).includes(term)
      );
    });
  }, [customers, query]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const selectedCustomerBills = useMemo(() => {
    if (!selectedCustomerId) {
      return [];
    }

    return bills
      .filter((bill) => bill.customerId === selectedCustomerId)
      .sort((left, right) => {
        if (left.pendingAmount > 0 && right.pendingAmount === 0) {
          return -1;
        }

        if (left.pendingAmount === 0 && right.pendingAmount > 0) {
          return 1;
        }

        if (left.year !== right.year) {
          return right.year - left.year;
        }

        if (left.month !== right.month) {
          return right.month - left.month;
        }

        return right.id - left.id;
      });
  }, [bills, selectedCustomerId]);

  const effectiveSelectedBillId = useMemo(() => {
    if (!selectedCustomerBills.length) {
      return null;
    }

    if (selectedBillId && selectedCustomerBills.some((bill) => bill.id === selectedBillId)) {
      return selectedBillId;
    }

    return (selectedCustomerBills.find((bill) => bill.pendingAmount > 0) ?? selectedCustomerBills[0]).id;
  }, [selectedBillId, selectedCustomerBills]);

  const selectedBill = useMemo(
    () => selectedCustomerBills.find((bill) => bill.id === effectiveSelectedBillId) ?? null,
    [effectiveSelectedBillId, selectedCustomerBills],
  );

  const amountValue = amount || (selectedBill ? String(selectedBill.pendingAmount || selectedBill.grandTotal) : "");

  function handleCustomerSelect(customerId: number) {
    const customerBills = bills
      .filter((bill) => bill.customerId === customerId)
      .sort((left, right) => {
        if (left.pendingAmount > 0 && right.pendingAmount === 0) {
          return -1;
        }

        if (left.pendingAmount === 0 && right.pendingAmount > 0) {
          return 1;
        }

        if (left.year !== right.year) {
          return right.year - left.year;
        }

        if (left.month !== right.month) {
          return right.month - left.month;
        }

        return right.id - left.id;
      });
    const nextDefaultBill = customerBills.find((bill) => bill.pendingAmount > 0) ?? customerBills[0] ?? null;

    setSelectedCustomerId(customerId);
    setSelectedBillId(nextDefaultBill?.id ?? null);
    setAmount(nextDefaultBill ? String(nextDefaultBill.pendingAmount || nextDefaultBill.grandTotal) : "");
    setStatus(nextDefaultBill ? "confirmed" : "recorded");
    setPaymentMethod("upi");
  }

  function handleBillSelect(billId: number | null) {
    setSelectedBillId(billId);
    const bill = selectedCustomerBills.find((item) => item.id === billId) ?? null;
    setAmount(bill ? String(bill.pendingAmount || bill.grandTotal) : "");
    setStatus(bill ? "confirmed" : "recorded");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-2xl">Add transaction</Button>
      </DialogTrigger>
      <DialogContent className="h-[min(92vh,860px)] max-w-[min(100vw-1rem,72rem)] overflow-hidden rounded-[28px] p-0 sm:h-[min(88vh,860px)] lg:h-[min(88vh,900px)] lg:max-w-[min(100vw-3rem,88rem)] xl:max-w-[min(100vw-5rem,96rem)]">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle>Add manual transaction</DialogTitle>
          <DialogDescription>
            Search the customer, review pending bills, then record the payment against the right bill.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[0.8fr_1.2fr] xl:grid-cols-[0.78fr_1.22fr]">
          <div className="flex min-h-0 flex-col border-b border-slate-200 p-4 sm:p-5 lg:border-r lg:border-b-0 lg:p-6">
            <div className="space-y-2">
              <Label htmlFor="customer-search">Search customer</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="customer-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, phone, or customer ID"
                  className="h-12 rounded-2xl pl-9"
                />
              </div>
            </div>

            <div className="mt-3 rounded-[24px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {filteredCustomers.length} customer{filteredCustomers.length === 1 ? "" : "s"} found
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredCustomers.map((customer) => {
                const isSelected = customer.id === selectedCustomerId;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleCustomerSelect(customer.id)}
                    className={`w-full rounded-[22px] border p-3 text-left transition sm:p-4 ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{customer.name}</p>
                        <p className={`text-xs sm:text-sm ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                          #{customer.id} · {customer.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs uppercase tracking-[0.14em] ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                          Pending
                        </p>
                        <p className="mt-1 text-sm font-semibold">{formatCurrency(customer.totalPending)}</p>
                      </div>
                    </div>
                    <p className={`mt-2 text-xs ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                      {customer.openBillCount} open bill{customer.openBillCount === 1 ? "" : "s"}
                    </p>
                  </button>
                );
              })}
              {!filteredCustomers.length ? (
                <div className="rounded-[22px] border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  No customer matched your search.
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 p-4 sm:p-5 lg:p-6">
            <form action={createTransactionAction} className="flex h-full min-h-0 flex-col">
              <input type="hidden" name="redirectTo" value="/admin/transactions" />
              <input type="hidden" name="customerId" value={selectedCustomerId ?? ""} />
              <input type="hidden" name="billId" value={effectiveSelectedBillId ?? ""} />

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 sm:space-y-5">
                {selectedCustomer ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected customer</p>
                        <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{selectedCustomer.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          #{selectedCustomer.id} · {selectedCustomer.phone}
                        </p>
                      </div>
                      <div className="rounded-[20px] bg-white px-4 py-3 sm:min-w-[160px] sm:text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total pending</p>
                        <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                          {formatCurrency(selectedCustomer.totalPending)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    Select a customer to review pending bills and record a payment.
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label>Available bills</Label>
                    <p className="mt-1 text-xs text-slate-500">Choose the bill to link this payment to.</p>
                  </div>
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => handleBillSelect(null)}>
                    Leave unlinked
                  </Button>
                </div>

                {selectedCustomer ? (
                  <div className="space-y-2">
                    {selectedCustomerBills.map((bill) => {
                      const isSelected = bill.id === effectiveSelectedBillId;
                      return (
                        <button
                          key={bill.id}
                          type="button"
                          onClick={() => handleBillSelect(bill.id)}
                          className={`w-full rounded-[22px] border p-3 text-left transition sm:p-4 ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">
                                Bill #{bill.id} · {getBillLabel(bill)}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                Status: {bill.status} · Paid {formatCurrency(bill.paidAmount)}
                              </p>
                            </div>
                            <div className="sm:text-right">
                              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Pending</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(bill.pendingAmount)}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {!selectedCustomerBills.length ? (
                      <div className="rounded-[22px] border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                        No recent bills found for this customer. You can still record an unlinked transaction.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment method</Label>
                    <select
                      id="paymentMethod"
                      name="paymentMethod"
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as "upi" | "cash")}
                      className="flex h-12 w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-sm"
                      disabled={!selectedCustomer}
                    >
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      value={amountValue}
                      onChange={(event) => setAmount(event.target.value)}
                      className="h-12 rounded-2xl"
                      disabled={!selectedCustomer}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timestamp">Payment time</Label>
                    <Input id="timestamp" name="timestamp" type="datetime-local" className="h-12 rounded-2xl" disabled={!selectedCustomer} />
                  </div>
                </div>

                {selectedBill ? (
                  <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-slate-500">Selected bill</p>
                      <p className="mt-1 font-semibold text-slate-900">#{selectedBill.id} · {getBillLabel(selectedBill)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Bill total</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatCurrency(selectedBill.grandTotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Still pending</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatCurrency(selectedBill.pendingAmount)}</p>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Transaction status</Label>
                    <select
                      id="status"
                      name="status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as "recorded" | "confirmed" | "pending" | "cancelled")}
                      className="flex h-12 w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-sm"
                      disabled={!selectedCustomer}
                    >
                      <option value="recorded">recorded</option>
                      <option value="confirmed">confirmed</option>
                      <option value="pending">pending</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentNote">Payment note</Label>
                  <Input id="paymentNote" name="paymentNote" className="h-12 rounded-2xl" placeholder="Optional note for reconciliation" disabled={!selectedCustomer} />
                </div>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <Button type="submit" className="h-11 w-full rounded-2xl" disabled={!selectedCustomer}>
                  Save transaction
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
