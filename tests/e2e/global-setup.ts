import { execFileSync } from "child_process";

async function globalSetup() {
  execFileSync("pnpm", ["prisma:seed:demo"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

export default globalSetup;
