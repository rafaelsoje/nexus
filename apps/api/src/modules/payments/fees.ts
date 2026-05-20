import { ConfigService } from "@nestjs/config";

const basisPointsDivisor = 10_000;
const defaultCompanyFeeBasisPoints = 800;

export function calculatePlatformFeeCents(
  amountCents: number,
  config: ConfigService,
) {
  const basisPoints = config.get<number>(
    "PLATFORM_COMPANY_FEE_BASIS_POINTS",
    defaultCompanyFeeBasisPoints,
  );

  return Math.round((amountCents * basisPoints) / basisPointsDivisor);
}
