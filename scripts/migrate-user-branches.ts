import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.POSTGRES_URL!,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: { branchId: { not: null } },
    select: { id: true, branchId: true },
  });

  let created = 0;
  for (const u of users) {
    const existing = await prisma.userBranch.findUnique({
      where: { userId_branchId: { userId: u.id, branchId: u.branchId! } },
    });
    if (!existing) {
      await prisma.userBranch.create({
        data: { userId: u.id, branchId: u.branchId!, isDefault: true },
      });
      created++;
    }
  }
  console.log(`Migrated ${created} user-branch assignments (${users.length} users checked)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
