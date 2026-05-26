import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  ContractStatus,
  GatewayAccountStatus,
  GatewayKycStatus,
  GatewayProvider,
  PaymentStatus,
  VerificationStatus,
} from "@prisma/client";
import { PaymentGateway } from "./gateways/payment-gateway";
import { PaymentsService } from "./payments.service";

const company = {
  id: "company-1",
  companyName: "NEXO Eventos",
  verificationStatus: VerificationStatus.VERIFIED,
  wallet: null,
};

const event = {
  id: "event-1",
  name: "Festival NEXO",
};

const payableContract = {
  id: "contract-1",
  companyId: company.id,
  freelancerId: "freelancer-1",
  eventId: event.id,
  status: ContractStatus.PENDING_PAYMENT,
  amountCents: 100000,
  platformFeeCents: 12000,
  paymentSplits: [],
  event,
  company,
  freelancer: {
    id: "freelancer-1",
    userId: "freelancer-user",
    fullName: "Freelancer Um",
    displayName: "Freela Um",
    cpf: "12345678901",
    bankData: null,
    verificationStatus: VerificationStatus.VERIFIED,
    user: { name: "Freelancer Um" },
    wallet: null,
    gatewayAccounts: [
      {
        gateway: GatewayProvider.SIMULATED,
        gatewayRecipientId: "recipient-freelancer-1",
        gatewayWalletId: "wallet-freelancer-1",
        status: GatewayAccountStatus.ACTIVE,
        kycStatus: GatewayKycStatus.APPROVED,
      },
    ],
  },
};

function createGatewayMock(): PaymentGateway {
  return {
    createCustomer: async (input) => ({
      gatewayCustomerId: `customer-${input.userId}`,
    }),
    createCharge: async () => {
      throw new Error("Legacy charge should not be used");
    },
    createMarketplacePayment: async (input) => {
      assert.equal(input.eventId, event.id);
      assert.equal(input.companyId, company.id);
      assert.equal(input.grossAmountCents, 112000);
      assert.equal(input.companyFeeAmountCents, 12000);
      assert.equal(input.platformAmountCents, 12000);
      assert.equal(input.totalFreelancerAmountCents, 100000);
      assert.equal(input.amountToChargeCompanyCents, 112000);
      assert.equal(input.walletAmountCents, 0);
      assert.equal(input.gatewayAmountCents, 112000);
      assert.equal(input.splits.length, 1);
      assert.equal(input.splits[0]?.contractId, "contract-1");
      assert.equal(input.splits[0]?.freelancerNetAmountCents, 100000);

      return {
        status: PaymentStatus.PAID,
        gatewayTransactionId: "gateway-tx-1",
        gatewayPaymentId: "gateway-payment-1",
        paidAt: new Date("2026-06-10T18:00:00.000Z"),
        gatewayFeeAmountCents: 0,
        splits: [
          {
            recipientType: "FREELANCER",
            contractId: "contract-1",
            freelancerId: "freelancer-1",
            amountCents: 100000,
            gatewayRecipientId: "recipient-freelancer-1",
          },
        ],
      };
    },
    confirmCharge: async (transactionId) => ({
      status: PaymentStatus.PAID,
      gatewayTransactionId: transactionId,
      paidAt: new Date("2026-06-10T18:00:00.000Z"),
      splits: [],
    }),
    cancelCharge: async () => undefined,
    refundCharge: async () => undefined,
    createRecipient: async (input) => ({
      gatewayRecipientId: `recipient-${input.freelancerId}`,
      gatewayWalletId: `wallet-${input.freelancerId}`,
    }),
    updateRecipient: async (input) => ({
      gatewayRecipientId: input.gatewayRecipientId,
      gatewayWalletId: `wallet-${input.freelancerId}`,
    }),
    createSplit: async () => undefined,
    releaseSplit: async () => undefined,
    processWebhook: async () => ({
      event: "PAYMENT_APPROVED",
      transactionId: "gateway-tx-1",
      status: PaymentStatus.PAID,
    }),
    getTransactionStatus: async () => PaymentStatus.PAID,
    getRecipientStatus: async () => ({
      status: GatewayAccountStatus.ACTIVE,
      kycStatus: GatewayKycStatus.APPROVED,
    }),
  };
}

function createPrismaMock(contracts = [payableContract]) {
  return {
    contract: {
      findUnique: async () => ({ eventId: event.id }),
      findMany: async () => contracts,
      updateMany: async () => ({ count: contracts.length }),
    },
    gatewayAccount: {
      upsert: async () => ({
        id: "gateway-account-1",
        userId: "freelancer-user",
        freelancerId: "freelancer-1",
        companyId: null,
        gateway: GatewayProvider.SIMULATED,
        gatewayCustomerId: null,
        gatewayRecipientId: "recipient-freelancer-1",
        gatewayWalletId: "wallet-freelancer-1",
        status: GatewayAccountStatus.ACTIVE,
        kycStatus: GatewayKycStatus.APPROVED,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    $transaction: async (callback: (tx: unknown) => unknown) => {
      return callback({
        payment: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            assert.equal(data.companyId, company.id);
            assert.equal(data.eventId, event.id);
            assert.equal(data.status, PaymentStatus.PAID);
            assert.equal(data.grossAmountCents, 112000);
            assert.equal(data.totalFreelancerAmountCents, 100000);
            assert.equal(data.platformAmountCents, 12000);
            assert.equal(data.gatewayTransactionId, "gateway-tx-1");

            return {
              id: "payment-1",
              ...data,
            };
          },
        },
        contract: {
          updateMany: async ({ data }: { data: { status: ContractStatus } }) => {
            assert.equal(data.status, ContractStatus.CONFIRMED);
          },
        },
        wallet: {
          update: async () => ({}),
        },
        transaction: {
          create: async () => ({}),
        },
        notification: {
          createMany: async () => ({}),
        },
        auditLog: {
          create: async () => ({}),
        },
      });
    },
  };
}

const companyAccess = {
  findCompanyForUser: async () => company,
  notifyCompanyMembers: async () => undefined,
};

const config = {
  get: () => undefined,
};

describe("PaymentsService", () => {
  it("creates a marketplace payment for payable event contracts", async () => {
    const service = new PaymentsService(
      createPrismaMock() as never,
      createGatewayMock(),
      companyAccess as never,
      config as never,
    );

    const payment = await service.processPayment("company-user", "contract-1");

    assert.equal(payment.gatewayTransactionId, "gateway-tx-1");
  });

  it("blocks event payment when there are no payable contracts", async () => {
    const service = new PaymentsService(
      createPrismaMock([]) as never,
      createGatewayMock(),
      companyAccess as never,
      config as never,
    );

    await assert.rejects(
      () => service.processPayment("company-user", "contract-1"),
      BadRequestException,
    );
  });
});
