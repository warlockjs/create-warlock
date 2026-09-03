import { contactSchema } from "@shared/contact.schema";
import { type Request, type RequestHandler } from "@warlock.js/core";
import { type Infer } from "@warlock.js/seal";

export type ContactSchema = Infer.Output<typeof contactSchema>;

/** POST /api/contact — validates the starter contact form. */
export const contactController: RequestHandler<Request<ContactSchema>> = async ({
  request,
  response,
}) => {
  const contact = request.validated();

  // Replace this with delivery/persistence for your app. Keeping the accepted
  // payload visible makes the endpoint useful while remaining side-effect free.
  return response.success({
    message: "Thanks, " + contact.name + ". Your message has been received.",
  });
};

contactController.validation = { schema: contactSchema };
