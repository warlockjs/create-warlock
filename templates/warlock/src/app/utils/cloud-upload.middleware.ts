import { type Request, type Response, storage, storageDriverContext } from "@warlock.js/core";

export async function cloudUploadMiddleware(request: Request, _response: Response) {
  if (request.path !== "/posts") return;

  // Example 1: Set driver with tenant-specific prefix
  storageDriverContext.setDriver(storage.getDriver("r2"), {
    prefix: `tenant`,
    metadata: { tenantId: request.user?.id },
  });

  // Example 2: Or just set prefix for same driver
  storageDriverContext.setPrefix(`tenant-${request.user?.id}`);
}
