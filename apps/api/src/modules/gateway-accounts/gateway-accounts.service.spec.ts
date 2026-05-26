import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GatewayAccountStatus,
  GatewayKycStatus,
  VerificationStatus,
} from "@prisma/client";
import { PaymentGateway } from "../payments/gateways/payment-gateway";
import {
  GatewayAccountsService,
  maskBankAccount,
  maskDocument,
  maskPix,
} from "./gateway-accounts.service";

const freelancer = {
  id: "freelancer-1",
  userId: "freelancer-user",
  fullName: "Freelancer Um",
  displayName: "Freela Um",
  verificationStatus: VerificationStatus.VERIFIED,
  user: {
    id: "freelancer-user",
    name: "Freelancer Um",
    email: "freela@nexo.local",
    phone: "79999999999",
  },
};

const dto = {
  documentType: "CPF",
  documentNumber: "12345678900",
  holderName: "Freelancer Um",
  bankCode: "001",
  agency: "1234",
  account: "12345",
  accountDigit: "6",
  accountType: "CHECKING",
  pixKey: "freela@nexo.local",
  pixKeyType: "EMAIL",
};

const config = {
  get: (key: string) =>
    key === "PAYMENT_GATEWAY_PROVIDER" ? "simulated" : undefined,
};

function createGatewayMock(overrides: Partial<PaymentGateway> = {}) {
  return {
    createCustomer: async () => ({ gatewayCustomerId: "customer-1" }),
    createCharge: async () => {
      throw new Error("not used");
    },
    createMarketplacePayment: async () => {
      throw new Error("not used");
    },
    confirmCharge: async () => {
      throw new Error("not used");
    },
    cancelCharge: async () => undefined,
    refundCharge: async () => undefined,
    createRecipient: async () => ({
      gatewayRecipientId: "sim_recipient_1",
      gatewayWalletId: "sim_wallet_1",
      status: GatewayAccountStatus.ACTIVE,
      kycStatus: GatewayKycStatus.APPROVED,
      raw: { ok: true },
    }),
    updateRecipient: async () => ({
      gatewayRecipientId: "sim_recipient_1",
      gatewayWalletId: "sim_wallet_1",
      status: GatewayAccountStatus.ACTIVE,
      kycStatus: GatewayKycStatus.APPROVED,
    }),
    createSplit: async () => undefined,
    releaseSplit: async () => undefined,
    processWebhook: async () => {
      throw new Error("not used");
    },
    getTransactionStatus: async () => {
      throw new Error("not used");
    },
    getRecipientStatus: async () => ({
      status: GatewayAccountStatus.ACTIVE,
      kycStatus: GatewayKycStatus.APPROVED,
    }),
    ...overrides,
  } satisfies PaymentGateway;
}

function createPrismaMock() {
  let account: Record<string, unknown> | null = null;
  const auditActions: string[] = [];

  return {
    auditActions,
    prisma: {
      freelancerProfile: {
        findUnique: async () => freelancer,
      },
      gatewayAccount: {
        findUnique: async () => account,
        findFirst: async () => account,
        upsert: async ({ create, update }: { create: object; update: object }) => {
          account = {
            id: "gateway-account-1",
            createdAt: new Date("2026-05-25T12:00:00.000Z"),
            updatedAt: new Date("2026-05-25T12:00:00.000Z"),
            userId: "freelancer-user",
            companyId: null,
            gatewayCustomerId: null,
            ...(account ? update : create),
          };
          return account;
        },
      },
      auditLog: {
        create: async ({ data }: { data: { action: string } }) => {
          auditActions.push(data.action);
          return {};
        },
      },
    },
  };
}

describe("GatewayAccountsService", () => {
  it("creates a simulated freelancer gateway account and returns masked data", async () => {
    const { prisma, auditActions } = createPrismaMock();
    const service = new GatewayAccountsService(
      prisma as never,
      config as never,
      createGatewayMock(),
    );

    const result = (await service.upsertFreelancerAccount(
      "freelancer-user",
      dto,
      { userId: "freelancer-user", role: "FREELANCER" },
    )) as {
      status: GatewayAccountStatus;
      kycStatus: GatewayKycStatus;
      documentNumber: string | null;
      account: string | null;
      pixKey: string | null;
    };

    assert.equal(result.status, GatewayAccountStatus.ACTIVE);
    assert.equal(result.kycStatus, GatewayKycStatus.APPROVED);
    assert.equal(result.documentNumber, "***.456.789-**");
    assert.equal(result.account, "****5-6");
    assert.equal(result.pixKey, "fr***@nexo.local");
    assert.deepEqual(auditActions, ["GATEWAY_ACCOUNT_CREATED"]);
  });

  it("saves ERROR status when the gateway fails", async () => {
    const { prisma, auditActions } = createPrismaMock();
    const service = new GatewayAccountsService(
      prisma as never,
      config as never,
      createGatewayMock({
        createRecipient: async () => {
          throw new Error("gateway offline");
        },
      }),
    );

    const result = (await service.upsertFreelancerAccount(
      "freelancer-user",
      dto,
      { userId: "freelancer-user", role: "FREELANCER" },
    )) as {
      status: GatewayAccountStatus;
      kycStatus: GatewayKycStatus;
    };

    assert.equal(result.status, GatewayAccountStatus.ERROR);
    assert.equal(result.kycStatus, GatewayKycStatus.REQUIRED_MORE_INFO);
    assert.deepEqual(auditActions, ["GATEWAY_ACCOUNT_ERROR"]);
  });

  it("masks sensitive values", () => {
    assert.equal(maskDocument("12345678900"), "***.456.789-**");
    assert.equal(maskBankAccount("12345", "6"), "****5-6");
    assert.equal(maskPix("freela@nexo.local"), "fr***@nexo.local");
  });
});
