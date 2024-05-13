import {
  deleteFile,
  getUploadedFile,
  getUploadedFileUsingHash,
  router,
  uploadChunkedFiles,
  uploadFiles,
} from "@warlock.js/core";
import { adminPath, guarded } from "app/utils/router";

guarded(() => {
  // Upload files
  router.post(["/uploads", adminPath("/uploads")], uploadFiles);
  // Upload chunked files
  router.post(
    ["/uploads/chunks", adminPath("/uploads/chunks")],
    uploadChunkedFiles,
  );
  // Delete file by hash from the database
  router.delete(["/uploads/:hash", adminPath("/uploads/:hash")], deleteFile);
});

// Please note that the uploaded files should not be grouped in protected middleware i.e guarded with JWT
// Get uploaded file using the file path directly
router.get("/uploads/*", getUploadedFile);
// Get uploaded file using hash
router.get("/uploads/:hash", getUploadedFileUsingHash);
