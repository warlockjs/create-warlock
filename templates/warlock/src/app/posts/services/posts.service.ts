import type { PaginationListing } from "@warlock.js/cascade";
import type { Post } from "app/posts/models/post";
import { postsRepository } from "app/posts/repositories/posts.repository";
import type { CreatePostData } from "app/posts/validation/create-post.validation";
import type { PostsListsParams } from "../types";

/**
 * Create a new post
 */
export async function createPostService(data: CreatePostData): Promise<Post> {
  return await postsRepository.create(data);
}

/**
 * Get all posts
 */
export async function getAllPostsService(
  params: PostsListsParams = {},
): Promise<PaginationListing<Post>> {
  return await postsRepository.list(params);
}

/**
 * Get a single post by ID
 */
export async function getPostByIdService(id: number): Promise<Post | null> {
  return await postsRepository.findActiveCached(id);
}
