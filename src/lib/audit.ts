import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/generated/prisma/client";

type AuditInput = {
  organizationId: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }> | null;
  metadata?: Record<string, unknown> | null;
};

export async function createAuditLog(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      changes: input.changes as object ?? undefined,
      metadata: input.metadata as object ?? undefined,
    },
  });
}

export function diffChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of Object.keys(newData)) {
    const oldVal = oldData[key];
    const newVal = newData[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
