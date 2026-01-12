import { modelSync } from "@warlock.js/cascade";
import { Post } from "app/posts/models/post/psot.model";
import { User } from "../models/user";

export const cleanup = [modelSync.sync(User, Post, "createdBy")];
