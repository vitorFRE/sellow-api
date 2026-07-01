import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'modules/prisma/prisma.service';

type CreateUserData = {
  email: string;
  name?: string;
  password?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByIdSafe(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const select = {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ skip, take: limit, select }),
      this.prisma.user.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateRefreshToken(userId: string, hashedToken: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }
}
