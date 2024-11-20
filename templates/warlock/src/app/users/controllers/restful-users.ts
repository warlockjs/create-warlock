import { Restful, type RouteResource, UniqueRule } from "@warlock.js/core";
import { User } from "../models/user";
import { usersRepository } from "../repositories/users.repository";

class RestfulUsers extends Restful<User> implements RouteResource {
  /**
   * {@inheritDoc}
   */
  protected repository = usersRepository;

  /**
   * {@inheritDoc}
   */
  public validation: RouteResource["validation"] = {
    create: {
      rules: {
        name: ["required", "min:2"],
        // If the request is a create request, except current id  will be ignored
        // otherwise, the id in the update request will be used as a filter to ignore the current id
        email: ["required", "email", new UniqueRule(User).exceptCurrentId()],
      },
    },
  };
}

export const restfulUsers = new RestfulUsers();
