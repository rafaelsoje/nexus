import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UserRole } from "@prisma/client";
import { AdminService, AuditContext } from "./admin.service";

const audit: AuditContext = {
  userId: "admin-user",
  role: UserRole.ADMIN,
  ip: "127.0.0.1",
  userAgent: "node-test",
};

describe("AdminService", () => {
  it("audits user status updates with admin context", async () => {
    let auditData: Record<string, unknown> | undefined;

    const prisma = {
      user: {
        findUnique: async () => ({
          email: "user@nexo.local",
          isActive: true,
          role: UserRole.FREELANCER,
          adminProfile: null,
        }),
      },
      $transaction: async (callback: (tx: unknown) => unknown) =>
        callback({
          user: {
            update: async () => ({
              id: "user-1",
              name: "Usuário",
              email: "user@nexo.local",
              phone: null,
              role: UserRole.FREELANCER,
              isActive: false,
              createdAt: new Date("2026-05-25T12:00:00.000Z"),
            }),
          },
          auditLog: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
              auditData = data;
              return { id: "audit-1", ...data };
            },
          },
        }),
    };

    const service = new AdminService(
      prisma as never,
      {} as never,
      {} as never,
    );

    const result = await service.updateUserStatus("user-1", false, audit);

    assert.equal(result.isActive, false);
    assert.equal(result.isArchived, false);
    assert.deepEqual(auditData, {
      userId: "admin-user",
      role: UserRole.ADMIN,
      ip: "127.0.0.1",
      userAgent: "node-test",
      action: "USER_STATUS_UPDATED",
      entity: "User",
      entityId: "user-1",
      metadata: {
        targetUserRole: UserRole.FREELANCER,
        isActive: false,
      },
    });
  });

  it("blocks reactivating archived users", async () => {
    const prisma = {
      user: {
        findUnique: async () => ({
          email: "deleted-user-1@nexo.local",
          isActive: false,
          role: UserRole.COMPANY,
          adminProfile: null,
        }),
      },
    };

    const service = new AdminService(
      prisma as never,
      {} as never,
      {} as never,
    );

    await assert.rejects(
      () => service.updateUserStatus("user-1", true, audit),
      /Archived users cannot be reactivated/,
    );
  });
});
