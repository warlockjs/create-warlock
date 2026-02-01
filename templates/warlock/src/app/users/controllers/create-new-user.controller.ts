import { type RequestHandler } from "@warlock.js/core";
import { User } from "../models/user";
import { createUserSchema } from "../validation/create-user.schema";

export const createNewUserController: RequestHandler = async (
  request,
  response,
) => {
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
  schema: createUserSchema,
};
