import { usersRepository } from "../repositories/users.repository";

export async function listUsersService() {
  return usersRepository.allActiveCached({
    select: ["id", "name", "email", "isActive", "age"],
  });
}
