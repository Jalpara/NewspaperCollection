import { z } from "zod";
import { DELIVERY_DAYS, PAYMENT_METHODS, TRANSACTION_STATUSES } from "@/lib/constants";

const booleanField = z.preprocess((value) => {
  if (typeof value === "string") {
    return value === "true" || value === "on";
  }

  return Boolean(value);
}, z.boolean());

export const adminLoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const newspaperSchema = z.object({
  name: z.string().min(2),
  basePrice: z.coerce.number().min(0),
  active: booleanField,
});

export const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\d{10}$/),
  flatNo: z.string().trim().optional().or(z.literal("")),
  buildingName: z.string().trim().optional().or(z.literal("")),
  address: z.string().min(5),
  active: booleanField,
});

export const subscriptionSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  newspaperId: z.coerce.number().int().positive(),
  deliveryDays: z.array(z.enum(DELIVERY_DAYS)).min(1),
  active: booleanField,
});

export const billGenerationSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2024).max(2100),
});

export const transactionSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  billId: z.coerce.number().int().positive().nullable().optional(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(PAYMENT_METHODS).default("upi"),
  paymentNote: z.string().optional(),
  timestamp: z.string().optional(),
  status: z.enum(TRANSACTION_STATUSES).default("recorded"),
});

export const otpRequestSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  code: z.string().regex(/^\d{6}$/),
});
