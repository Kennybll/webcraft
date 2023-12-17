import { lucia } from "lucia";
import { elysia } from "lucia/middleware";
import { prisma } from "@lucia-auth/adapter-prisma";

import { PrismaClient } from "../../database/src";

const client = new PrismaClient();

const isProd = Bun.env.NODE_ENV === "PROD";

export const auth = lucia({
	env: isProd ? "PROD" : "DEV",
	csrfProtection: isProd, // turn off CSRF protection in development to make testing easier
	middleware: elysia(),
	adapter: prisma(client),
	getUserAttributes: (databaseUser) => {
		return {
			email: databaseUser.email,
			email_verified: databaseUser.email_verified,
			role: databaseUser.role,
		};
	},
	passwordHash: {
		generate: async (password) => {
			return await Bun.password.hash(password, {
				algorithm: "bcrypt",
				cost: 10,
			});
		},
		validate: async (password, hash) => {
			return await Bun.password.verify(password, hash);
		},
	},
});

export type Auth = typeof auth;

export * from "lucia";

// biome-ignore lint: this is required to get correct intellisense in VSCode
export {};
