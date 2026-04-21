import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newspaperSchema } from "@/lib/validators";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const newspaper = await prisma.newspaper.findUnique({ where: { id: Number(id) } });
  if (!newspaper) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(newspaper);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const payload = newspaperSchema.parse(await request.json());
    const newspaper = await prisma.newspaper.update({ where: { id: Number(id) }, data: payload });
    return NextResponse.json(newspaper);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.newspaper.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
