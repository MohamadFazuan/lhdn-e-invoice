import type { IUserRepository } from './user.repository.interface.js';
import type { UpdateUserDto, UserResponse } from './user.dto.js';
import { hashPassword } from '../../utils/hash.js';
import { nowISO } from '../../utils/date.js';
import { AppError } from '../../errors/app-error.js';

export class UserService {
  constructor(
    private readonly repo: IUserRepository,
    private readonly bcryptRounds: number,
  ) {}

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.repo.findById(userId);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    return this._toResponse(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<UserResponse> {
    if (dto.email) {
      const existing = await this.repo.findByEmail(dto.email);
      if (existing && existing.id !== userId) {
        throw new AppError(409, 'EMAIL_TAKEN', 'This email is already in use');
      }
    }

    const updates: Parameters<IUserRepository['update']>[1] = { updatedAt: nowISO() };
    if (dto.email) updates.email = dto.email;
    if (dto.password) updates.passwordHash = await hashPassword(dto.password, this.bcryptRounds);

    const user = await this.repo.update(userId, updates);
    return this._toResponse(user);
  }

  private _toResponse(user: Awaited<ReturnType<IUserRepository['findById']>> & {}): UserResponse {
    return {
      id: user!.id,
      email: user!.email,
      name: user!.name ?? '',
      role: user!.role,
      isActive: Boolean(user!.isActive),
      createdAt: user!.createdAt,
      updatedAt: user!.updatedAt,
    };
  }
}
