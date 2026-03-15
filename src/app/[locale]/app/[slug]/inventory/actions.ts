"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { productSchema } from "@/lib/validators/product";
import { createAuditLog, diffChanges } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PAGE_SIZE = 20;

export async function getProducts(search?: string, page = 1) {
  const { organizationId } = await getCurrentUser();
  const where: any = {
    organizationId,
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getProduct(id: string) {
  const { organizationId } = await getCurrentUser();
  return prisma.product.findFirst({ where: { id, organizationId } });
}

export async function createProduct(formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const raw = Object.fromEntries(formData);
  const data = { ...raw, isTaxExempt: raw.isTaxExempt === "on" };
  const parsed = productSchema.parse(data);

  const product = await prisma.product.create({
    data: {
      organizationId,
      name: parsed.name,
      description: parsed.description || null,
      sku: parsed.sku || null,
      barcode: parsed.barcode || null,
      category: parsed.category,
      price: parseFloat(parsed.price),
      cost: parsed.cost ? parseFloat(parsed.cost) : null,
      isTaxExempt: parsed.isTaxExempt,
      stock: parseInt(parsed.stock),
      minStock: parseInt(parsed.minStock),
      expirationDate: parsed.expirationDate
        ? new Date(parsed.expirationDate)
        : null,
      batchNumber: parsed.batchNumber || null,
    },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Product",
    entityId: product.id,
  });

  revalidatePath(`/app/${slug}/inventory`);
  redirect(`/app/${slug}/inventory`);
}

export async function updateProduct(id: string, formData: FormData) {
  const { user, organizationId, slug } = await getCurrentUser();

  const raw = Object.fromEntries(formData);
  const data = { ...raw, isTaxExempt: raw.isTaxExempt === "on" };
  const parsed = productSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const current = await prisma.product.findFirst({ where: { id, organizationId } });
  if (!current) return { error: { _form: ["No encontrado"] } };

  const updateData = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    sku: parsed.data.sku || null,
    barcode: parsed.data.barcode || null,
    category: parsed.data.category,
    price: parseFloat(parsed.data.price),
    cost: parsed.data.cost ? parseFloat(parsed.data.cost) : null,
    isTaxExempt: parsed.data.isTaxExempt,
    stock: parseInt(parsed.data.stock),
    minStock: parseInt(parsed.data.minStock),
    expirationDate: parsed.data.expirationDate
      ? new Date(parsed.data.expirationDate)
      : null,
    batchNumber: parsed.data.batchNumber || null,
  };

  await prisma.product.update({ where: { id }, data: updateData });

  const changes = diffChanges(
    current as unknown as Record<string, unknown>,
    updateData as unknown as Record<string, unknown>,
  );
  if (changes) {
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "UPDATE",
      entityType: "Product",
      entityId: id,
      changes,
    });
  }

  revalidatePath(`/app/${slug}/inventory`);
  return { success: true };
}

export async function deleteProduct(id: string) {
  const { user, organizationId, slug } = await getCurrentUser();

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "SOFT_DELETE",
    entityType: "Product",
    entityId: id,
  });

  revalidatePath(`/app/${slug}/inventory`);
  redirect(`/app/${slug}/inventory`);
}
