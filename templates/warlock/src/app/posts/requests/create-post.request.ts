import type { Request } from "@warlock.js/core";
import { type CreatePostSchema } from "../validation/create-post.schema";

export type CreatePostRequest = Request<CreatePostSchema>;
