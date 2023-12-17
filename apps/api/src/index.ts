import logger from "@webcraft/logger";
import { app } from "server";

const PORT = process.env.PORT || 4001;

app.listen(PORT);

logger.info(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
