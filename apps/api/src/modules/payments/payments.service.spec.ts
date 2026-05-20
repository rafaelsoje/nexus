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
    charge: async (input) => {
      assert.equal(input.contractId, "contract-1");
      assert.equal(input.companyId, "company-1");
      assert.equal(input.freelancerId, "freelancer-1");
      assert.equal(input.grossAmountCents, 112000);
      assert.equal(input.freelancerAmountCents, 100000);
      assert.equal(input.platformFeeCents, 12000);
      assert.equal(input.walletAmountCents, 0);
      assert.equal(input.gatewayAmountCents, 112000);

      return {
        status: PaymentStatus.PAID,
        gatewayTransactionId: "gateway-tx-1",
        paidAt: new Date("2026-06-10T18:00:00.000Z"),
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

describe("PaymentsService", () => {
  it("processes a payment through the configured gateway", async () => {
    const service = new PaymentsService(
      createPrismaMock() as never,
      createGatewayMock(),
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
        charge: async (input) => {
          gatewayAmountCents = input.gatewayAmountCents;

          return {
            status: PaymentStatus.PAID,
            gatewayTransactionId: "gateway-complement-1",
            paidAt: new Date("2026-06-10T18:00:00.000Z"),
            splits: [],
          };
        },
      },
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
    );

    const result = await service.processDueReleases(
      new Date("2026-06-12T12:00:00.000Z"),
    );

    assert.equal(result.checked, 1);
    assert.equal(result.eligible, 1);
    assert.equal(result.released, 1);
  });
});
