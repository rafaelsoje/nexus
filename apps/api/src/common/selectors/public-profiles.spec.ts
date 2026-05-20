import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicCompanySelect, publicFreelancerSelect } from "./public-profiles";

const privateKeys = [
  "bankData",
  "document",
  "email",
  "phone",
  "responsibleName",
  "refreshTokenHash",
  "resetTokenHash",
  "verificationDocuments",
  "wallet",
];

describe("public profile selectors", () => {
  it("do not expose private freelancer fields", () => {
    const serialized = JSON.stringify(publicFreelancerSelect);

    for (const key of privateKeys) {
      assert.equal(serialized.includes(key), false);
    }
  });

  it("do not expose private company fields", () => {
    const serialized = JSON.stringify(publicCompanySelect);

    for (const key of privateKeys) {
      assert.equal(serialized.includes(key), false);
    }
  });
});
