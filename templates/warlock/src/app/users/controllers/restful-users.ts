import { Restful, type RouteResource, v } from "@warlock.js/core";
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
      schema: v.object({
        name: v.string().minLength(2).required(),
        email: v.string().email().required().unique(User, {
          except: "id",
        }),
      }),
    },
  };
}

export const restfulUsers = new RestfulUsers();
