import { router } from "@warlock.js/core";
import { contactController } from "./controllers/contact.controller";

router.post("/api/contact", contactController);
