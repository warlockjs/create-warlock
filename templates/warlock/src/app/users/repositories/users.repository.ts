import { RepositoryManager, type FilterByOptions, type RepositoryOptions } from "@warlock.js/core";
import { User } from "./../models/user";

export class UsersRepository extends RepositoryManager<User> {
  /**
   * {@inheritDoc}
   */
  public model = User;

  /**
   * Simple columns selections
   * Set the columns that need to be selected when passing 'simple' option with 'true'
   */
  public simpleSelectColumns = ["id"];

  /**
   * List default options
   */
  protected defaultOptions: RepositoryOptions = this.withDefaultOptions({});

  /**
   * Filter By options
   */
  protected filterBy: FilterByOptions = this.withDefaultFilters({});
}

export const usersRepository = new UsersRepository();
