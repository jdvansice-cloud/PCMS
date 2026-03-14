"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { productSchema, type ProductFormData } from "@/lib/validators/product";

const PAGE_SIZE = 20;

export async function getProducts(search?: string, page: number = 1) {
  const { organizationId } = await getCurrentUser();

  const where = {
    organizationId,
    isActive: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            { barcode: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export async function getProduct(id: string) {
  const { organizationId } = await getCurrentUser();
  return prisma.product.findFirst({ where: { id, organizationId } });
}

export async function createProduct(data: ProductFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const product = await prisma.product.create({
    data: {
      organizationId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      sku: parsed.data.sku || null,
      barcode: parsed.data.barcode || null,
      category: parsed.data.category,
      price: parseFloat(parsed.data.price),
      cost: parsed.data.cost ? parseFloat(parsed.data.cost) : null,
      isTaxExempt: parsed.data.isTaxExempt ?? false,
      stock: parseInt(parsed.data.stock),
      minStock: parsed.data.minStock ? parseInt(parsed.data.minStock) : 0,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/inventory");
  redirect(`/dashboard/inventory/${product.id}`);
}

export async function updateProduct(id: string, data: ProductFormData) {
  const { organizationId } = await getCurrentUser();

  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.product.updateMany({
    where: { id, organizationId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      sku: parsed.data.sku || null,
      barcode: parsed.data.barcode || null,
      category: parsed.data.category,
      price: parseFloat(parsed.data.price),
      cost: parsed.data.cost ? parseFloat(parsed.data.cost) : null,
      isTaxExempt: parsed.data.isTaxExempt ?? false,
      stock: parseInt(parsed.data.stock),
      minStock: parsed.data.minStock ? parseInt(parsed.data.minStock) : 0,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/inventory/${id}`);
  return { success: true };
}

export async function deleteProduct(id: string) {
  const { organizationId } = await getCurrentUser();
  await prisma.product.updateMany({
    where: { id, organizationId },
    data: { isActive: false, updatedAt: new Date() },
  });
  revalidatePath("/dashboard/inventory");
  redirect("/dashboard/inventory");
}
