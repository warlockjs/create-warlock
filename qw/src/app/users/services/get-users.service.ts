import { usersRepository } from "../repositories/users.repository";

export async function getUsersService() {
  return usersRepository.allActiveCached();
}
