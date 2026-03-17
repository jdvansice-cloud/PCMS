"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getItbmsBreakdown } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { PaymentMethod, DiscountType } from "@/generated/prisma/client";

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
  discountAmount?: number;
  discountType?: "PERCENTAGE" | "FIXED";
};

export async function createSale(input: {
  ownerId?: string;
  items: CartItem[];
  paymentMethod?: PaymentMethod;
  payments?: {
    method: PaymentMethod;
    amount: number;
    giftCardId?: string;
  }[];
  promotionIds?: string[];
  transactionDiscount?: { type: "PERCENTAGE" | "FIXED"; value: number };
  loyaltyRedeem?: number;
  notes?: string;
  discountedById?: string;
}) {
  const { user, organizationId, slug } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
    select: { id: true },
  });
  if (!branch) throw new Error("No branch");

  // --- a. Build line data with per-line discounts ---
  let subtotalSum = 0;
  let itbmsSum = 0;
  let totalLineDiscounts = 0;

  const lines = input.items.map((item) => {
    const grossLineTotal = item.unitPrice * item.quantity;

    // Per-line discount
    let lineDiscount = 0;
    if (item.discountAmount != null && item.discountType) {
      if (item.discountType === "PERCENTAGE") {
        lineDiscount = grossLineTotal * (item.discountAmount / 100);
      } else {
        lineDiscount = item.discountAmount;
      }
      lineDiscount = Math.min(lineDiscount, grossLineTotal);
    }
    totalLineDiscounts += lineDiscount;

    const discountedLineTotal = grossLineTotal - lineDiscount;
    const { subtotal, itbms } = getItbmsBreakdown(
      discountedLineTotal,
      item.isTaxExempt,
    );
    subtotalSum += subtotal;
    itbmsSum += itbms;

    return {
      productId: item.productId || null,
      serviceId: item.serviceId || null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      isTaxExempt: item.isTaxExempt,
      discountAmount: lineDiscount > 0 ? lineDiscount : null,
      discountType:
        lineDiscount > 0 ? (item.discountType as DiscountType) : null,
      subtotal,
      itbms,
      lineTotal: discountedLineTotal,
    };
  });

  // --- b. Calculate promotion discounts ---
  let totalPromotionDiscount = 0;
  const promotionDiscountMap: { promotionId: string; amount: number }[] = [];

  if (input.promotionIds && input.promotionIds.length > 0) {
    const promotions = await prisma.promotion.findMany({
      where: { id: { in: input.promotionIds }, organizationId, isActive: true },
    });
    const prePromoTotal = subtotalSum + itbmsSum;
    for (const promo of promotions) {
      let discount = 0;
      if (promo.type === "DISCOUNT_PERCENTAGE") {
        discount = prePromoTotal * (Number(promo.value) / 100);
      } else if (promo.type === "DISCOUNT_FIXED") {
        discount = Number(promo.value);
      }
      if (promo.maxDiscount) {
        discount = Math.min(discount, Number(promo.maxDiscount));
      }
      discount = Math.min(discount, prePromoTotal - totalPromotionDiscount);
      totalPromotionDiscount += discount;
      promotionDiscountMap.push({ promotionId: promo.id, amount: discount });
    }
  }

  // --- c. Transaction-level manual discount ---
  let manualDiscount = 0;
  let saleDiscountType: DiscountType | null = null;
  let saleDiscountAmount: number | null = null;

  if (input.transactionDiscount && input.transactionDiscount.value > 0) {
    const afterPromo = subtotalSum + itbmsSum - totalPromotionDiscount;
    if (input.transactionDiscount.type === "PERCENTAGE") {
      manualDiscount = afterPromo * (input.transactionDiscount.value / 100);
    } else {
      manualDiscount = input.transactionDiscount.value;
    }
    manualDiscount = Math.min(manualDiscount, afterPromo);
    saleDiscountType = input.transactionDiscount.type;
    saleDiscountAmount = input.transactionDiscount.value;
  }

  // --- d. Final total ---
  const totalAllDiscounts =
    totalLineDiscounts + totalPromotionDiscount + manualDiscount;
  const total = Math.max(subtotalSum + itbmsSum - totalPromotionDiscount - manualDiscount, 0);

  // --- e. Get next sale number ---
  const lastSale = await prisma.sale.findFirst({
    where: { organizationId },
    orderBy: { saleNumber: "desc" },
    select: { saleNumber: true },
  });
  const saleNumber = (lastSale?.saleNumber ?? 0) + 1;

  // --- f. Build payments, handling backward compatibility ---
  const paymentInputs = input.payments
    ? input.payments
    : input.paymentMethod
      ? [{ method: input.paymentMethod, amount: total }]
      : [];

  if (paymentInputs.length === 0) {
    throw new Error("At least one payment method is required");
  }

  // --- g. Execute in transaction for atomicity ---
  const result = await prisma.$transaction(async (tx) => {
    // Create the sale
    const sale = await tx.sale.create({
      data: {
        organizationId,
        branchId: branch.id,
        ownerId: input.ownerId || null,
        saleNumber,
        subtotal: subtotalSum,
        itbms: itbmsSum,
        discountAmount: totalAllDiscounts > 0 ? totalAllDiscounts : null,
        discountType: saleDiscountType,
        discountedById: input.discountedById || null,
        total,
        balanceDue: 0,
        status: "COMPLETED",
        notes: input.notes || null,
        lines: { create: lines },
      },
    });

    // Create SalePromotion records & increment usageCount
    for (const pd of promotionDiscountMap) {
      await tx.salePromotion.create({
        data: {
          saleId: sale.id,
          promotionId: pd.promotionId,
          discountAmount: pd.amount,
        },
      });
      await tx.promotion.update({
        where: { id: pd.promotionId },
        data: { usageCount: { increment: 1 } },
      });
    }

    // Process each payment
    let loyaltyPaymentAmount = 0;
    let giftCardPaymentAmount = 0;

    for (const payment of paymentInputs) {
      if (payment.method === "GIFT_CARD" && payment.giftCardId) {
        // Validate & debit gift card
        const gc = await tx.giftCard.findUnique({
          where: { id: payment.giftCardId },
        });
        if (!gc) throw new Error("Gift card not found");
        if (gc.status !== "ACTIVE") throw new Error("Gift card is not active");
        if (gc.expiresAt && gc.expiresAt < new Date())
          throw new Error("Gift card has expired");
        if (Number(gc.balance) < payment.amount)
          throw new Error("Insufficient gift card balance");

        const newBalance = Number(gc.balance) - payment.amount;
        await tx.giftCard.update({
          where: { id: gc.id },
          data: {
            balance: newBalance,
            status: newBalance <= 0 ? "DEPLETED" : "ACTIVE",
          },
        });
        await tx.giftCardTx.create({
          data: {
            giftCardId: gc.id,
            saleId: sale.id,
            amount: -payment.amount,
            type: "REDEMPTION",
            balanceAfter: newBalance,
            createdById: user.id,
          },
        });
        giftCardPaymentAmount += payment.amount;

        // Also create a SalePayment record
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            paymentMethod: "GIFT_CARD",
            amount: payment.amount,
          },
        });
      } else if (payment.method === "LOYALTY") {
        // Validate & debit loyalty balance
        if (!input.ownerId) throw new Error("Owner required for loyalty payment");
        const lastEntry = await tx.loyaltyLedger.findFirst({
          where: { organizationId, ownerId: input.ownerId },
          orderBy: { createdAt: "desc" },
          select: { balanceAfter: true },
        });
        const currentBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;
        if (currentBalance < payment.amount)
          throw new Error("Insufficient loyalty balance");

        await tx.loyaltyLedger.create({
          data: {
            organizationId,
            ownerId: input.ownerId,
            saleId: sale.id,
            type: "REDEEMED",
            amount: -payment.amount,
            balanceAfter: currentBalance - payment.amount,
            note: `Redeemed on sale #${saleNumber}`,
          },
        });
        loyaltyPaymentAmount += payment.amount;

        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            paymentMethod: "LOYALTY",
            amount: payment.amount,
          },
        });
      } else {
        // CASH, CARD, YAPPY, BANK_TRANSFER
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            paymentMethod: payment.method,
            amount: payment.amount,
          },
        });
      }
    }

    // Decrement product stock
    for (const item of input.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    // Earn loyalty points if enabled and owner is selected
    if (input.ownerId) {
      const loyaltyConfig = await tx.loyaltyConfig.findUnique({
        where: { organizationId },
      });
      if (loyaltyConfig && loyaltyConfig.isEnabled) {
        // Earn on non-loyalty payment portion
        const eligibleAmount = total - loyaltyPaymentAmount;
        if (eligibleAmount > 0) {
          const earned =
            Math.round(eligibleAmount * Number(loyaltyConfig.dollarRate) * 100) /
            100;
          if (earned > 0) {
            const lastEntry = await tx.loyaltyLedger.findFirst({
              where: { organizationId, ownerId: input.ownerId },
              orderBy: { createdAt: "desc" },
              select: { balanceAfter: true },
            });
            const currentBalance = lastEntry
              ? Number(lastEntry.balanceAfter)
              : 0;

            const expiresAt = loyaltyConfig.expirationDays
              ? new Date(
                  Date.now() +
                    loyaltyConfig.expirationDays * 24 * 60 * 60 * 1000,
                )
              : null;

            await tx.loyaltyLedger.create({
              data: {
                organizationId,
                ownerId: input.ownerId,
                saleId: sale.id,
                type: "EARNED",
                amount: earned,
                balanceAfter: currentBalance + earned,
                expiresAt,
                note: `Earned on sale #${saleNumber}`,
              },
            });
          }
        }
      }
    }

    return { saleId: sale.id, saleNumber };
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "CREATE",
    entityType: "Sale",
    entityId: result.saleId,
    metadata: {
      saleNumber: result.saleNumber,
      total,
      discounts: totalAllDiscounts,
      promotions: promotionDiscountMap.length,
    },
  });

  revalidatePath(`/app/${slug}/pos`);
  return result;
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
        payments: { select: { paymentMethod: true, amount: true } },
        _count: { select: { lines: true, promotions: true } },
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
      promotions: {
        include: { promotion: { select: { name: true, code: true, type: true } } },
      },
      giftCardTxs: {
        include: { giftCard: { select: { code: true } } },
      },
      loyaltyTxs: true,
    },
  });
}

