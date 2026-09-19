import "dotenv/config";
import {
  createAccessToken,
  verifyAccessToken,
} from "./jwt.js";

async function testJwt() {
  try {
    const token = await createAccessToken({
      userId: 10,
      organizationId: 1,
      role: "owner",
    });

    console.log("Created JWT:");
    console.log(token);
const tamperedToken = token.slice(0, -1) + "x";

try {
  await verifyAccessToken(tamperedToken);
  console.log("Tampered token was accepted ❌");
} catch {
  console.log("Tampered token rejected ✅");
}
    const payload = await verifyAccessToken(token);

    console.log("Verified payload:");
    console.log(payload);
  } catch (error) {
    console.error(
      "JWT test failed:",
      error instanceof Error ? error.message : error
    );
  }
}

testJwt();