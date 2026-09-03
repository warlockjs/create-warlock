import { router } from "@warlock.js/core";
import { localeController } from "./controllers/locale.controller";

router.post("/api/locale", localeController);
