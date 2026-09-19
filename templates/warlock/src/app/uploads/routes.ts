import { router, uploadedFileController } from "@warlock.js/core";

/**
 * Serves local uploads. Image variants are opt-in and bounded: only the names
 * declared in `uploads.images.variants` can be requested, e.g.
 * `/uploads/avatars/me.jpg?variant=thumb&format=webp`.
 */
router.get("/uploads/*", uploadedFileController);
