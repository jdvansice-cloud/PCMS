"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getItbmsBreakdown } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@/generated/prisma/client";

export async function getPosData() {
  const { organizationId } = await getCurrentUser();

  const [products, services, owners] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId, isActive: true, stock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isTaxExempt: true,
        category: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, price: true, isTaxExempt: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.owner.findMany({
      where: { organizationId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return { products, services, owners };
}

type CartItem = {
  productId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isTaxExempt: boolean;
};

export async function createSale(input: {
  ownerId?: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
  notes?: string;
}) {
  const { user, organizationId, slug } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
    select: { id: true },
  });
  if (!branch) throw new Error("No branch");

  // Calculate totals
  let subtotalSum = 0;
  let itbmsSum = 0;
  const lines = input.items.map((item) => {
    const lineTotal = item.unitPrice * item.quantity;
    const { subtotal, itbms } = getItbmsBreakdown(lineTotal, item.isTaxExempt);
    subtotalSum += subtotal;
    itbmsSum += itbms;
    return {
      productId: item.productId || null,
      serviceId: item.serviceId || null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      isTaxExempt: item.isTaxExempt,
      subtotal,
      itbms,
      lineTotal,
    };
  });

  const total = subtotalSum + itbmsSum;

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
      branchId: branch.id,
      ownerId: input.ownerId || null,
      saleNumber,
      subtotal: subtotalSum,
      itbms: itbmsSum,
      total,
      balanceDue: 0,
      status: "COMPLETED",
      notes: input.notes || null,
      lines: { create: lines },
      payments: {
        create: {
          paymentMethod: input.paymentMethod,
          amount: total,
        },
      },
    },
  });

  // Decrement product stock
  for (const item of input.items) {
    if (item.productId) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }
  }

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Sale",
    entityId: sale.id,
    metadata: { saleNumber, total },
  });

  revalidatePath(`/app/${slug}/pos`);
  return { saleId: sale.id, saleNumber };
}

export async function getSales(search?: string, page = 1) {
  const { organizationId } = await getCurrentUser();
  const PAGE_SIZE = 20;

  const where: any = { organizationId };

  if (search) {
    const num = parseInt(search);
    if (!isNaN(num)) {
      where.saleNumber = num;
    } else {
      where.owner = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      };
    }
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        owner: { select: { firstName: true, lastName: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.sale.count({ where }),
  ]);

  return { sales, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getSale(id: string) {
  const { organizationId } = await getCurrentUser();
  return prisma.sale.findFirst({
    where: { id, organizationId },
    include: {
      owner: { select: { firstName: true, lastName: true } },
      lines: true,
      payments: true,
    },
  });
}
