import type { FilterRules, RepositoryOptions } from "@warlock.js/core";
import { RepositoryManager } from "@warlock.js/core";
import { User } from "../models/user";

export type UserFilter = {
  email?: string;
  name?: string;
  id?: string;
};

export type UsersListOptions = RepositoryOptions & UserFilter;

class UsersRepository extends RepositoryManager<User, UserFilter> {
  public source = User;

  public filterBy: FilterRules = {
    id: "=",
    name: "like",
    email: "=",
  };
}

export const usersRepository = new UsersRepository();
