import { Random } from "@mongez/reinforcements";
import type { User } from "app/users/models/user";
import { usersRepository } from "app/users/repositories/users.repository";

/**
 * Create a new user account
 */
export async function createAccountService(
  profileData: Record<string, any>,
): Promise<User> {
  return await usersRepository.create({
    isCustomer: true,
    ...profileData,
    activationCode: Random.int(100000, 999999),
  });
}
