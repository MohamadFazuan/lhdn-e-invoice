import { z } from 'zod';
import { MEMBER_ROLES } from '../../db/schema/business-members.js';

export const inviteMemberDto = z.object({
  email: z.string().email('Must be a valid email address'),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'VIEWER'] as const, {
    errorMap: () => ({ message: "Role must be 'ADMIN', 'ACCOUNTANT', or 'VIEWER'" }),
  }),
});

export const updateMemberRoleDto = z.object({
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'VIEWER'] as const, {
    errorMap: () => ({ message: "Role must be 'ADMIN', 'ACCOUNTANT', or 'VIEWER'" }),
  }),
});

export type InviteMemberDto = z.infer<typeof inviteMemberDto>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleDto>;

export interface MemberResponse {
  id: string;
  businessId: string;
  userId: string | null;
  role: string;
  inviteEmail: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
