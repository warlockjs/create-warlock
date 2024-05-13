import type { UploadsConfigurations } from "@warlock.js/core";

const uploadsConfigurations: UploadsConfigurations = {
  compress: true,
  saveTo: (defaultPath: string) => {
    // the path returned here should be relative to the storage directory.
    // i.e don't use `storagePath()` function, just pass the relative path to the storage directory.
    return defaultPath;
  },
};

export default uploadsConfigurations;
