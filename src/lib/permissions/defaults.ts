import type { Section } from "@/generated/prisma/client";

type DefaultPerm = {
  section: Section;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type DefaultRole = {
  name: string;
  description: string;
  permissions: DefaultPerm[];
};

const V = { canView: true, canCreate: false, canEdit: false, canDelete: false };
const VCU = { canView: true, canCreate: true, canEdit: true, canDelete: false };
const VCUD = { canView: true, canCreate: true, canEdit: true, canDelete: true };
const VC = { canView: true, canCreate: true, canEdit: false, canDelete: false };
const NONE = { canView: false, canCreate: false, canEdit: false, canDelete: false };

export const DEFAULT_ROLES: DefaultRole[] = [
  {
    name: "Veterinario",
    description: "Acceso a consultas, historiales médicos y citas",
    permissions: [
      { section: "DASHBOARD", ...V },
      { section: "CLIENTS", ...VCUD },
      { section: "PETS", ...VCUD },
      { section: "APPOINTMENTS", ...VCUD },
      { section: "MEDICAL_RECORDS", ...VCUD },
      { section: "GROOMING", ...V },
      { section: "POS", ...VC },
      { section: "INVENTORY", ...V },
      { section: "SERVICES", ...V },
      { section: "REPORTS", ...V },
      { section: "SETTINGS", ...NONE },
      { section: "USERS", ...NONE },
      { section: "AUDIT_LOG", ...NONE },
    ],
  },
  {
    name: "Recepcionista",
    description: "Gestión de clientes, citas y punto de venta",
    permissions: [
      { section: "DASHBOARD", ...V },
      { section: "CLIENTS", ...VCUD },
      { section: "PETS", ...VC },
      { section: "APPOINTMENTS", ...VCUD },
      { section: "MEDICAL_RECORDS", ...V },
      { section: "GROOMING", ...VCU },
      { section: "POS", ...VCUD },
      { section: "INVENTORY", ...V },
      { section: "SERVICES", ...V },
      { section: "REPORTS", ...V },
      { section: "SETTINGS", ...NONE },
      { section: "USERS", ...NONE },
      { section: "AUDIT_LOG", ...NONE },
    ],
  },
  {
    name: "Peluquero",
    description: "Gestión de sesiones de peluquería",
    permissions: [
      { section: "DASHBOARD", ...V },
      { section: "CLIENTS", ...V },
      { section: "PETS", ...V },
      { section: "APPOINTMENTS", ...V },
      { section: "MEDICAL_RECORDS", ...NONE },
      { section: "GROOMING", ...VCUD },
      { section: "POS", ...NONE },
      { section: "INVENTORY", ...NONE },
      { section: "SERVICES", ...V },
      { section: "REPORTS", ...NONE },
      { section: "SETTINGS", ...NONE },
      { section: "USERS", ...NONE },
      { section: "AUDIT_LOG", ...NONE },
    ],
  },
  {
    name: "Cajero",
    description: "Punto de venta e inventario",
    permissions: [
      { section: "DASHBOARD", ...V },
      { section: "CLIENTS", ...V },
      { section: "PETS", ...V },
      { section: "APPOINTMENTS", ...V },
      { section: "MEDICAL_RECORDS", ...NONE },
      { section: "GROOMING", ...NONE },
      { section: "POS", ...VCUD },
      { section: "INVENTORY", ...V },
      { section: "SERVICES", ...V },
      { section: "REPORTS", ...NONE },
      { section: "SETTINGS", ...NONE },
      { section: "USERS", ...NONE },
      { section: "AUDIT_LOG", ...NONE },
    ],
  },
];
