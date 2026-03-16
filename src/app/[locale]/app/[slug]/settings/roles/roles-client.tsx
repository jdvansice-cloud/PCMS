"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, Shield, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/lib/tenant-context";
// Define sections locally to avoid importing server-only permissions module
const ALL_SECTIONS = [
  "DASHBOARD", "CLIENTS", "PETS", "APPOINTMENTS", "GROOMING",
  "POS", "INVENTORY", "SERVICES", "REPORTS", "SETTINGS",
] as const;
type Section = (typeof ALL_SECTIONS)[number];
import {
  getRoles,
  createRole,
  updateRolePermissions,
  deleteRole,
} from "../actions";

type PermissionRow = {
  section: Section;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type RoleWithPermissions = Awaited<ReturnType<typeof getRoles>>[number];

export function RolesClient({ initialRoles }: { initialRoles: RoleWithPermissions[] }) {
  const { organization } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [roles, setRoles] = useState<RoleWithPermissions[]>(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadRoles = useCallback(async () => {
    const data = await getRoles();
    setRoles(data);
    return data;
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  function selectRole(roleId: string) {
    setSelectedRoleId(roleId);
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    // Build permissions for all sections, filling in missing sections with defaults
    const perms: PermissionRow[] = ALL_SECTIONS.map((section) => {
      const existing = role.permissions.find((p) => p.section === section);
      return {
        section,
        canView: existing?.canView ?? false,
        canCreate: existing?.canCreate ?? false,
        canEdit: existing?.canEdit ?? false,
        canDelete: existing?.canDelete ?? false,
      };
    });
    setPermissions(perms);
  }

  function updatePermission(
    section: Section,
    field: "canView" | "canCreate" | "canEdit" | "canDelete",
    value: boolean,
  ) {
    setPermissions((prev) =>
      prev.map((p) => (p.section === section ? { ...p, [field]: value } : p)),
    );
  }

  async function handleCreateRole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createRole(formData);
      setShowNewDialog(false);
      const updatedRoles = await loadRoles();
      // Select the newly created role (last by creation, but sorted by name)
      if (updatedRoles.length > 0) {
        const newest = updatedRoles[updatedRoles.length - 1];
        selectRole(newest.id);
      }
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleSavePermissions() {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await updateRolePermissions(selectedRoleId, permissions);
      await loadRoles();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRole() {
    if (!selectedRoleId) return;
    setDeleting(true);
    try {
      await deleteRole(selectedRoleId);
      setSelectedRoleId(null);
      setPermissions([]);
      setShowDeleteDialog(false);
      await loadRoles();
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const canDeleteSelected =
    selectedRole && !selectedRole.isSystem && selectedRole._count.users === 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t("rolesTitle")}>
        <Link href={`/app/${organization.slug}/settings`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> {tc("back")}
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* ── Left sidebar: Role list ─────────────────────────── */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          {roles.map((role) => (
            <Card
              key={role.id}
              className={`cursor-pointer ${
                selectedRoleId === role.id
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => selectRole(role.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{role.name}</p>
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {t("systemRole")}
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {t("users_count", { count: role._count.users })}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Role button + dialog */}
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger
              render={
                <Button variant="outline" className="w-full gap-1.5" size="sm" />
              }
            >
              <Plus className="h-4 w-4" /> {t("addRole")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addRole")}</DialogTitle>
                <DialogDescription>{t("rolesDesc")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateRole}>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label>{t("roleName")} *</Label>
                    <Input name="name" required autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("roleDescription")}</Label>
                    <Input name="description" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating} size="sm">
                    {creating ? t("creating") : tc("create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Right panel: Permissions matrix ─────────────────── */}
        <div className="flex-1 min-w-0">
          {selectedRole ? (
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedRole.name}</h2>
                    {selectedRole.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedRole.description}
                      </p>
                    )}
                  </div>
                  {selectedRole.isSystem && (
                    <Badge variant="secondary">{t("systemRole")}</Badge>
                  )}
                </div>

                {/* Permissions table */}
                <div className="overflow-x-auto -mx-4 sm:-mx-6">
                  <div className="min-w-[480px] px-4 sm:px-6">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-2 items-center pb-2 border-b text-xs font-medium text-muted-foreground">
                      <span>{t("permissions")}</span>
                      <span className="text-center">{t("permView")}</span>
                      <span className="text-center">{t("permCreate")}</span>
                      <span className="text-center">{t("permEdit")}</span>
                      <span className="text-center">{t("permDelete")}</span>
                    </div>

                    {/* Rows */}
                    {permissions.map((perm) => (
                      <div
                        key={perm.section}
                        className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-2 items-center py-2.5 border-b last:border-0"
                      >
                        <span className="text-sm font-medium">
                          {t(`sectionLabels.${perm.section}`)}
                        </span>
                        <div className="flex justify-center">
                          <Switch
                            size="sm"
                            checked={perm.canView}
                            onCheckedChange={(v: boolean) =>
                              updatePermission(perm.section, "canView", v)
                            }
                          />
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            size="sm"
                            checked={perm.canCreate}
                            onCheckedChange={(v: boolean) =>
                              updatePermission(perm.section, "canCreate", v)
                            }
                          />
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            size="sm"
                            checked={perm.canEdit}
                            onCheckedChange={(v: boolean) =>
                              updatePermission(perm.section, "canEdit", v)
                            }
                          />
                        </div>
                        <div className="flex justify-center">
                          <Switch
                            size="sm"
                            checked={perm.canDelete}
                            onCheckedChange={(v: boolean) =>
                              updatePermission(perm.section, "canDelete", v)
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 mt-2">
                  <div>
                    {canDeleteSelected && (
                      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <DialogTrigger
                          render={
                            <Button variant="outline" size="sm" className="text-destructive gap-1.5" />
                          }
                        >
                          <Trash2 className="h-4 w-4" /> {t("deleteRole")}
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("deleteRoleConfirm")}</DialogTitle>
                            <DialogDescription>{t("deleteRoleWarning")}</DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeleteDialog(false)}
                            >
                              {tc("cancel")}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleDeleteRole}
                              disabled={deleting}
                            >
                              {deleting ? tc("loading") : tc("delete")}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    {selectedRole.isSystem && (
                      <span className="text-xs text-muted-foreground">
                        {t("cannotDeleteSystem")}
                      </span>
                    )}
                    {!selectedRole.isSystem && selectedRole._count.users > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {t("cannotDeleteAssigned")}
                      </span>
                    )}
                  </div>
                  <Button onClick={handleSavePermissions} disabled={saving} size="sm">
                    {saving ? t("saving") : t("savePermissions")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-muted p-4 mb-3">
                  <Shield className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("noRoleSelected")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
