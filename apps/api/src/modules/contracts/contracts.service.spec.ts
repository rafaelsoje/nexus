import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ContractStatus, UserRole } from "@prisma/client";
import { ContractsService } from "./contracts.service";

function createPrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    contract: {
      count: async () => 0,
      findFirst: async () => null,
    },
    $transaction: async (callback: (tx: unknown) => unknown) => {
      return callback({
        contract: {
          update: async ({ data }: { data: { status: ContractStatus } }) => ({
            id: "contract-1",
            status: data.status,
          }),
        },
        notification: {
          create: async () => ({}),
        },
      });
    },
    ...overrides,
  };
}

const participantContract = {
  id: "contract-1",
  status: ContractStatus.CONFIRMED,
  event: { name: "Festival NEXO" },
  company: { userId: "company-user" },
  freelancer: { userId: "freelancer-user" },
};

describe("ContractsService", () => {
  it("allows a company to mark a confirmed contract as completed", async () => {
    const prisma = createPrismaMock({
      contract: {
        findFirst: async () => participantContract,
      },
    });
    const service = new ContractsService(prisma as never);

    const result = await service.updateStatus(
      "company-user",
      UserRole.COMPANY,
      "contract-1",
      ContractStatus.COMPLETED,
    );

    assert.equal(result.status, ContractStatus.COMPLETED);
  });

  it("blocks freelancers from marking no-show", async () => {
    const prisma = createPrismaMock({
      contract: {
        findFirst: async () => participantContract,
      },
    });
    const service = new ContractsService(prisma as never);

    await assert.rejects(
      () =>
        service.updateStatus(
          "freelancer-user",
          UserRole.FREELANCER,
          "contract-1",
          ContractStatus.NO_SHOW,
        ),
      ForbiddenException,
    );
  });

  it("blocks invalid status transitions", async () => {
    const prisma = createPrismaMock({
      contract: {
        findFirst: async () => ({
          ...participantContract,
          status: ContractStatus.PENDING_PAYMENT,
        }),
      },
    });
    const service = new ContractsService(prisma as never);

    await assert.rejects(
      () =>
        service.updateStatus(
          "company-user",
          UserRole.COMPANY,
          "contract-1",
          ContractStatus.COMPLETED,
        ),
      BadRequestException,
    );
  });

  it("detects schedule conflicts only when matching contracts overlap", async () => {
    const prisma = createPrismaMock({
      contract: {
        count: async ({
          where,
        }: {
          where: {
            freelancerId: string;
            startsAt: { lt: Date };
            endsAt: { gt: Date };
            status: { in: ContractStatus[] };
          };
        }) => {
          assert.equal(where.freelancerId, "freelancer-1");
          assert.deepEqual(where.status.in, [
            ContractStatus.PENDING_PAYMENT,
            ContractStatus.CONFIRMED,
          ]);
          assert.equal(
            where.startsAt.lt.toISOString(),
            "2026-06-10T20:00:00.000Z",
          );
          assert.equal(
            where.endsAt.gt.toISOString(),
            "2026-06-10T18:00:00.000Z",
          );
          return 1;
        },
      },
    });
    const service = new ContractsService(prisma as never);

    const hasConflict = await service.hasScheduleConflict(
      "freelancer-1",
      new Date("2026-06-10T18:00:00.000Z"),
      new Date("2026-06-10T20:00:00.000Z"),
    );

    assert.equal(hasConflict, true);
  });
});
