import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateMarketplaceFees } from "./fees";

describe("calculateMarketplaceFees", () => {
  it("calculates company fee, freelancer fee, gateway fee and net amounts", () => {
    const fees = calculateMarketplaceFees(100000, {
      get: (key: string) => {
        const values: Record<string, string> = {
          PLATFORM_COMPANY_FEE_BASIS_POINTS: "800",
          PLATFORM_FREELANCER_FEE_BASIS_POINTS: "500",
          PLATFORM_FIXED_CONTRACT_FEE_CENTS: "250",
          PAYMENT_GATEWAY_FEE_BASIS_POINTS: "300",
          PAYMENT_GATEWAY_FIXED_FEE_CENTS: "99",
        };

        return values[key];
      },
    } as never);

    assert.equal(fees.companyFeeAmountCents, 8250);
    assert.equal(fees.freelancerFeeAmountCents, 5000);
    assert.equal(fees.amountToChargeCompanyCents, 108250);
    assert.equal(fees.freelancerNetAmountCents, 95000);
    assert.equal(fees.amountToReleaseFreelancerCents, 95000);
    assert.equal(fees.platformAmountCents, 13250);
    assert.equal(fees.gatewayFeeAmountCents, 3347);
  });

  it("can preserve the company fee stored on the contract", () => {
    const fees = calculateMarketplaceFees(
      100000,
      {
        get: () => undefined,
      } as never,
      { companyFeeAmountCents: 12000 },
    );

    assert.equal(fees.companyFeeAmountCents, 12000);
    assert.equal(fees.amountToChargeCompanyCents, 112000);
  });
});
