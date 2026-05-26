import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  ContractStatus,
  DisputeStatus,
  PaymentStatus,
  UserRole,
} from "@prisma/client";
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
        dispute: {
          create: async () => ({}),
        },
        paymentSplit: {
          updateMany: async () => ({ count: 0 }),
        },
        notification: {
          create: async () => ({}),
        },
        auditLog: {
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
  endsAt: new Date("2020-06-10T23:00:00.000Z"),
  event: { name: "Festival NEXO" },
  company: { userId: "company-user" },
  freelancer: { userId: "freelancer-user" },
  disputes: [],
};

const companyAccess = {
  findCompanyForUser: async () => ({ id: "company-1" }),
  notifyCompanyMembers: async () => undefined,
};

describe("ContractsService", () => {
  it("allows a company to mark a confirmed contract as completed", async () => {
    const prisma = createPrismaMock({
      contract: {
        findFirst: async () => ({
          ...participantContract,
          endsAt: new Date(Date.now() - 60_000),
        }),
      },
    });
    const service = new ContractsService(prisma as never, companyAccess as never);

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
        findFirst: async () => ({
          ...participantContract,
          endsAt: new Date(Date.now() - 60_000),
        }),
      },
    });
    const service = new ContractsService(prisma as never, companyAccess as never);

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

  it("creates a dispute automatically when company marks no-show", async () => {
    let createdDispute:
      | { contractId: string; reason: string; details?: string }
      | undefined;
    let blockedSplitWhere: unknown;

    const prisma = createPrismaMock({
      contract: {
        findFirst: async () => ({
          ...participantContract,
          endsAt: new Date(Date.now() - 60_000),
        }),
      },
      $transaction: async (callback: (tx: unknown) => unknown) => {
        return callback({
          contract: {
            update: async ({ data }: { data: { status: ContractStatus } }) => ({
              id: "contract-1",
              status: data.status,
            }),
          },
          paymentSplit: {
            updateMany: async ({ where }: { where: unknown }) => {
              blockedSplitWhere = where;
              return { count: 1 };
            },
          },
          dispute: {
            create: async ({ data }: { data: typeof createdDispute }) => {
              createdDispute = data;
              return { id: "dispute-1", ...data };
            },
          },
          auditLog: {
            create: async () => ({}),
          },
          notification: {
            create: async () => ({}),
          },
        });
      },
    });
    const service = new ContractsService(prisma as never, companyAccess as never);

    const result = await service.updateStatus(
      "company-user",
      UserRole.COMPANY,
      "contract-1",
      ContractStatus.NO_SHOW,
    );

    assert.equal(result.status, ContractStatus.NO_SHOW);
    assert.deepEqual(createdDispute, {
      contractId: "contract-1",
      reason: "NO_SHOW_REPORTED",
      details:
        "Disputa aberta automaticamente após a empresa marcar no-show.",
    });
    assert.deepEqual(blockedSplitWhere, {
      contractId: "contract-1",
      releaseStatus: "WAITING_RELEASE",
    });
  });

  it("does not duplicate open no-show disputes", async () => {
    let disputeCreates = 0;
    const prisma = createPrismaMock({
      contract: {
        findFirst: async () => ({
          ...participantContract,
          endsAt: new Date(Date.now() - 60_000),
          disputes: [{ id: "dispute-1", status: DisputeStatus.OPEN }],
        }),
      },
      $transaction: async (callback: (tx: unknown) => unknown) => {
        return callback({
          contract: {
            update: async ({ data }: { data: { status: ContractStatus } }) => ({
              id: "contract-1",
              status: data.status,
            }),
          },
          paymentSplit: {
            updateMany: async () => ({ count: 1 }),
          },
          dispute: {
            create: async () => {
              disputeCreates += 1;
              return {};
            },
          },
          auditLog: {
            create: async () => ({}),
          },
          notification: {
            create: async () => ({}),
          },
        });
      },
    });
    const service = new ContractsService(prisma as never, companyAccess as never);

    await service.updateStatus(
      "company-user",
      UserRole.COMPANY,
      "contract-1",
      ContractStatus.NO_SHOW,
    );

    assert.equal(disputeCreates, 0);
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
    const service = new ContractsService(prisma as never, companyAccess as never);

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

  it("blocks closing a contract before the event ends", async () => {
    const prisma = createPrismaMock({
      contract: {
        findFirst: async () => ({
          ...participantContract,
          endsAt: new Date("2099-06-10T23:00:00.000Z"),
        }),
      },
    });
    const service = new ContractsService(prisma as never, companyAccess as never);

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

  it("blocks manual confirmation before payment is paid", async () => {
    const prisma = createPrismaMock({
      companyProfile: {
        findUnique: async () => ({ id: "company-1" }),
      },
      contract: {
        findFirst: async () => ({
          id: "contract-1",
          paymentSplits: [],
        }),
      },
    });
    const service = new ContractsService(prisma as never, companyAccess as never);

    await assert.rejects(
      () => service.confirmByCompany("company-user", "contract-1"),
      BadRequestException,
    );
  });

  it("allows manual confirmation only when payment is paid", async () => {
    const prisma = createPrismaMock({
      companyProfile: {
        findUnique: async () => ({ id: "company-1" }),
      },
      contract: {
        findFirst: async () => ({
          id: "contract-1",
          paymentSplits: [{ payment: { status: PaymentStatus.PAID } }],
        }),
        update: async ({ data }: { data: { status: ContractStatus } }) => ({
          id: "contract-1",
          status: data.status,
        }),
      },
    });
    const service = new ContractsService(prisma as never, companyAccess as never);

    const result = await service.confirmByCompany("company-user", "contract-1");

    assert.equal(result.status, ContractStatus.CONFIRMED);
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
    const service = new ContractsService(prisma as never, companyAccess as never);

    const hasConflict = await service.hasScheduleConflict(
      "freelancer-1",
      new Date("2026-06-10T18:00:00.000Z"),
      new Date("2026-06-10T20:00:00.000Z"),
    );

    assert.equal(hasConflict, true);
  });
});
