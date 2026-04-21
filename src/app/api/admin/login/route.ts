import { NextResponse } from "next/server";
import { createAdminSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminLoginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const payload = adminLoginSchema.parse(await request.json());
    const admin = await prisma.adminUser.findUnique({ where: { username: payload.username } });

    if (!admin || !(await verifyPassword(payload.password, admin.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    await createAdminSession(admin.id);
    return NextResponse.json({ ok: true, admin: { id: admin.id, username: admin.username } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Login failed." }, { status: 400 });
  }
}
