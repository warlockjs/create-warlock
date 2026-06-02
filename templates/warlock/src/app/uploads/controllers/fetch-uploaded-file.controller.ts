import { CACHE_FOR } from "@warlock.js/cache";
import { Image, type RequestHandler, storage } from "@warlock.js/core";
import { fileExistsAsync } from "@warlock.js/fs";
import { v } from "@warlock.js/seal";

export const fetchUploadedFileController: RequestHandler = async (request, response) => {
  const absolutePath = storage.root(request.input("*"));

  const { w: width, h: height } = request.validated();

  if (!(await fileExistsAsync(absolutePath))) {
    return response.notFound();
  }

  if (width || height) {
    const image = new Image(absolutePath);
    image.resize({
      width,
      height,
    });

    return response.sendImage(image, CACHE_FOR.ONE_DAY);
  }

  return response.sendFile(absolutePath, CACHE_FOR.ONE_YEAR);
};

fetchUploadedFileController.validation = {
  schema: v.object({
    w: v.numeric().min(1),
    h: v.numeric().min(1),
  }),
};
