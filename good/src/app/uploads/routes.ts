import { router } from "@warlock.js/core";
import { fetchUploadedFileController } from "./controllers/fetch-uploaded-file.controller";

router.get("/uploads/*", fetchUploadedFileController);
