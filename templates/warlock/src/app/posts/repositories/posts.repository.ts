import type { FilterByOptions, RepositoryOptions } from "@warlock.js/core";
import { RepositoryManager } from "@warlock.js/core";

import { Post } from "../models/post";

export class PostsRepository extends RepositoryManager<Post> {
  /**
   * {@inheritDoc}
   */
  public model = Post;

  /**
   * List default options
   */
  protected defaultOptions: RepositoryOptions = this.withDefaultOptions({});

  /**
   * Filter By options
   */
  protected filterBy: FilterByOptions = this.withDefaultFilters({
    title: "like",
    author: ["int", "createdBy.id"],
  });
}

export const postsRepository = new PostsRepository();
