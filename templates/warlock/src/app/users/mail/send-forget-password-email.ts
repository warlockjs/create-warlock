import { sendMail } from "@warlock.js/core";
import type { User } from "../models/user";

export default async function sendForgetPasswordEmail(user: User) {
  await sendMail({
    to: user.get("email"),
    subject: "Reset Password",
    html: `
    <h3>Hello, ${user.get("name")}</h3>

    <p>Use the following code to reset your password:</p>

    <p>Please note that this code will expire in 10 minutes.</p>

    <p>Your reset password code is: <strong>${user.get(
      "activationCode",
    )}</strong></p>
    `,
  });
}
