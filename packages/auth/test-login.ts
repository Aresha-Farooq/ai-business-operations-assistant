import "dotenv/config";
import { loginUser } from "./login.js";

async function testLogin() {
  try {
    const user = await loginUser({
      email: "newuser@example.com",
      password: "WrongPassword123",
    });

    console.log("Login successful:", user);
  } catch (error) {
    console.error(
      "Login failed:",
      error instanceof Error ? error.message : error
    );
  }
}

testLogin();