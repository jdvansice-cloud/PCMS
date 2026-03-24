"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortalTenant } from "@/lib/portal-tenant-context";
import { getMyPets } from "../actions";
import { PawPrint } from "lucide-react";

type Pet = Awaited<ReturnType<typeof getMyPets>>[number];

export default function PortalPetsPage() {
  const t = useTranslations("portal.pets");
  const { organization } = usePortalTenant();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPets().then((p) => { setPets(p); setLoading(false); });
  }, []);

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {pets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <PawPrint className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("noPets")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => (
            <Link
              key={pet.id}
              href={`/portal/${organization.slug}/pets/${pet.id}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  {pet.photoUrl ? (
                    <img
                      src={pet.photoUrl}
                      alt={pet.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                      <PawPrint className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold">{pet.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {pet.breed ?? pet.species}
                    </p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {pet.species}
                      </Badge>
                      {pet.size && (
                        <Badge variant="secondary" className="text-xs">
                          {pet.size}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
