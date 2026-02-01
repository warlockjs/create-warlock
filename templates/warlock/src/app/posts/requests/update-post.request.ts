import type { Request } from "@warlock.js/core";
import { type UpdatePostSchema } from "../validation/update-post.schema";

export type UpdatePostRequest = Request<UpdatePostSchema>;
