import { getPosData, getActivePromotions, getLoyaltyConfig } from "./actions";
import { getCurrentUser } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";
import { PosTerminal } from "./pos-terminal";

export default async function PosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const auth = await getCurrentUser();

  const [data, promotions, loyaltyConfig, permissions] = await Promise.all([
    getPosData(),
    getActivePromotions(),
    getLoyaltyConfig(),
    getUserPermissions(auth.user.userType, auth.user.roleId),
  ]);

  const canDiscount = permissions.POS?.canEdit ?? false;

  return (
    <PosTerminal
      data={data}
      slug={slug}
      promotions={promotions}
      loyaltyConfig={loyaltyConfig}
      canDiscount={canDiscount}
      userId={auth.user.id}
    />
  );
}
