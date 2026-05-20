import { ConfigService } from "@nestjs/config";

const basisPointsDivisor = 10_000;
const defaultCompanyFeeBasisPoints = 800;
const defaultFreelancerFeeBasisPoints = 0;
const defaultFixedContractFeeCents = 0;
const defaultGatewayFeeBasisPoints = 0;
const defaultGatewayFixedFeeCents = 0;

export function calculatePlatformFeeCents(
  amountCents: number,
  config: ConfigService,
) {
  return calculateMarketplaceFees(amountCents, config).companyFeeAmountCents;
}

export type MarketplaceFeeBreakdown = {
  contractAmountCents: number;
  grossAmountCents: number;
  companyFeeBasisPoints: number;
  freelancerFeeBasisPoints: number;
  gatewayFeeBasisPoints: number;
  companyFeeAmountCents: number;
  freelancerFeeAmountCents: number;
  gatewayFeeAmountCents: number;
  platformAmountCents: number;
  freelancerNetAmountCents: number;
  amountToChargeCompanyCents: number;
  amountToReleaseFreelancerCents: number;
};

export function calculateMarketplaceFees(
  contractAmountCents: number,
  config: ConfigService,
  overrides: { companyFeeAmountCents?: number } = {},
): MarketplaceFeeBreakdown {
  const companyFeeBasisPoints = getConfigNumber(
    config,
    "PLATFORM_COMPANY_FEE_BASIS_POINTS",
    defaultCompanyFeeBasisPoints,
  );
  const freelancerFeeBasisPoints = getConfigNumber(
    config,
    "PLATFORM_FREELANCER_FEE_BASIS_POINTS",
    defaultFreelancerFeeBasisPoints,
  );
  const fixedContractFeeCents = getConfigNumber(
    config,
    "PLATFORM_FIXED_CONTRACT_FEE_CENTS",
    defaultFixedContractFeeCents,
  );
  const gatewayFeeBasisPoints = getConfigNumber(
    config,
    "PAYMENT_GATEWAY_FEE_BASIS_POINTS",
    defaultGatewayFeeBasisPoints,
  );
  const gatewayFixedFeeCents = getConfigNumber(
    config,
    "PAYMENT_GATEWAY_FIXED_FEE_CENTS",
    defaultGatewayFixedFeeCents,
  );

  const companyFeeAmountCents =
    overrides.companyFeeAmountCents ??
    calculateBasisPoints(contractAmountCents, companyFeeBasisPoints) +
      fixedContractFeeCents;
  const freelancerFeeAmountCents = calculateBasisPoints(
    contractAmountCents,
    freelancerFeeBasisPoints,
  );
  const amountToChargeCompanyCents =
    contractAmountCents + companyFeeAmountCents;
  const gatewayFeeAmountCents =
    calculateBasisPoints(amountToChargeCompanyCents, gatewayFeeBasisPoints) +
    gatewayFixedFeeCents;
  const freelancerNetAmountCents =
    contractAmountCents - freelancerFeeAmountCents;
  const platformAmountCents = companyFeeAmountCents + freelancerFeeAmountCents;

  return {
    contractAmountCents,
    grossAmountCents: amountToChargeCompanyCents,
    companyFeeBasisPoints,
    freelancerFeeBasisPoints,
    gatewayFeeBasisPoints,
    companyFeeAmountCents,
    freelancerFeeAmountCents,
    gatewayFeeAmountCents,
    platformAmountCents,
    freelancerNetAmountCents,
    amountToChargeCompanyCents,
    amountToReleaseFreelancerCents: freelancerNetAmountCents,
  };
}

function calculateBasisPoints(amountCents: number, basisPoints: number) {
  return Math.round((amountCents * basisPoints) / basisPointsDivisor);
}

function getConfigNumber(config: ConfigService, key: string, fallback: number) {
  const value = config.get<string | number>(key);

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}
