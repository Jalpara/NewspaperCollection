"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  adminLoginSchema,
  billGenerationSchema,
  customerSchema,
  newspaperSchema,
  subscriptionSchema,
  transactionSchema,
} from "@/lib/validators";
import {
  createAdminSession,
  clearSessions,
  verifyPassword,
  requireAdmin,
} from "@/lib/auth";
import { createOrUpdateMonthlyBill, findNewerBill, generateMonthlyBillsForAll, recalculateBillStatus } from "@/lib/billing";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getStringArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value : ""))
    .filter(Boolean);
}

function buildRedirectUrl(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}notice=${encodeURIComponent(message)}`;
}

export async function logoutAction() {
  await clearSessions();
  redirect("/");
}

export async function adminLoginAction(formData: FormData) {
  const payload = adminLoginSchema.parse({
    username: getString(formData, "username"),
    password: getString(formData, "password"),
  });

  const admin = await prisma.adminUser.findUnique({
    where: { username: payload.username },
  });

  if (!admin || !(await verifyPassword(payload.password, admin.passwordHash))) {
    redirect("/admin/login?error=invalid");
  }

  await createAdminSession(admin.id);
  redirect("/admin");
}

export async function saveNewspaperAction(formData: FormData) {
  await requireAdmin();
  const id = getString(formData, "id");
  const redirectTo = getString(formData, "redirectTo");
  const payload = newspaperSchema.parse({
    name: getString(formData, "name"),
    basePrice: getString(formData, "basePrice"),
    active: formData.get("active") === "on",
  });

  if (id) {
    await prisma.newspaper.update({
      where: { id: Number(id) },
      data: payload,
    });
  } else {
    await prisma.newspaper.create({
      data: payload,
    });
  }

  revalidatePath("/admin/newspapers");
  if (redirectTo) {
    redirect(buildRedirectUrl(redirectTo, id ? "Newspaper updated." : "Newspaper created."));
  }
}

export async function deleteNewspaperAction(formData: FormData) {
  await requireAdmin();
  const redirectTo = getString(formData, "redirectTo");
  await prisma.newspaper.delete({
    where: { id: Number(getString(formData, "id")) },
  });
  revalidatePath("/admin/newspapers");
  if (redirectTo) {
    redirect(buildRedirectUrl(redirectTo, "Newspaper deleted."));
  }
}

export async function saveCustomerAction(formData: FormData) {
  await requireAdmin();
  const id = getString(formData, "id");
  const redirectTo = getString(formData, "redirectTo");
  const selectedNewspaperIds = formData
    .getAll("subscriptionNewspaperId")
    .map((value) => Number(typeof value === "string" ? value : ""))
    .filter((value) => Number.isInteger(value) && value > 0);
  const payload = customerSchema.parse({
    name: getString(formData, "name"),
    phone: getString(formData, "phone"),
    flatNo: getString(formData, "flatNo"),
    buildingName: getString(formData, "buildingName"),
    address: getString(formData, "address"),
    active: formData.get("active") === "on",
  });

  const data = {
    ...payload,
    flatNo: payload.flatNo || null,
    buildingName: payload.buildingName || null,
  };

  if (id) {
    await prisma.customer.update({
      where: { id: Number(id) },
      data,
    });
    revalidatePath(`/admin/customers/${id}`);
  } else {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({ data });

      for (const newspaperId of selectedNewspaperIds) {
        const deliveryDays = getStringArray(formData, `deliveryDays_${newspaperId}`);
        if (!deliveryDays.length) {
          continue;
        }

        const payload = subscriptionSchema.parse({
          customerId: customer.id,
          newspaperId,
          deliveryDays,
          active: true,
        });

        await tx.customerNewspaper.create({
          data: {
            customerId: payload.customerId,
            newspaperId: payload.newspaperId,
            customPrice: null,
            deliveryDays: payload.deliveryDays.join(","),
            active: payload.active,
          },
        });
      }
    });
    revalidatePath("/admin/customers");
  }

  if (redirectTo) {
    redirect(buildRedirectUrl(redirectTo, id ? "Customer updated." : "Customer created."));
  }
}

export async function deleteCustomerAction(formData: FormData) {
  await requireAdmin();
  const redirectTo = getString(formData, "redirectTo");
  await prisma.customer.delete({
    where: { id: Number(getString(formData, "id")) },
  });
  revalidatePath("/admin/customers");
  redirect(buildRedirectUrl(redirectTo || "/admin/customers", "Customer deleted."));
}

export async function saveSubscriptionAction(formData: FormData) {
  await requireAdmin();
  const id = getString(formData, "id");
  const customerId = getString(formData, "customerId");
  const payload = subscriptionSchema.parse({
    customerId,
    newspaperId: getString(formData, "newspaperId"),
    deliveryDays: getStringArray(formData, "deliveryDays"),
    active: formData.get("active") === "on",
  });

  const data = {
    customerId: payload.customerId,
    newspaperId: payload.newspaperId,
    customPrice: null,
    deliveryDays: payload.deliveryDays.join(","),
    active: payload.active,
  };

  if (id) {
    await prisma.customerNewspaper.update({
      where: { id: Number(id) },
      data,
    });
  } else {
    await prisma.customerNewspaper.upsert({
      where: {
        customerId_newspaperId: {
          customerId: payload.customerId,
          newspaperId: payload.newspaperId,
        },
      },
      update: data,
      create: data,
    });
  }

  revalidatePath(`/admin/customers/${customerId}`);
}

export async function deleteSubscriptionAction(formData: FormData) {
  await requireAdmin();
  const id = Number(getString(formData, "id"));
  const customerId = getString(formData, "customerId");
  await prisma.customerNewspaper.delete({ where: { id } });
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function generateBillsAction(formData: FormData) {
  await requireAdmin();
  const redirectTo = getString(formData, "redirectTo");
  const payload = billGenerationSchema.parse({
    month: getString(formData, "month"),
    year: getString(formData, "year"),
  });
  await generateMonthlyBillsForAll(payload.month, payload.year);
  revalidatePath("/admin");
  revalidatePath("/admin/bills");
  if (redirectTo) {
    redirect(buildRedirectUrl(redirectTo, "Monthly bills generated."));
  }
}

export async function createTransactionAction(formData: FormData) {
  await requireAdmin();
  const redirectTo = getString(formData, "redirectTo");
  const payload = transactionSchema.parse({
    customerId: getString(formData, "customerId"),
    billId: getString(formData, "billId") ? Number(getString(formData, "billId")) : null,
    amount: getString(formData, "amount"),
    paymentMethod: getString(formData, "paymentMethod"),
    paymentNote: getString(formData, "paymentNote"),
    timestamp: getString(formData, "timestamp"),
    status: getString(formData, "status"),
  });

  if (payload.billId) {
    const linkedBill = await prisma.bill.findUnique({
      where: { id: payload.billId },
      select: { id: true, customerId: true, month: true, year: true },
    });

    if (!linkedBill || linkedBill.customerId !== payload.customerId) {
      throw new Error("Selected bill does not belong to this customer.");
    }

    const newerBill = await findNewerBill(linkedBill.customerId, linkedBill.month, linkedBill.year, linkedBill.id);
    if (newerBill) {
      throw new Error(`Bill #${linkedBill.id} has already been carried forward into bill #${newerBill.id}. Record the payment on the latest bill instead.`);
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      customerId: payload.customerId,
      billId: payload.billId ?? null,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      paymentNote: payload.paymentNote || null,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      status: payload.status,
    },
  });

  if (transaction.billId) {
    await recalculateBillStatus(transaction.billId);
    revalidatePath(`/admin/bills/${transaction.billId}`);
  }

  revalidatePath("/admin/transactions");
  revalidatePath("/admin/bills");
  revalidatePath("/customer");
  if (redirectTo) {
    redirect(buildRedirectUrl(redirectTo, "Transaction saved."));
  }
}

export async function regenerateBillAction(formData: FormData) {
  await requireAdmin();
  const billId = Number(getString(formData, "billId"));
  const bill = await prisma.bill.findUnique({ where: { id: billId } });
  if (!bill) {
    return;
  }

  await createOrUpdateMonthlyBill(bill.customerId, bill.month, bill.year);
  revalidatePath(`/admin/bills/${billId}`);
  revalidatePath("/admin/bills");
}
