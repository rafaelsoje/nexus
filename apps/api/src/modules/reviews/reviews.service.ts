import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContractStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDto } from "./dto/create-review.dto";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string, role: UserRole) {
    if (role === UserRole.COMPANY) {
      const company = await this.findCompanyByUserId(userId);
      return this.prisma.review.findMany({
        where: {
          OR: [
            { companyReviewerId: company.id },
            { companyReviewedId: company.id },
          ],
        },
        orderBy: { createdAt: "desc" },
        include: { contract: { include: { event: true, freelancer: true } } },
      });
    }

    const freelancer = await this.findFreelancerByUserId(userId);
    return this.prisma.review.findMany({
      where: {
        OR: [
          { freelancerReviewerId: freelancer.id },
          { freelancerReviewedId: freelancer.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: { contract: { include: { event: true, company: true } } },
    });
  }

  async create(userId: string, role: UserRole, dto: CreateReviewDto) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: dto.contractId },
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    if (contract.status !== ContractStatus.COMPLETED && contract.status !== ContractStatus.PAID) {
      throw new BadRequestException(
        "Contract must be completed or paid before review",
      );
    }

    if (role === UserRole.COMPANY) {
      const company = await this.findCompanyByUserId(userId);

      if (contract.companyId !== company.id) {
        throw new ForbiddenException("Review is not allowed for this contract");
      }

      return this.prisma.review.create({
        data: {
          contractId: contract.id,
          companyReviewerId: company.id,
          freelancerReviewedId: contract.freelancerId,
          punctuality: dto.punctuality,
          technicalQuality: dto.technicalQuality,
          professionalPosture: dto.professionalPosture,
          communication: dto.communication,
          overallRating: dto.overallRating,
          comment: dto.comment,
        },
      });
    }

    const freelancer = await this.findFreelancerByUserId(userId);

    if (contract.freelancerId !== freelancer.id) {
      throw new ForbiddenException("Review is not allowed for this contract");
    }

    return this.prisma.review.create({
      data: {
        contractId: contract.id,
        freelancerReviewerId: freelancer.id,
        companyReviewedId: contract.companyId,
        organization: dto.organization,
        informationClarity: dto.informationClarity,
        payment: dto.payment,
        professionalTreatment: dto.professionalTreatment,
        overallRating: dto.overallRating,
        comment: dto.comment,
      },
    });
  }

  private async findCompanyByUserId(userId: string) {
    const company = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!company) {
      throw new ForbiddenException("Company profile is required");
    }

    return company;
  }

  private async findFreelancerByUserId(userId: string) {
    const freelancer = await this.prisma.freelancerProfile.findUnique({
      where: { userId },
    });

    if (!freelancer) {
      throw new ForbiddenException("Freelancer profile is required");
    }

    return freelancer;
  }
}
