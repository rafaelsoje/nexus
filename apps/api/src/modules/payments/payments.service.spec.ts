import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ContractStatus, PaymentStatus } from "@prisma/client";
import { PaymentGateway } from "./gateways/payment-gateway";
import { PaymentsService } from "./payments.service";

const company = {
  id: "company-1",
  companyName: "NEXO Eventos",
};

const payableContract = {
  id: "contract-1",
  companyId: company.id,
  freelancerId: "freelancer-1",
  amountCents: 100000,
  platformFeeCents: 12000,
  payment: null,
  event: { name: "Festival NEXO" },
  freelancer: { userId: "freelancer-user", wallet: null },
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
});
