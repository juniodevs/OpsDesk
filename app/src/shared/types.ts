import { z } from "zod";

export const RoleEnum = z.enum(["ADMIN", "ANALYST", "REPORTER"]);
export type Role = z.infer<typeof RoleEnum>;

export const SeverityEnum = z.enum(["P1", "P2", "P3", "P4"]);
export type Severity = z.infer<typeof SeverityEnum>;

export const StatusEnum = z.enum([
  "OPEN",
  "TRIAGED",
  "INVESTIGATING",
  "MITIGATED",
  "RESOLVED",
  "CLOSED",
]);
export type Status = z.infer<typeof StatusEnum>;

// Schemas de validação de API
export const LoginSchema = z.object({
  email: z.string().email("E-mail com formato inválido"),
  password: z.string().min(4, "Senha deve ter no mínimo 4 caracteres"),
});

export const CreateTicketSchema = z.object({
  title: z
    .string()
    .min(5, "Título deve ter pelo menos 5 caracteres")
    .max(120, "Título deve ter no máximo 120 caracteres"),
  service: z.string().min(2, "Nome do serviço afetado é obrigatório"),
  severity: SeverityEnum,
  description: z
    .string()
    .min(10, "Descrição deve conter no mínimo 10 caracteres explicativos"),
  assignedToId: z.string().optional().nullable(),
});

export const UpdateStatusSchema = z.object({
  status: StatusEnum,
  resolutionNote: z.string().optional(),
});

export const AddNoteSchema = z.object({
  content: z.string().min(3, "Nota deve ter pelo menos 3 caracteres"),
  isInternal: z.boolean().default(true),
});

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
}

export interface Attachment {
  id: string;
  ticketId: string;
  filename: string;
  storedName: string;
  mimetype: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface TicketNote {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  ticketId: string;
  actorId: string;
  actorName: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string; // Ex: #INC-1001
  title: string;
  service: string;
  severity: Severity;
  status: Status;
  description: string;
  createdById: string;
  creatorName: string;
  assignedToId?: string | null;
  assigneeName?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  notesCount?: number;
  attachmentsCount?: number;
}
