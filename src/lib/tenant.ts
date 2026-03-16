import { prisma } from "@/lib/prisma";
import { DEFAULT_ROLES } from "@/lib/permissions/defaults";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let counter = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    counter++;
    slug = `${base}-${counter}`;
  }
  return slug;
}

export async function createOrganization(input: {
  name: string;
  authId: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  const slug = await uniqueSlug(generateSlug(input.name));

  // Create org + main branch + owner user + default roles in a transaction
  const org = await prisma.organization.create({
    data: {
      name: input.name,
      slug,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      updatedAt: new Date(),
      branding: { create: {} },
      subscription: {
        create: {
          plan: "TRIAL",
          status: "TRIALING",
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        },
      },
      branches: {
        create: {
          name: "Principal",
          isMain: true,
          updatedAt: new Date(),
        },
      },
    },
    include: { branches: true },
  });

  const mainBranch = org.branches[0];

  // Create default business hours for main branch (Mon-Fri 8-18, Sat 8-13)
  const hoursData = [
    { dayOfWeek: 0, openTime: "08:00", closeTime: "13:00", isClosed: true },  // Sunday
    { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isClosed: false }, // Monday
    { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isClosed: false },
    { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isClosed: false },
    { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isClosed: false },
    { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isClosed: false }, // Friday
    { dayOfWeek: 6, openTime: "08:00", closeTime: "13:00", isClosed: false }, // Saturday
  ];

  await prisma.businessHours.createMany({
    data: hoursData.map((h) => ({ ...h, branchId: mainBranch.id })),
  });

  // Create owner user
  const user = await prisma.user.create({
    data: {
      authId: input.authId,
      organizationId: org.id,
      branchId: mainBranch.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      userType: "OWNER",
      updatedAt: new Date(),
    },
  });

  // Create user-branch assignment for owner
  await prisma.userBranch.create({
    data: {
      userId: user.id,
      branchId: mainBranch.id,
      isDefault: true,
    },
  });

  // Create default roles with permissions
  for (const roleDef of DEFAULT_ROLES) {
    await prisma.role.create({
      data: {
        organizationId: org.id,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
        updatedAt: new Date(),
        permissions: {
          create: roleDef.permissions,
        },
      },
    });
  }

  return { organization: org, user, branch: mainBranch };
}