// ═══════════════════════════════════════════════════════════
//  PROMOTIONS
// ═══════════════════════════════════════════════════════════

export async function getActivePromotions() {
  const { organizationId } = await getCurrentUser();
  const now = new Date();

  return prisma.promotion.findMany({
    where: {
      organizationId,
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      value: true,
      minPurchase: true,
      maxDiscount: true,
      appliesToAll: true,
      includedProducts: { select: { productId: true } },
      includedServices: { select: { serviceId: true } },
    },
  });
}

export async function validatePromoCode(code: string, cartTotal: number) {
  const { organizationId } = await getCurrentUser();
  const now = new Date();

  const promotion = await prisma.promotion.findUnique({
    where: { organizationId_code: { organizationId, code } },
    include: {
      includedProducts: { select: { productId: true } },
      includedServices: { select: { serviceId: true } },
    },
  });

  if (!promotion) return { valid: false as const, reason: "Promotion not found" };
  if (!promotion.isActive)
    return { valid: false as const, reason: "Promotion is not active" };
  if (now < promotion.startsAt)
    return { valid: false as const, reason: "Promotion has not started yet" };
  if (now > promotion.endsAt)
    return { valid: false as const, reason: "Promotion has expired" };
  if (
    promotion.usageLimit != null &&
    promotion.usageCount >= promotion.usageLimit
  )
    return { valid: false as const, reason: "Promotion usage limit reached" };
  if (
    promotion.minPurchase != null &&
    cartTotal < Number(promotion.minPurchase)
  )
    return {
      valid: false as const,
      reason: `Minimum purchase of ${Number(promotion.minPurchase).toFixed(2)} required`,
    };

  return {
    valid: true as const,
    promotion: {
      id: promotion.id,
      name: promotion.name,
      type: promotion.type,
      value: promotion.value,
      maxDiscount: promotion.maxDiscount,
      appliesToAll: promotion.appliesToAll,
      includedProducts: promotion.includedProducts,
      includedServices: promotion.includedServices,
    },
  };
}

