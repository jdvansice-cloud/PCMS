"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getItbmsBreakdown } from "@/lib/utils";

import { revalidatePath } from "next/cache";
import type { PaymentMethod, DiscountType } from "@/generated/prisma/client";

export async function getPosData() {
  const { organizationId } = await getCurrentUser();

  const [products, services, owners, giftCardProducts] = await Promise.all([
    prisma.product.findMany({
      where: { organizationId, isActive: true },
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
    prisma.giftCardProduct.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, amount: true, expirationDays: true },
      orderBy: { amount: "asc" },
    }),
  ]);

  return { products, services, owners, giftCardProducts };
}

type CartItem = {
  productId?: string;
  serviceId?: string;
  giftCardProductId?: string;
  isGiftCard?: boolean;
  giftCardCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isTaxExempt: boolean;
  discountAmount?: number;
  discountType?: "PERCENTAGE" | "FIXED";
};

export async function createSale(input: {
  ownerId?: string;
  appointmentId?: string;
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
      giftCardProductId: item.giftCardProductId || null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      isTaxExempt: item.isTaxExempt,
      isInvoiceable: !item.isGiftCard,
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

  // --- f2. Validate gift card payment restriction ---
  const giftCardLinesTotal = input.items
    .filter((item) => item.isGiftCard)
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  if (giftCardLinesTotal > 0) {
    const giftCardPaymentTotal = paymentInputs
      .filter((p) => p.method === "GIFT_CARD")
      .reduce((sum, p) => sum + p.amount, 0);
    const maxGiftCardPayment = total - giftCardLinesTotal;
    if (giftCardPaymentTotal > maxGiftCardPayment + 0.01) {
      throw new Error(
        `Gift card payment cannot exceed ${maxGiftCardPayment.toFixed(2)} (gift card purchases must be paid with other methods)`,
      );
    }
  }

  // --- g. Execute in transaction for atomicity ---
  const result = await prisma.$transaction(async (tx) => {
    // Check if this sale is linked to an online booking
    let isOnlineSale = false;
    if (input.appointmentId) {
      const appointment = await tx.appointment.findUnique({
        where: { id: input.appointmentId },
        select: { isPublicBooking: true },
      });
      isOnlineSale = appointment?.isPublicBooking ?? false;
    }

    // Create the sale
    const sale = await tx.sale.create({
      data: {
        organizationId,
        branchId: branch.id,
        ownerId: input.ownerId || null,
        appointmentId: input.appointmentId || null,
        saleNumber,
        subtotal: subtotalSum,
        itbms: itbmsSum,
        discountAmount: totalAllDiscounts > 0 ? totalAllDiscounts : null,
        discountType: saleDiscountType,
        discountedById: input.discountedById || null,
        total,
        balanceDue: 0,
        status: "COMPLETED",
        isOnlineSale,
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

    // Activate GiftCard records for gift card line items
    const generatedGiftCards: { code: string; amount: number }[] = [];
    for (const item of input.items) {
      if (item.isGiftCard && item.giftCardProductId) {
        // Look up the gift card product for expiration days
        const gcProduct = await tx.giftCardProduct.findUnique({
          where: { id: item.giftCardProductId },
          select: { expirationDays: true },
        });
        const expDays = gcProduct?.expirationDays;
        const expiresAt = expDays && expDays > 0
          ? new Date(Date.now() + expDays * 24 * 60 * 60 * 1000)
          : null;

        // Use the code provided by the cashier (from the physical card)
        const code = item.giftCardCode;
        if (!code) throw new Error("Gift card code is required");

        // Check if the code is already in use
        const existing = await tx.giftCard.findUnique({
          where: { organizationId_code: { organizationId, code } },
        });
        if (existing && existing.status === "ACTIVE") {
          throw new Error(`Gift card code ${code} is already active`);
        }

        // If the code was previously used (depleted/expired/cancelled), reactivate it
        // Otherwise create a new gift card record
        let gc;
        if (existing) {
          gc = await tx.giftCard.update({
            where: { id: existing.id },
            data: {
              initialBalance: item.unitPrice,
              balance: item.unitPrice,
              status: "ACTIVE",
              expiresAt,
              purchasedById: input.ownerId || null,
            },
          });
        } else {
          gc = await tx.giftCard.create({
            data: {
              organizationId,
              code,
              initialBalance: item.unitPrice,
              balance: item.unitPrice,
              status: "ACTIVE",
              expiresAt,
              purchasedById: input.ownerId || null,
            },
          });
        }

        await tx.giftCardTx.create({
          data: {
            giftCardId: gc.id,
            saleId: sale.id,
            amount: item.unitPrice,
            type: "PURCHASE",
            balanceAfter: item.unitPrice,
            createdById: user.id,
          },
        });

        generatedGiftCards.push({ code, amount: item.unitPrice });
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

    // --- Bath tally for online grooming sales ---
    if (isOnlineSale && input.ownerId) {
      // Check if any items are bath services
      const bathServiceIds = input.items
        .filter((item) => item.serviceId)
        .map((item) => item.serviceId!);

      if (bathServiceIds.length > 0) {
        const bathServices = await tx.service.findMany({
          where: { id: { in: bathServiceIds }, isBathService: true },
        });

        if (bathServices.length > 0) {
          // Increment bath tally (outside transaction - handled by grooming lib)
          // We'll do this after the transaction
        }
      }
    }

    return { saleId: sale.id, saleNumber, generatedGiftCards, isOnlineSale };
  });

  // Increment bath tally for online grooming sales
  if (result.isOnlineSale && input.ownerId) {
    const bathServiceIds = input.items
      .filter((item) => item.serviceId)
      .map((item) => item.serviceId!);

    if (bathServiceIds.length > 0) {
      const bathServices = await prisma.service.findMany({
        where: { id: { in: bathServiceIds }, isBathService: true },
      });

      // Bath tally tracking removed — handled by customer promotions system
    }
  }

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
      isOnlineSale: result.isOnlineSale,
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
        include: { promotion: { select: { name: true, type: true } } },
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
      type: true,
      value: true,
      minPurchase: true,
      maxDiscount: true,
      usageLimit: true,
      usageCount: true,
      appliesToAll: true,
      // Buy X Get Y
      triggerProductId: true,
      triggerServiceId: true,
      rewardProductId: true,
      rewardServiceId: true,
      rewardDiscount: true,
      rewardDiscountUnit: true,
      // Bundle
      bundlePrice: true,
      // Items
      includedProducts: { select: { productId: true } },
      includedServices: { select: { serviceId: true } },
      // Volume tiers
      volumeTiers: { orderBy: { tierOrder: "asc" as const }, select: { minQty: true, maxQty: true, discount: true, discountUnit: true } },
    },
  });
}

// ═══════════════════════════════════════════════════════════
//  GIFT CARDS
// ═══════════════════════════════════════════════════════════

export async function topUpGiftCardAtPos(input: {
  code: string;
  amount: number;
  paymentMethod: PaymentMethod;
}) {
  const { user, organizationId, slug } = await getCurrentUser();

  const branch = await prisma.branch.findFirst({
    where: { organizationId, isMain: true },
    select: { id: true },
  });
  if (!branch) throw new Error("No branch");

  const gc = await prisma.giftCard.findUnique({
    where: { organizationId_code: { organizationId, code: input.code } },
  });
  if (!gc) throw new Error("Gift card not found");
  if (gc.status === "CANCELLED") throw new Error("Gift card is cancelled");

  const lastSale = await prisma.sale.findFirst({
    where: { organizationId },
    orderBy: { saleNumber: "desc" },
    select: { saleNumber: true },
  });
  const saleNumber = (lastSale?.saleNumber ?? 0) + 1;

  const newBalance = Number(gc.balance) + input.amount;

  const result = await prisma.$transaction(async (tx) => {
    // Update gift card balance & reactivate if depleted/expired
    await tx.giftCard.update({
      where: { id: gc.id },
      data: {
        balance: newBalance,
        status: "ACTIVE",
      },
    });

    // Record top-up transaction
    await tx.giftCardTx.create({
      data: {
        giftCardId: gc.id,
        amount: input.amount,
        type: "TOP_UP",
        balanceAfter: newBalance,
        createdById: user.id,
      },
    });

    // Create a sale for the top-up (tax-exempt)
    const sale = await tx.sale.create({
      data: {
        organizationId,
        branchId: branch.id,
        saleNumber,
        subtotal: input.amount,
        itbms: 0,
        total: input.amount,
        balanceDue: 0,
        status: "COMPLETED",
        notes: `Gift card top-up: ${input.code}`,
        lines: {
          create: {
            description: `Gift Card Top-Up ${input.code}`,
            quantity: 1,
            unitPrice: input.amount,
            isTaxExempt: true,
            subtotal: input.amount,
            itbms: 0,
            lineTotal: input.amount,
          },
        },
      },
    });

    await tx.salePayment.create({
      data: {
        saleId: sale.id,
        paymentMethod: input.paymentMethod,
        amount: input.amount,
      },
    });

    return { saleNumber };
  });

  await createAuditLog({
    organizationId,
    userId: user.id,
    action: "UPDATE",
    entityType: "GiftCard",
    entityId: gc.id,
    metadata: { code: input.code, topUpAmount: input.amount, newBalance, saleNumber: result.saleNumber },
  });

  revalidatePath(`/app/${slug}/pos`);
  return { code: input.code, newBalance, saleNumber: result.saleNumber };
}

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

// ═══════════════════════════════════════════════════════════
//  UNBILLED SERVICES (for customer-first POS flow)
// ═══════════════════════════════════════════════════════════

export type UnbilledService = {
  appointmentId: string;
  petName: string;
  serviceName: string;
  serviceId: string | null;
  type: string;
  status: string;
  price: number;
  isTaxExempt: boolean;
  autoAdd: boolean; // true for COMPLETED, false for IN_PROGRESS/PENDING
  scheduledAt: Date;
};

export async function getOwnerUnbilledServices(ownerId: string): Promise<UnbilledService[]> {
  const { organizationId } = await getCurrentUser();

  // Get today's start/end
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      organizationId,
      ownerId,
      scheduledAt: { gte: todayStart, lte: todayEnd },
      status: { in: ["COMPLETED", "IN_PROGRESS", "SCHEDULED"] },
      sale: { is: null }, // not yet billed
    },
    include: {
      pet: { select: { name: true } },
      service: { select: { id: true, name: true, price: true, isTaxExempt: true } },
      groomingSession: { select: { status: true, services: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return appointments.map((a) => ({
    appointmentId: a.id,
    petName: a.pet.name,
    serviceName: a.service?.name ?? a.type,
    serviceId: a.service?.id ?? null,
    type: a.type,
    status: a.groomingSession?.status ?? a.status,
    price: a.service ? Number(a.service.price) : 0,
    isTaxExempt: a.service?.isTaxExempt ?? false,
    autoAdd: a.status === "COMPLETED" || a.groomingSession?.status === "COMPLETED",
    scheduledAt: a.scheduledAt,
  }));
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

