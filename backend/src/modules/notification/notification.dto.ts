import { z } from 'zod';

export const updatePreferencesDto = z.object({
  emailOnSubmitted: z.boolean().optional(),
  emailOnValidated: z.boolean().optional(),
  emailOnRejected: z.boolean().optional(),
  emailOnCancelled: z.boolean().optional(),
  emailOnTeamInvite: z.boolean().optional(),
});

export type UpdatePreferencesDto = z.infer<typeof updatePreferencesDto>;

export interface NotificationJobPayload {
  notificationLogId: string;
  recipientEmail: string;
  subject: string;
  htmlBody: string;
}
