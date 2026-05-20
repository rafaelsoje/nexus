import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  ContractStatus,
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

const payableContract = {
  id: "contract-1",
  companyId: company.id,
  freelancerId: "freelancer-1",
  status: ContractStatus.PENDING_PAYMENT,
  amountCents: 100000,
  platformFeeCents: 12000,
  payment: null,
  event: { name: "Festival NEXO" },
  company,
  freelancer: {
    userId: "freelancer-user",
    verificationStatus: VerificationStatus.VERIFIED,
    wallet: null,
  },
};

function createGatewayMock(): PaymentGateway {
  return {
    createCharge: async (input) => {
      assert.equal(input.contractId, "contract-1");
      assert.equal(input.companyId, "company-1");
      assert.equal(input.freelancerId, "freelancer-1");
      assert.equal(input.grossAmountCents, 112000);
      assert.equal(input.freelancerAmountCents, 100000);
      assert.equal(input.freelancerNetAmountCents, 100000);
      assert.equal(input.companyFeeAmountCents, 12000);
      assert.equal(input.freelancerFeeAmountCents, 0);
      assert.equal(input.platformFeeCents, 12000);
      assert.equal(input.platformAmountCents, 12000);
      assert.equal(input.walletAmountCents, 0);
      assert.equal(input.gatewayAmountCents, 112000);

      return {
        status: PaymentStatus.PAID,
        gatewayTransactionId: "gateway-tx-1",
        paidAt: new Date("2026-06-10T18:00:00.000Z"),
        gatewayFeeAmountCents: 0,
        splits: [
          {
            recipientType: "FREELANCER",
            amountCents: 100000,
            gatewayRecipientId: "recipient-freelancer-1",
          },
          {
            recipientType: "PLATFORM",
            amountCents: 12000,
            gatewayRecipientId: "recipient-platform",
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
    }),
    createSplit: async () => undefined,
    processWebhook: async () => ({
      event: "PAYMENT_APPROVED",
      transactionId: "gateway-tx-1",
      status: PaymentStatus.PAID,
    }),
    getTransactionStatus: async () => PaymentStatus.PAID,
  };
}

function createPrismaMock(contract: Record<string, unknown> = payableContract) {
  return {
    companyProfile: {
      findUnique: async () => company,
    },
    contract: {
      findFirst: async () => contract,
    },
    $transaction: async (callback: (tx: unknown) => unknown) => {
      return callback({
        payment: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            assert.equal(data.contractId, "contract-1");
            assert.equal(data.status, PaymentStatus.PAID);
            assert.equal(data.grossAmountCents, 112000);
            assert.equal(data.freelancerAmountCents, 100000);
            assert.equal(data.platformFeeCents, 12000);
            assert.equal(data.companyFeeAmountCents, 12000);
            assert.equal(data.freelancerFeeAmountCents, 0);
            assert.equal(data.gatewayFeeAmountCents, 0);
            assert.equal(data.platformAmountCents, 12000);
            assert.equal(data.freelancerNetAmountCents, 100000);
            assert.equal(data.amountToChargeCompanyCents, 112000);
            assert.equal(data.amountToReleaseFreelancerCents, 100000);
            assert.equal(data.walletAmountCents, 0);
            assert.equal(data.gatewayAmountCents, 112000);
            assert.equal(data.gatewayTransactionId, "gateway-tx-1");
            assert.deepEqual(data.splits, {
              create: [
                {
                  recipientType: "FREELANCER",
                  amountCents: 100000,
                  gatewayRecipientId: "recipient-freelancer-1",
                },
                {
                  recipientType: "PLATFORM",
                  amountCents: 12000,
                  gatewayRecipientId: "recipient-platform",
                },
              ],
            });

            return {
              id: "payment-1",
              ...data,
            };
          },
        },
        contract: {
          update: async ({ data }: { data: { status: ContractStatus } }) => {
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
  it("processes a payment through the configured gateway", async () => {
    const service = new PaymentsService(
      createPrismaMock() as never,
      createGatewayMock(),
      companyAccess as never,
      config as never,
    );

    const payment = await service.processPayment("company-user", "contract-1");

    assert.equal(payment.gatewayTransactionId, "gateway-tx-1");
  });

  it("blocks duplicate payments for a contract", async () => {
    const service = new PaymentsService(
      createPrismaMock({
        ...payableContract,
        payment: { id: "payment-1" },
      }) as never,
      createGatewayMock(),
      companyAccess as never,
      config as never,
    );

    await assert.rejects(
      () => service.processPayment("company-user", "contract-1"),
      BadRequestException,
    );
  });

  it("blocks payments when the contract is not awaiting payment", async () => {
    const service = new PaymentsService(
      createPrismaMock({
        ...payableContract,
        status: ContractStatus.CONFIRMED,
      }) as never,
      createGatewayMock(),
      companyAccess as never,
      config as never,
    );

    await assert.rejects(
      () => service.processPayment("company-user", "contract-1"),
      BadRequestException,
    );
  });

  it("blocks payments when participants are not verified", async () => {
    const service = new PaymentsService(
      createPrismaMock({
        ...payableContract,
        freelancer: {
          ...payableContract.freelancer,
          verificationStatus: VerificationStatus.PENDING,
        },
      }) as never,
      createGatewayMock(),
      companyAccess as never,
      config as never,
    );

    await assert.rejects(
      () => service.processPayment("company-user", "contract-1"),
      ForbiddenException,
    );
  });

  it("uses company wallet balance before charging the gateway complement", async () => {
    let gatewayAmountCents = 0;
    let debitedAmountCents = 0;
    const service = new PaymentsService(
      {
        companyProfile: {
          findUnique: async () => company,
        },
        contract: {
          findFirst: async () => ({
            ...payableContract,
            company: {
              ...company,
              wallet: { id: "wallet-company-1", balanceCents: 70000 },
            },
          }),
        },
        auditLog: {
          create: async () => ({}),
        },
        $transaction: async (callback: (tx: unknown) => unknown) => {
          return callback({
            payment: {
              create: async ({ data }: { data: Record<string, unknown> }) => ({
                id: "payment-1",
                ...data,
              }),
            },
            contract: {
              update: async () => ({}),
            },
            wallet: {
              update: async ({
                data,
              }: {
                data: { balanceCents: { decrement: number } };
              }) => {
                debitedAmountCents = data.balanceCents.decrement;
              },
            },
            transaction: {
              create: async () => ({}),
            },
            notification: {
              create: async () => ({}),
            },
          });
        },
      } as never,
      {
        ...createGatewayMock(),
        createCharge: async (input) => {
          gatewayAmountCents = input.gatewayAmountCents;

          return {
            status: PaymentStatus.PAID,
            gatewayTransactionId: "gateway-complement-1",
            paidAt: new Date("2026-06-10T18:00:00.000Z"),
            gatewayFeeAmountCents: 0,
            splits: [],
          };
        },
      },
      companyAccess as never,
      config as never,
    );

    const payment = await service.processPayment("company-user", "contract-1");

    assert.equal(gatewayAmountCents, 42000);
    assert.equal(debitedAmountCents, 70000);
    assert.equal(payment.gatewayTransactionId, "gateway-complement-1");
  });

  it("processes due releases after the post-event deadline", async () => {
    const service = new PaymentsService(
      {
        payment: {
          findMany: async () => [
            {
              id: "payment-1",
              status: PaymentStatus.PAID,
              freelancerAmountCents: 100000,
              amountToReleaseFreelancerCents: 100000,
              contractId: "contract-1",
              contract: {
                endsAt: new Date("2026-06-10T23:00:00.000Z"),
                disputes: [],
              },
            },
          ],
          findUnique: async () => ({
            id: "payment-1",
            status: PaymentStatus.PAID,
            freelancerAmountCents: 100000,
            amountToReleaseFreelancerCents: 100000,
            contractId: "contract-1",
            contract: {
              status: ContractStatus.CONFIRMED,
              endsAt: new Date("2026-06-10T23:00:00.000Z"),
              disputes: [],
              company: { userId: "company-user" },
              event: { name: "Festival NEXO" },
              freelancer: {
                userId: "freelancer-user",
                wallet: { id: "wallet-freelancer-1" },
              },
            },
          }),
        },
        auditLog: {
          create: async () => ({}),
        },
        $transaction: async (callback: (tx: unknown) => unknown) => {
          return callback({
            wallet: {
              update: async () => ({}),
            },
            transaction: {
              create: async () => ({}),
            },
            contract: {
              update: async () => ({}),
            },
            payment: {
              update: async () => ({
                id: "payment-1",
                status: PaymentStatus.RELEASED_TO_FREELANCER,
              }),
            },
            notification: {
              createMany: async () => ({}),
            },
          });
        },
      } as never,
      createGatewayMock(),
      companyAccess as never,
      config as never,
    );

    const result = await service.processDueReleases(
      new Date("2026-06-12T12:00:00.000Z"),
    );

    assert.equal(result.checked, 1);
    assert.equal(result.eligible, 1);
    assert.equal(result.released, 1);
  });

  it("notifies companies during the post-event no-show review window once", async () => {
    let notificationSent = false;
    let auditCreated = false;
    const service = new PaymentsService(
      {
        payment: {
          findMany: async ({ where }: { where: Record<string, unknown> }) => {
            if (where.status !== PaymentStatus.PAID) {
              return [];
            }

            return [
              {
                id: "payment-1",
                status: PaymentStatus.PAID,
                contractId: "contract-1",
                contract: {
                  id: "contract-1",
                  companyId: "company-1",
                  eventId: "event-1",
                  endsAt: new Date("2026-06-10T23:00:00.000Z"),
                  disputes: [],
                  event: { name: "Festival NEXO" },
                },
              },
            ];
          },
        },
        auditLog: {
          findFirst: async () => null,
          create: async () => ({}),
        },
        $transaction: async (callback: (tx: unknown) => unknown) => {
          return callback({
            auditLog: {
              create: async ({
                data,
              }: {
                data: { action: string; entityId: string };
              }) => {
                assert.equal(data.action, "POST_EVENT_REVIEW_REMINDER_SENT");
                assert.equal(data.entityId, "contract-1");
                auditCreated = true;
              },
            },
          });
        },
      } as never,
      createGatewayMock(),
      {
        ...companyAccess,
        notifyCompanyMembers: async (_tx: unknown, companyId: string) => {
          assert.equal(companyId, "company-1");
          notificationSent = true;
        },
      } as never,
      config as never,
    );

    const result = await service.processPostEventAutomation(
      new Date("2026-06-11T12:00:00.000Z"),
    );

    assert.equal(result.reminders.checked, 1);
    assert.equal(result.reminders.sent, 1);
    assert.equal(result.releases.released, 0);
    assert.equal(notificationSent, true);
    assert.equal(auditCreated, true);
  });
});
