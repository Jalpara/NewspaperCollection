import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, CUSTOMER_SESSION_COOKIE } from "@/lib/constants";
import type { SessionRole } from "@prisma/client";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  const hashBuffer = Buffer.from(key, "hex");
  const compareBuffer = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, compareBuffer);
}

async function setSession(role: SessionRole, options: { adminUserId?: string; customerId?: number }) {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.authSession.create({
    data: {
      token,
      role,
      expiresAt,
      adminUserId: options.adminUserId,
      customerId: options.customerId,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(role === "admin" ? ADMIN_SESSION_COOKIE : CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function createAdminSession(adminUserId: string) {
  await setSession("admin", { adminUserId });
}

export async function createCustomerSession(customerId: number) {
  await setSession("customer", { customerId });
}

export async function clearSessions() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const customerToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (adminToken) {
    await prisma.authSession.deleteMany({ where: { token: adminToken } });
    cookieStore.delete(ADMIN_SESSION_COOKIE);
  }

  if (customerToken) {
    await prisma.authSession.deleteMany({ where: { token: customerToken } });
    cookieStore.delete(CUSTOMER_SESSION_COOKIE);
  }
}

async function getSession(cookieName: string, role: SessionRole) {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: { token },
    include: {
      adminUser: true,
      customer: true,
    },
  });

  if (!session || session.role !== role || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

export async function getCurrentAdmin() {
  const session = await getSession(ADMIN_SESSION_COOKIE, "admin");
  return session?.adminUser ?? null;
}

export async function getCurrentCustomer() {
  const session = await getSession(CUSTOMER_SESSION_COOKIE, "customer");
  return session?.customer ?? null;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export async function requireCustomer() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    redirect("/customer/login");
  }

  return customer;
}

export async function issueCustomerOtp(phone: string) {
  const customer = await prisma.customer.findUnique({
    where: { phone },
  });

  if (!customer || !customer.active) {
    throw new Error("Active customer not found for this phone number.");
  }

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.customerOtp.create({
    data: {
      phone,
      code,
      customerId: customer.id,
      expiresAt,
    },
  });

  return { code, customer };
}

export async function verifyCustomerOtp(phone: string, code: string) {
  const otp = await prisma.customerOtp.findFirst({
    where: {
      phone,
      code,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  if (!otp?.customer) {
    throw new Error("Invalid or expired OTP.");
  }

  await prisma.customerOtp.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  await createCustomerSession(otp.customer.id);
  return otp.customer;
}
