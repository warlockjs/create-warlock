import type { FilterByOptions, RepositoryOptions } from "@warlock.js/core";
import { RepositoryManager } from "@warlock.js/core";
import { User } from "../models/user";

export class UsersRepository extends RepositoryManager<User> {
  /**
   * {@inheritDoc}
   */
  public model = User;

  /**
   * List default options
   */
  protected defaultOptions: RepositoryOptions = this.withDefaultOptions({});

  protected cacheDriverName = "redis";

  /**
   * Filter By options
   */
  protected filterBy: FilterByOptions = {
    isActive: "bool",
    email: "like",
    id: "int",
    month: "int",
    year: "int",
    phoneNumber: "like",
    isAdmin: "bool",
    isVendor: "bool",
    isCustomer: "bool",
    gender: "=",
    name: ["like", ["name", "username"]],
    except: ["!int", "id"],
    affiliateCode: ["=", "affiliate.code"],
    affiliateStatus: ["=", "affiliate.status"],
    activationToken: "=",
    instagramHash: "=",
  };

  /**
   * Get all administrators
   */
  public getAdmins() {
    return this.list({
      paginate: false,
      isAdmin: true,
    });
  }

  /**
   * List pending affiliate partners
   */
  public listAffiliatePartners(status?: "pending" | "active" | "rejected") {
    return this.listActive({
      perform(query) {
        query.whereNotNull("affiliate");
      },
      affiliateStatus: status,
      deselect: ["lastLogin", "group", "cartProducts", "total", "totalWishList", "totalCompare"],
    });
  }
}

const usersRepository = new UsersRepository();

export default usersRepository;
