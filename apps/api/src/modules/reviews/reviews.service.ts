import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContractStatus, Prisma, UserRole } from "@prisma/client";
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
      include: {
        company: { include: { user: true } },
        event: true,
        freelancer: { include: { user: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    if (
      contract.status !== ContractStatus.COMPLETED &&
      contract.status !== ContractStatus.PAID
    ) {
      throw new BadRequestException(
        "Contract must be completed or paid before review",
      );
    }

    if (role === UserRole.COMPANY) {
      const company = await this.findCompanyByUserId(userId);

      if (contract.companyId !== company.id) {
        throw new ForbiddenException("Review is not allowed for this contract");
      }

      const alreadyReviewed = await this.prisma.review.findFirst({
        where: { contractId: contract.id, companyReviewerId: company.id },
      });

      if (alreadyReviewed) {
        throw new BadRequestException("Contract was already reviewed");
      }

      return this.prisma.$transaction(async (tx) => {
        const review = await tx.review.create({
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

        await this.updateFreelancerRatingAverage(tx, contract.freelancerId);
        await tx.notification.create({
          data: {
            userId: contract.freelancer.userId,
            type: "REVIEW_RECEIVED",
            title: "Nova avaliação recebida",
            body: `${contract.company.companyName} avaliou sua participação em ${contract.event.name}.`,
          },
        });

        return review;
      });
    }

    const freelancer = await this.findFreelancerByUserId(userId);

    if (contract.freelancerId !== freelancer.id) {
      throw new ForbiddenException("Review is not allowed for this contract");
    }

    const alreadyReviewed = await this.prisma.review.findFirst({
      where: { contractId: contract.id, freelancerReviewerId: freelancer.id },
    });

    if (alreadyReviewed) {
      throw new BadRequestException("Contract was already reviewed");
    }

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
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

      await this.updateCompanyRatingAverage(tx, contract.companyId);
      await tx.notification.create({
        data: {
          userId: contract.company.userId,
          type: "REVIEW_RECEIVED",
          title: "Nova avaliação recebida",
          body: `${contract.freelancer.displayName ?? contract.freelancer.user.name} avaliou sua empresa.`,
        },
      });

      return review;
    });
  }

  private async updateCompanyRatingAverage(
    tx: Prisma.TransactionClient,
    companyId: string,
  ) {
    const result = await tx.review.aggregate({
      where: { companyReviewedId: companyId },
      _avg: { overallRating: true },
    });

    await tx.companyProfile.update({
      where: { id: companyId },
      data: { ratingAverage: this.toRatingAverage(result._avg.overallRating) },
    });
  }

  private async updateFreelancerRatingAverage(
    tx: Prisma.TransactionClient,
    freelancerId: string,
  ) {
    const result = await tx.review.aggregate({
      where: { freelancerReviewedId: freelancerId },
      _avg: { overallRating: true },
    });

    await tx.freelancerProfile.update({
      where: { id: freelancerId },
      data: { ratingAverage: this.toRatingAverage(result._avg.overallRating) },
    });
  }

  private toRatingAverage(value?: number | null) {
    return value ? Number(value.toFixed(2)) : 0;
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
