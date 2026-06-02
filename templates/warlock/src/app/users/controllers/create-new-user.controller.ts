import { type GuardedRequestHandler } from "app/auth/requests/guarded.request";
import { User } from "../models/user";
import { type CreateUserSchema, createUserSchema } from "../schema/create-user.schema";

export const createNewUserController: GuardedRequestHandler<CreateUserSchema> = async (
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

  return response.successCreate({
    message: "File uploaded successfully",
    user,
  });
};

createNewUserController.validation = {
  schema: createUserSchema,
};
