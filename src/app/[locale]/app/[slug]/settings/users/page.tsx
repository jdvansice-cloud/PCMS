"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, Users, UserX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getUsers,
  getRoles,
  inviteUser,
  updateUserRole,
  deactivateUser,
} from "../actions";

type UserRow = Awaited<ReturnType<typeof getUsers>>[number];
type RoleRow = Awaited<ReturnType<typeof getRoles>>[number];

export default function UsersPage() {
  const { organization, user: currentUser } = useTenant();
  const router = useRouter();
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [userType, setUserType] = useState<"ADMIN" | "STAFF">("STAFF");
  const [roleId, setRoleId] = useState("");

  const loadData = useCallback(async () => {
    const [usersData, rolesData] = await Promise.all([getUsers(), getRoles()]);
    setUsers(usersData);
    setRoles(rolesData);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviting(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("userType", userType);
      if (userType === "STAFF" && roleId) {
        formData.set("roleId", roleId);
      }
      await inviteUser(formData);
      setShowInvite(false);
      setUserType("STAFF");
      setRoleId("");
      await loadData();
      router.refresh();
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRoleId: string) {
    await updateUserRole(userId, newRoleId || null);
    await loadData();
    router.refresh();
  }

  async function handleDeactivate(userId: string) {
    if (!confirm(t("deactivateConfirm"))) return;
    await deactivateUser(userId);
    await loadData();
    router.refresh();
  }

  function userTypeBadge(type: string) {
    switch (type) {
      case "OWNER":
        return <Badge variant="default">{t("owner")}</Badge>;
      case "ADMIN":
        return <Badge variant="secondary">{t("admin")}</Badge>;
      default:
        return <Badge variant="outline">{t("staff")}</Badge>;
    }
  }

  function statusBadge(isActive: boolean) {
    return isActive ? (
      <Badge variant="secondary">{t("active")}</Badge>
    ) : (
      <Badge variant="destructive">{t("inactive")}</Badge>
    );
  }

  const canManageUser = (u: UserRow) =>
    u.id !== currentUser.id && u.userType !== "OWNER";

  return (
    <div className="space-y-6">
      <PageHeader title={t("usersTitle")}>
        <div className="flex items-center gap-2">
          <Link href={`/app/${organization.slug}/settings`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("backToSettings")}
            </Button>
          </Link>
          <Dialog open={showInvite} onOpenChange={setShowInvite}>
            <DialogTrigger
              render={
                <Button size="sm" className="gap-1.5" />
              }
            >
              <Plus className="h-4 w-4" /> {t("inviteUser")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("inviteUser")}</DialogTitle>
                <DialogDescription>{t("usersDesc")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite}>
                <div className="space-y-3 py-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t("firstName")} *</Label>
                      <Input name="firstName" required autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("lastName")} *</Label>
                      <Input name="lastName" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("email")} *</Label>
                    <Input name="email" type="email" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("userType")} *</Label>
                    <Select
                      value={userType}
                      onValueChange={(v) => {
                        if (v === "ADMIN" || v === "STAFF") {
                          setUserType(v);
                          if (v === "ADMIN") setRoleId("");
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">{t("admin")}</SelectItem>
                        <SelectItem value="STAFF">{t("staff")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {userType === "STAFF" && (
                    <div className="space-y-1.5">
                      <Label>{t("role")}</Label>
                      <Select
                        value={roleId}
                        onValueChange={(v) => setRoleId(v ?? "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectUserRole")} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInvite(false)}
                  >
                    {tc("cancel")}
                  </Button>
                  <Button type="submit" disabled={inviting} size="sm">
                    {inviting ? tc("loading") : t("inviteUser")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {users.length === 0 ? (
        <Card className="shadow-sm border-0 shadow-black/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t("noUsers")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("noUsersDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {users.map((u) => (
              <Card key={u.id} className="shadow-sm border-0 shadow-black/5">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {userTypeBadge(u.userType)}
                        {statusBadge(u.isActive)}
                        {u.role && (
                          <Badge variant="outline">{u.role.name}</Badge>
                        )}
                      </div>
                    </div>
                    {canManageUser(u) && u.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive shrink-0"
                        onClick={() => handleDeactivate(u.id)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {canManageUser(u) && u.userType === "STAFF" && u.isActive && (
                    <div className="mt-2 pt-2 border-t">
                      <Select
                        value={u.roleId ?? ""}
                        onValueChange={(v) => handleRoleChange(u.id, v ?? "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectUserRole")} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="shadow-sm border-0 shadow-black/5 hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tc("name")}</TableHead>
                  <TableHead>{t("email")}</TableHead>
                  <TableHead>{t("userType")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.firstName} {u.lastName}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{userTypeBadge(u.userType)}</TableCell>
                    <TableCell>
                      {canManageUser(u) &&
                      u.userType === "STAFF" &&
                      u.isActive ? (
                        <Select
                          value={u.roleId ?? ""}
                          onValueChange={(v) =>
                            handleRoleChange(u.id, v ?? "")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectUserRole")} />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {u.role?.name ?? t("noRole")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(u.isActive)}</TableCell>
                    <TableCell className="text-right">
                      {canManageUser(u) && u.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive gap-1.5"
                          onClick={() => handleDeactivate(u.id)}
                        >
                          <UserX className="h-4 w-4" />
                          {t("deactivate")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
