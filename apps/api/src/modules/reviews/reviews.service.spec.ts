import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ContractStatus, UserRole } from "@prisma/client";
import { ReviewsService } from "./reviews.service";

const company = {
  id: "company-1",
  companyName: "NEXO Eventos",
  userId: "company-user",
  user: { name: "Empresa NEXO" },
};

const freelancer = {
  id: "freelancer-1",
  displayName: "Ana Técnica",
  userId: "freelancer-user",
  user: { name: "Ana" },
};

const completedContract = {
  id: "contract-1",
  status: ContractStatus.COMPLETED,
  companyId: company.id,
  freelancerId: freelancer.id,
  company,
  freelancer,
  event: { name: "Festival NEXO" },
};

const companyReviewDto = {
  contractId: "contract-1",
  punctuality: 5,
  technicalQuality: 4,
  professionalPosture: 5,
  communication: 4,
  overallRating: 4,
  comment: "Boa entrega.",
};

function createPrismaMock({
  contract = completedContract,
  existingReview = null,
  average = 4.666,
}: {
  contract?: Record<string, unknown>;
  existingReview?: Record<string, unknown> | null;
  average?: number | null;
} = {}) {
  return {
    contract: {
      findUnique: async () => contract,
    },
    companyProfile: {
      findUnique: async () => company,
    },
    freelancerProfile: {
      findUnique: async () => freelancer,
    },
    review: {
      findFirst: async () => existingReview,
    },
    $transaction: async (callback: (tx: unknown) => unknown) => {
      return callback({
        review: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            assert.equal(data.contractId, "contract-1");
            assert.equal(data.companyReviewerId, "company-1");
            assert.equal(data.freelancerReviewedId, "freelancer-1");
            assert.equal(data.overallRating, 4);

            return {
              id: "review-1",
              ...data,
            };
          },
          aggregate: async () => ({
            _avg: { overallRating: average },
          }),
        },
        freelancerProfile: {
          update: async ({
            where,
            data,
          }: {
            where: { id: string };
            data: { ratingAverage: number };
          }) => {
            assert.equal(where.id, "freelancer-1");
            assert.equal(data.ratingAverage, 4.67);
          },
        },
        companyProfile: {
          update: async () => ({}),
        },
        notification: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            assert.equal(data.userId, "freelancer-user");
            assert.equal(data.type, "REVIEW_RECEIVED");
          },
        },
      });
    },
  };
}

describe("ReviewsService", () => {
  it("creates a company review and updates freelancer rating average", async () => {
    const service = new ReviewsService(createPrismaMock() as never);

    const review = await service.create(
      "company-user",
      UserRole.COMPANY,
      companyReviewDto,
    );

    assert.equal(review.id, "review-1");
    assert.equal(review.freelancerReviewedId, "freelancer-1");
  });

  it("blocks reviews before contract completion or payment", async () => {
    const service = new ReviewsService(
      createPrismaMock({
        contract: {
          ...completedContract,
          status: ContractStatus.CONFIRMED,
        },
      }) as never,
    );

    await assert.rejects(
      () => service.create("company-user", UserRole.COMPANY, companyReviewDto),
      BadRequestException,
    );
  });

  it("blocks duplicate reviews from the same participant", async () => {
    const service = new ReviewsService(
      createPrismaMock({
        existingReview: { id: "review-1" },
      }) as never,
    );

    await assert.rejects(
      () => service.create("company-user", UserRole.COMPANY, companyReviewDto),
      BadRequestException,
    );
  });
});