export async function getAutoPromotions(cartItemIds: {
  productIds: string[];
  serviceIds: string[];
}) {
  const { organizationId } = await getCurrentUser();
  const now = new Date();

  const promotions = await prisma.promotion.findMany({
    where: {
      organizationId,
      isActive: true,
      code: null,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    include: {
      includedProducts: { select: { productId: true } },
      includedServices: { select: { serviceId: true } },
    },
  });

  return promotions
    .filter((promo) => {
      if (promo.appliesToAll) return true;
      const hasProduct = promo.includedProducts.some((pp) =>
        cartItemIds.productIds.includes(pp.productId),
      );
      const hasService = promo.includedServices.some((ps) =>
        cartItemIds.serviceIds.includes(ps.serviceId),
      );
      return hasProduct || hasService;
    })
    .map((promo) => ({
      id: promo.id,
      name: promo.name,
      type: promo.type,
      value: promo.value,
      maxDiscount: promo.maxDiscount,
    }));
}

// ═══════════════════════════════════════════════════════════
//  GIFT CARDS
// ═══════════════════════════════════════════════════════════

export async function validateGiftCard(code: string) {
  const { organizationId } = await getCurrentUser();

  const gc = await prisma.giftCard.findUnique({
    where: { organizationId_code: { organizationId, code } },
  });

  if (!gc) return { valid: false as const, reason: "Gift card not found" };
  if (gc.status !== "ACTIVE")
    return { valid: false as const, reason: "Gift card is not active" };
  if (gc.expiresAt && gc.expiresAt < new Date())
    return { valid: false as const, reason: "Gift card has expired" };

  return {
    valid: true as const,
    id: gc.id,
    balance: Number(gc.balance),
    code: gc.code,
  };
}

// ═══════════════════════════════════════════════════════════
//  LOYALTY
// ═══════════════════════════════════════════════════════════

export async function getLoyaltyConfig() {
  const { organizationId } = await getCurrentUser();

  const config = await prisma.loyaltyConfig.findUnique({
    where: { organizationId },
  });

  if (!config) {
    return {
      isEnabled: false,
      dollarRate: 0.05,
      expirationDays: 365,
      minRedemption: 1.0,
    };
  }

  return {
    isEnabled: config.isEnabled,
    dollarRate: Number(config.dollarRate),
    expirationDays: config.expirationDays ?? 365,
    minRedemption: Number(config.minRedemption),
  };
}

export async function getOwnerLoyaltyBalance(ownerId: string) {
  const { organizationId } = await getCurrentUser();

  const lastEntry = await prisma.loyaltyLedger.findFirst({
    where: { organizationId, ownerId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfter: true },
  });

  return lastEntry ? Number(lastEntry.balanceAfter) : 0;
}
