"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saleSchema, type SaleFormData } from "@/lib/validators/sale";
import { getItbmsBreakdown } from "@/lib/utils";

const PAGE_SIZE = 20;

export async function getSales(search?: string, page: number = 1) {
  const { organizationId } = await getCurrentUser();

  const where = {
    organizationId,
    ...(search
      ? {
          OR: [
            { owner: { firstName: { contains: search, mode: "insensitive" as const } } },
            { owner: { lastName: { contains: search, mode: "insensitive" as const } } },
            { saleNumber: isNaN(Number(search)) ? undefined : Number(search) },
          ].filter(Boolean),
        }
      : {}),
  };

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.sale.count({ where }),
  ]);

  return { sales, total, page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getSale(id: string) {
  const { organizationId } = await getCurrentUser();
  return prisma.sale.findFirst({
    where: { id, organizationId },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
      lines: {
        include: {
          product: { select: { id: true, name: true } },
          service: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getPosData() {
  const { organizationId } = await getCurrentUser();

  const [products, services, owners] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, isTaxExempt: true, stock: true, category: true },
    }),
    prisma.service.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true, isTaxExempt: true, type: true },
    }),
    prisma.owner.findMany({
      where: { organizationId },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return { products, services, owners };
}

export async function createSale(data: SaleFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = saleSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // Calculate totals for each line
  const lines = parsed.data.lines.map((line) => {
    const lineAmount = line.unitPrice * line.quantity;
    const breakdown = getItbmsBreakdown(lineAmount, line.isTaxExempt);
    return {
      productId: line.productId || null,
      serviceId: line.serviceId || null,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      isTaxExempt: line.isTaxExempt,
      subtotal: breakdown.subtotal,
      itbms: breakdown.itbms,
      lineTotal: breakdown.total,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0);
  const itbms = lines.reduce((sum, l) => sum + l.itbms, 0);
  const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  // Get next sale number
  const lastSale = await prisma.sale.findFirst({
    where: { organizationId },
    orderBy: { saleNumber: "desc" },
    select: { saleNumber: true },
  });
  const saleNumber = (lastSale?.saleNumber ?? 0) + 1;

  const sale = await prisma.sale.create({
    data: {
      organizationId,
      ownerId: parsed.data.ownerId || null,
      saleNumber,
      subtotal: Math.round(subtotal * 100) / 100,
      itbms: Math.round(itbms * 100) / 100,
      total: Math.round(total * 100) / 100,
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
      lines: {
        create: lines.map((l) => ({
          ...l,
          subtotal: Math.round(l.subtotal * 100) / 100,
          itbms: Math.round(l.itbms * 100) / 100,
          lineTotal: Math.round(l.lineTotal * 100) / 100,
        })),
      },
    },
  });

  // Decrement stock for products
  for (const line of parsed.data.lines) {
    if (line.productId) {
      await prisma.product.update({
        where: { id: line.productId },
        data: { stock: { decrement: line.quantity }, updatedAt: new Date() },
      });
    }
  }

  revalidatePath("/dashboard/pos");
  revalidatePath("/dashboard/inventory");
  redirect(`/dashboard/pos/sales/${sale.id}`);
}
