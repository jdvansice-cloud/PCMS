"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, Store, Pencil, Users, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  getBranches,
  createBranch,
  updateBranch,
  toggleBranchActive,
  getBranchUsers,
  updateBranchAssignments,
} from "../actions";

type BranchRow = Awaited<ReturnType<typeof getBranches>>[number];
type BranchUser = Awaited<ReturnType<typeof getBranchUsers>>[number];

export default function BranchesPage() {
  const { organization } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editBranch, setEditBranch] = useState<BranchRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Assign users state
  const [assignBranch, setAssignBranch] = useState<BranchRow | null>(null);
  const [branchUsers, setBranchUsers] = useState<BranchUser[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const loadData = useCallback(async () => {
    const data = await getBranches();
    setBranches(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createBranch(formData);
      setShowCreate(false);
      await loadData();
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editBranch) return;
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      await updateBranch(editBranch.id, {
        name: fd.get("name") as string,
        phone: (fd.get("phone") as string) || undefined,
        email: (fd.get("email") as string) || undefined,
        address: (fd.get("address") as string) || undefined,
      });
      setEditBranch(null);
      await loadData();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(branch: BranchRow) {
    if (branch.isMain && branch.isActive) {
      alert(t("cannotDeactivateMain"));
      return;
    }
    if (branch.isActive && !confirm(t("deactivateBranchConfirm"))) return;
    await toggleBranchActive(branch.id);
    await loadData();
    router.refresh();
  }

  async function openAssignDialog(branch: BranchRow) {
    setAssignBranch(branch);
    setAssignLoading(true);
    try {
      const users = await getBranchUsers(branch.id);
      setBranchUsers(users);
    } finally {
      setAssignLoading(false);
    }
  }

  function toggleUserAssigned(userId: string) {
    setBranchUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newAssigned = !u.isAssigned;
        return {
          ...u,
          isAssigned: newAssigned,
          isDefault: newAssigned ? u.isDefault : false,
        };
      })
    );
  }

  function setUserDefault(userId: string) {
    setBranchUsers((prev) =>
      prev.map((u) => ({
        ...u,
        isDefault: u.id === userId,
        isAssigned: u.id === userId ? true : u.isAssigned,
      }))
    );
  }

  async function handleSaveAssignments() {
    if (!assignBranch) return;
    setSaving(true);
    try {
      await updateBranchAssignments(
        assignBranch.id,
        branchUsers.map((u) => ({
          userId: u.id,
          isAssigned: u.isAssigned,
          isDefault: u.isDefault,
        })),
      );
      setAssignBranch(null);
      await loadData();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function statusBadge(branch: BranchRow) {
    if (branch.isMain) {
      return <Badge variant="default">{t("mainBranch")}</Badge>;
    }
    return branch.isActive ? (
      <Badge variant="secondary">{t("branchActive")}</Badge>
    ) : (
      <Badge variant="destructive">{t("branchInactive")}</Badge>
    );
  }

  const branchForm = (
    defaults?: BranchRow | null,
    onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void,
    loading?: boolean,
  ) => (
    <form onSubmit={onSubmit}>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label>{t("branchName")} *</Label>
          <Input
            name="name"
            required
            autoFocus
            defaultValue={defaults?.name ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("branchPhone")}</Label>
          <Input name="phone" defaultValue={defaults?.phone ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("branchEmail")}</Label>
          <Input
            name="email"
            type="email"
            defaultValue={defaults?.email ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("branchAddress")}</Label>
          <Input name="address" defaultValue={defaults?.address ?? ""} />
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setShowCreate(false);
            setEditBranch(null);
          }}
        >
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={loading} size="sm">
          {loading ? tc("loading") : tc("save")}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("branchesTitle")}>
        <div className="flex items-center gap-2">
          <Link href={`/app/${organization.slug}/settings`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("backToSettings")}
            </Button>
          </Link>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger
              render={<Button size="sm" className="gap-1.5" />}
            >
              <Plus className="h-4 w-4" /> {t("newBranch")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("newBranch")}</DialogTitle>
                <DialogDescription>{t("branchesDesc")}</DialogDescription>
              </DialogHeader>
              {branchForm(null, handleCreate, creating)}
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {branches.length === 0 ? (
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Store className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("noBranches")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {branches.map((b) => (
              <Card key={b.id} className="shadow-sm border-0 shadow-black/5">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.name}</p>
                      {b.phone && (
                        <p className="text-xs text-muted-foreground">
                          {b.phone}
                        </p>
                      )}
                      {b.address && (
                        <p className="text-xs text-muted-foreground truncate">
                          {b.address}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {statusBadge(b)}
                        <Badge variant="outline">
                          {b._count.userBranches} {t("assignedUsers").toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditBranch(b)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAssignDialog(b)}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="shadow-sm border-0 shadow-black/5 hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("branchName")}</TableHead>
                  <TableHead>{t("branchPhone")}</TableHead>
                  <TableHead>{t("branchAddress")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("assignedUsers")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.phone || "—"}</TableCell>
                    <TableCell>{b.address || "—"}</TableCell>
                    <TableCell>{statusBadge(b)}</TableCell>
                    <TableCell>{b._count.userBranches}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEditBranch(b)}
                        >
                          <Pencil className="h-4 w-4" /> {tc("edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openAssignDialog(b)}
                        >
                          <Users className="h-4 w-4" /> {t("assignUsers")}
                        </Button>
                        {!b.isMain && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={
                              b.isActive
                                ? "text-destructive gap-1.5"
                                : "text-green-600 gap-1.5"
                            }
                            onClick={() => handleToggleActive(b)}
                          >
                            {b.isActive
                              ? t("deactivateBranch")
                              : t("activateBranch")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editBranch}
        onOpenChange={(open) => !open && setEditBranch(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editBranch")}</DialogTitle>
            <DialogDescription>{t("branchesDesc")}</DialogDescription>
          </DialogHeader>
          {branchForm(editBranch, handleEdit, saving)}
        </DialogContent>
      </Dialog>

      {/* Assign Users Dialog */}
      <Dialog
        open={!!assignBranch}
        onOpenChange={(open) => !open && setAssignBranch(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("assignUsers")} — {assignBranch?.name}
            </DialogTitle>
            <DialogDescription>{t("branchesDesc")}</DialogDescription>
          </DialogHeader>
          {assignLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {tc("loading")}
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto py-2">
              {branchUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      checked={u.isAssigned}
                      onCheckedChange={() => toggleUserAssigned(u.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>
                  {u.isAssigned && (
                    <Button
                      variant={u.isDefault ? "default" : "outline"}
                      size="sm"
                      className="shrink-0 gap-1"
                      onClick={() => setUserDefault(u.id)}
                    >
                      <Star
                        className={`h-3 w-3 ${u.isDefault ? "fill-current" : ""}`}
                      />
                      {t("setAsDefault")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAssignBranch(null)}
            >
              {tc("cancel")}
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={handleSaveAssignments}
            >
              {saving ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
