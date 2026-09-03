import { localeSchema, type LocaleSchema } from "@shared/locale.schema";
import { type Request, type RequestHandler } from "@warlock.js/core";

/** POST /api/locale — persists the visitor's locale preference in a cookie. */
export const localeController: RequestHandler<Request<LocaleSchema>> = async ({
  request,
  response,
}) => {
  const { locale } = request.validated();

  response.cookie("locale", locale, { raw: true, path: "/" });

  return response.success({ locale });
};

localeController.validation = { schema: localeSchema };
