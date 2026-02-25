import type { ITeamRepository } from './team.repository.interface.js';
import type { InviteMemberDto, UpdateMemberRoleDto, MemberResponse } from './team.dto.js';
import type { BusinessMember, MemberRole } from '../../db/schema/business-members.js';
import { MEMBER_ROLE_HIERARCHY } from '../../db/schema/business-members.js';
import { newId } from '../../utils/uuid.js';
import { nowISO } from '../../utils/date.js';
import { expiresInSeconds } from '../../utils/date.js';
import { AppError } from '../../errors/app-error.js';

const INVITE_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class TeamService {
  constructor(private readonly repo: ITeamRepository) {}

  async listMembers(businessId: string): Promise<MemberResponse[]> {
    const members = await this.repo.findByBusinessId(businessId);
    return members.map(this._toResponse);
  }

  async getMyMembership(userId: string, businessId: string): Promise<MemberResponse> {
    const member = await this.repo.findByUserAndBusiness(userId, businessId);
    if (!member) throw new AppError(404, 'MEMBER_NOT_FOUND', 'Membership not found');
    return this._toResponse(member);
  }

  async invite(
    businessId: string,
    invitedByUserId: string,
    actorRole: MemberRole,
    dto: InviteMemberDto,
  ): Promise<MemberResponse> {
    // Prevent inviting with a role >= actor's own role (can't grant what you don't have)
    if (MEMBER_ROLE_HIERARCHY[dto.role] >= MEMBER_ROLE_HIERARCHY[actorRole]) {
      throw new AppError(
        403,
        'CANNOT_GRANT_ROLE',
        `You cannot invite someone with the '${dto.role}' role`,
      );
    }

    const now = nowISO();
    // Generate a random invite token stored directly (unique constraint handles collisions)
    const rawToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    const member = await this.repo.create({
      id: newId(),
      businessId,
      userId: null,
      role: dto.role,
      invitedByUserId,
      inviteToken: rawToken,
      inviteEmail: dto.email,
      inviteExpiresAt: expiresInSeconds(INVITE_EXPIRY_SECONDS),
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return this._toResponse(member);
  }

  async acceptInvite(token: string, userId: string): Promise<MemberResponse> {
    const member = await this.repo.findByInviteToken(token);
    if (!member) {
      throw new AppError(404, 'INVITE_NOT_FOUND', 'Invite token is invalid or has already been used');
    }
    if (member.acceptedAt) {
      throw new AppError(409, 'INVITE_ALREADY_ACCEPTED', 'This invite has already been accepted');
    }
    if (member.inviteExpiresAt && new Date(member.inviteExpiresAt) <= new Date()) {
      throw new AppError(410, 'INVITE_EXPIRED', 'This invite has expired');
    }

    const updated = await this.repo.update(member.id, {
      userId,
      inviteToken: null,
      acceptedAt: nowISO(),
      updatedAt: nowISO(),
    });
    return this._toResponse(updated);
  }

  async updateRole(
    memberId: string,
    businessId: string,
    actorRole: MemberRole,
    dto: UpdateMemberRoleDto,
  ): Promise<MemberResponse> {
    const member = await this._getMemberInBusiness(memberId, businessId);

    if (member.role === 'OWNER') {
      throw new AppError(403, 'CANNOT_CHANGE_OWNER_ROLE', "The owner's role cannot be changed");
    }
    if (MEMBER_ROLE_HIERARCHY[dto.role] >= MEMBER_ROLE_HIERARCHY[actorRole]) {
      throw new AppError(
        403,
        'CANNOT_GRANT_ROLE',
        `You cannot assign the '${dto.role}' role`,
      );
    }

    const updated = await this.repo.update(memberId, {
      role: dto.role,
      updatedAt: nowISO(),
    });
    return this._toResponse(updated);
  }

  async removeMember(
    memberId: string,
    businessId: string,
    actorUserId: string,
    actorRole: MemberRole,
  ): Promise<void> {
    const member = await this._getMemberInBusiness(memberId, businessId);

    if (member.role === 'OWNER') {
      throw new AppError(403, 'CANNOT_REMOVE_OWNER', 'The business owner cannot be removed');
    }
    // ADMINs can remove VIEWER/ACCOUNTANT; only OWNER can remove ADMIN
    if (
      member.role === 'ADMIN' &&
      actorRole !== 'OWNER'
    ) {
      throw new AppError(403, 'INSUFFICIENT_ROLE', 'Only the owner can remove an admin');
    }
    // Prevent self-removal confusion — use a dedicated leave endpoint if needed
    if (member.userId === actorUserId) {
      throw new AppError(400, 'CANNOT_REMOVE_SELF', 'You cannot remove yourself');
    }

    await this.repo.delete(memberId);
  }

  private async _getMemberInBusiness(memberId: string, businessId: string): Promise<BusinessMember> {
    const member = await this.repo.findById(memberId);
    if (!member || member.businessId !== businessId) {
      throw new AppError(404, 'MEMBER_NOT_FOUND', 'Team member not found');
    }
    return member;
  }

  private _toResponse(m: BusinessMember): MemberResponse {
    return {
      id: m.id,
      businessId: m.businessId,
      userId: m.userId,
      role: m.role,
      inviteEmail: m.inviteEmail,
      acceptedAt: m.acceptedAt,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
