import type { FilterRules, RepositoryOptions } from "@warlock.js/core";
import { RepositoryManager } from "@warlock.js/core";
import { User } from "../models/user";

class UsersRepository extends RepositoryManager<User> {
  public source = User;

  public simpleSelectColumns: string[] = ["id", "name", "createdAt"];

  public filterBy: FilterRules = {
    id: "int",
    name: "like",
    email: "=",
  };

  public defaultOptions: RepositoryOptions = {
    orderBy: {
      createdAt: "desc",
    },
  };
}

export const usersRepository = new UsersRepository();
