import { z } from 'zod';

export const createBusinessDto = z.object({
  name: z.string().min(1).max(255),
  tin: z.string().min(1).max(20),
  registrationNumber: z.string().min(1).max(50),
  msicCode: z.string().min(1).max(10),
  sstRegistration: z.string().max(50).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  postcode: z.string().max(10).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(3).default('MY'),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
});

export const updateBusinessDto = createBusinessDto.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' },
);

export const updateCredentialsDto = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
});

export type CreateBusinessDto = z.infer<typeof createBusinessDto>;
export type UpdateBusinessDto = z.infer<typeof updateBusinessDto>;
export type UpdateCredentialsDto = z.infer<typeof updateCredentialsDto>;

export interface BusinessResponse {
  id: string;
  userId: string;
  name: string;
  tin: string;
  registrationNumber: string;
  msicCode: string;
  sstRegistration: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  state: string | null;
  country: string;
  email: string;
  phone: string | null;
  hasLhdnCredentials: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
