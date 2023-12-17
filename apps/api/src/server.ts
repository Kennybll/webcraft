import { Elysia } from "elysia";
import { usersRouter } from "routes/auth";

export const app = new Elysia().use(usersRouter).onError(({ code, error }) => {
	if (code === "VALIDATION")
		return {
			success: false,
			error: error.message,
		};
});

export type App = typeof app;
