import { v, type RequestHandler } from "@warlock.js/core";
import { User } from "../models/user";

export const createNewUserController: RequestHandler = async (request, response) => {
  const file = request.file("image")!;

  const output = await file.save("images");

  const user = await User.create({
    ...request.validated(["name", "email", "password"]),
    image: output.path,
    imageMetadata: await file.metadata(),
  });

  return response.success({
    message: "File uploaded successfully",
    user,
  });
};

createNewUserController.validation = {
  schema: v.object({
    name: v.string().required(),
    email: v.email().required().unique(User),
    password: v.string().min(6),
    image: v.file().image().required().maxSize({ unit: "MB", size: 1.5 }),
  }),
};
