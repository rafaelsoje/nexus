import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ContractStatus,
  PaymentStatus,
  TransactionType,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) {
      return this.prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          contract: {
            include: { event: true, company: true, freelancer: true },
          },
          splits: true,
        },
      });
    }

    if (role === UserRole.COMPANY) {
      const company = await this.findCompanyByUserId(userId);
      return this.prisma.payment.findMany({
        where: { contract: { companyId: company.id } },
        orderBy: { createdAt: "desc" },
        include: {
          contract: { include: { event: true, freelancer: true } },
          splits: true,
        },
      });
    }

    const freelancer = await this.findFreelancerByUserId(userId);
    return this.prisma.payment.findMany({
      where: { contract: { freelancerId: freelancer.id } },
      orderBy: { createdAt: "desc" },
      include: {
        contract: { include: { event: true, company: true } },
        splits: true,
      },
    });
  }

  async simulatePayment(userId: string, contractId: string) {
    const company = await this.findCompanyByUserId(userId);
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, companyId: company.id },
      include: { payment: true, freelancer: { include: { wallet: true } } },
    });

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    if (contract.payment) {
      throw new BadRequestException("Contract already has a payment");
    }

    const freelancerAmountCents = contract.amountCents;
    const platformFeeCents = contract.platformFeeCents;
    const grossAmountCents = freelancerAmountCents + platformFeeCents;

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          contractId: contract.id,
          status: PaymentStatus.PAID,
          grossAmountCents,
          freelancerAmountCents,
          platformFeeCents,
          gatewayTransactionId: `sim_${Date.now()}`,
          paidAt: new Date(),
          splits: {
            create: [
              {
                recipientType: "FREELANCER",
                amountCents: freelancerAmountCents,
                gatewayRecipientId: `freelancer_${contract.freelancerId}`,
              },
              {
                recipientType: "PLATFORM",
                amountCents: platformFeeCents,
                gatewayRecipientId: "platform",
              },
            ],
          },
        },
        include: { splits: true },
      });

      await tx.contract.update({
        where: { id: contract.id },
        data: { status: ContractStatus.CONFIRMED },
      });

      return payment;
    });
  }

  async releaseToFreelancer(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        contract: { include: { freelancer: { include: { wallet: true } } } },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.status === PaymentStatus.RELEASED_TO_FREELANCER) {
      throw new BadRequestException("Payment already released");
    }

    const wallet = payment.contract.freelancer.wallet;

    if (!wallet) {
      throw new BadRequestException("Freelancer wallet not found");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: { increment: payment.freelancerAmountCents } },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.CREDIT,
          amountCents: payment.freelancerAmountCents,
          description: `Liberação do pagamento ${payment.id}`,
        },
      });

      await tx.contract.update({
        where: { id: payment.contractId },
        data: { status: ContractStatus.PAID },
      });

      return tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.RELEASED_TO_FREELANCER },
        include: { splits: true },
      });
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
