import "dotenv/config";
import { registerUser } from "./register.js";

async function setup() {
  try {
    const user = await registerUser({
      name: "Login Test User",
      email: "login-test@example.com",
      password: "TestPassword123",
      organizationId: 1,
    });

    console.log("Test user created:", user);
  } catch (error) {
    console.error(
      "Setup failed:",
      error instanceof Error ? error.message : error
    );
  }
}

setup();