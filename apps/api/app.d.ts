// app.d.ts
/// <reference types="lucia" />

declare global {
	namespace App {
		interface Locals {
			auth: import("lucia").AuthRequest;
			session: import("lucia").Session;
		}
	}
}

declare global {
	namespace Lucia {
		type Auth = import("@webcraft/auth").Auth;
		type DatabaseUserAttributes = {
			email: string;
			email_verified: Date | null;
			role: string;
		};
		// biome-ignore lint: this is required to get correct intellisense in VSCode
		type DatabaseSessionAttributes = {};
	}
}

export {};
