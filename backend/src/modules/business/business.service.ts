import type { IBusinessRepository } from './business.repository.interface.js';
import type { ITeamRepository } from '../team/team.repository.interface.js';
import type {
  CreateBusinessDto,
  UpdateBusinessDto,
  UpdateCredentialsDto,
  BusinessResponse,
} from './business.dto.js';
import type { Business } from '../../db/schema/index.js';
import { encrypt } from '../../utils/crypto.js';
import { newId } from '../../utils/uuid.js';
import { nowISO } from '../../utils/date.js';
import { AppError } from '../../errors/app-error.js';

export class BusinessService {
  constructor(
    private readonly repo: IBusinessRepository,
    private readonly encryptionKey: string,
    private readonly teamRepo?: ITeamRepository,
  ) {}

  async getMyBusiness(userId: string): Promise<BusinessResponse> {
    const business = await this.repo.findByUserId(userId);
    if (!business) throw new AppError(404, 'BUSINESS_NOT_FOUND', 'No business profile found');
    return this._toResponse(business);
  }

  async createBusiness(userId: string, dto: CreateBusinessDto): Promise<BusinessResponse> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) {
      throw new AppError(409, 'BUSINESS_EXISTS', 'A business profile already exists for this account');
    }

    const now = nowISO();
    const businessId = newId();
    const business = await this.repo.create({
      id: businessId,
      userId,
      name: dto.name,
      tin: dto.tin,
      registrationNumber: dto.registrationNumber,
      msicCode: dto.msicCode,
      sstRegistrationNumber: dto.sstRegistration ?? null,
      addressLine0: null,
      addressLine1: dto.addressLine1 ?? null,
      addressLine2: dto.addressLine2 ?? null,
      postalZone: dto.postcode ?? null,
      cityName: dto.city ?? null,
      stateCode: dto.state ?? null,
      countryCode: dto.country ?? 'MYS',
      email: dto.email,
      phone: dto.phone ?? null,
      lhdnClientIdEncrypted: null,
      lhdnClientSecretEncrypted: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Insert the creator as OWNER in business_members
    if (this.teamRepo) {
      await this.teamRepo.create({
        id: newId(),
        businessId,
        userId,
        role: 'OWNER',
        invitedByUserId: null,
        inviteToken: null,
        inviteEmail: null,
        inviteExpiresAt: null,
        acceptedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return this._toResponse(business);
  }

  async updateBusiness(userId: string, dto: UpdateBusinessDto): Promise<BusinessResponse> {
    const business = await this._getOwnedBusiness(userId);
    const patch: Record<string, unknown> = { updatedAt: nowISO() };
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.tin !== undefined) patch.tin = dto.tin;
    if (dto.registrationNumber !== undefined) patch.registrationNumber = dto.registrationNumber;
    if (dto.msicCode !== undefined) patch.msicCode = dto.msicCode;
    if (dto.sstRegistration !== undefined) patch.sstRegistrationNumber = dto.sstRegistration;
    if (dto.addressLine1 !== undefined) patch.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) patch.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) patch.cityName = dto.city;
    if (dto.postcode !== undefined) patch.postalZone = dto.postcode;
    if (dto.state !== undefined) patch.stateCode = dto.state;
    if (dto.country !== undefined) patch.countryCode = dto.country;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    const updated = await this.repo.update(business.id, patch as any);
    return this._toResponse(updated);
  }

  async updateCredentials(userId: string, dto: UpdateCredentialsDto): Promise<void> {
    const business = await this._getOwnedBusiness(userId);

    const [encryptedClientId, encryptedClientSecret] = await Promise.all([
      encrypt(dto.clientId, this.encryptionKey),
      encrypt(dto.clientSecret, this.encryptionKey),
    ]);

    await this.repo.update(business.id, {
      lhdnClientIdEncrypted: encryptedClientId,
      lhdnClientSecretEncrypted: encryptedClientSecret,
      updatedAt: nowISO(),
    });
  }

  private async _getOwnedBusiness(userId: string): Promise<Business> {
    const business = await this.repo.findByUserId(userId);
    if (!business) throw new AppError(404, 'BUSINESS_NOT_FOUND', 'No business profile found');
    return business;
  }

  private _toResponse(b: Business): BusinessResponse {
    return {
      id: b.id,
      userId: b.userId,
      name: b.name,
      tin: b.tin,
      registrationNumber: b.registrationNumber,
      msicCode: b.msicCode,
      sstRegistration: b.sstRegistrationNumber,
      addressLine1: b.addressLine1,
      addressLine2: b.addressLine2,
      city: b.cityName,
      postcode: b.postalZone,
      state: b.stateCode,
      country: b.countryCode,
      email: b.email,
      phone: b.phone,
      hasLhdnCredentials:
        b.lhdnClientIdEncrypted !== null && b.lhdnClientSecretEncrypted !== null,
      isActive: Boolean(b.isActive),
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }
}
