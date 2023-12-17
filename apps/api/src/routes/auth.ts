import { LuciaError, auth } from "@webcraft/auth";
import { Prisma, UserRole } from "@webcraft/database";
import logger from "@webcraft/logger";
import { Elysia, Static, t } from "elysia";
import { database } from "integrations/database";

const EmailString = t.String({
	format: "email",
	error: "Invalid email format",
});

const PasswordString = t.String({
	minLength: 8,
	error: "Password must be at least 8 characters",
});

export const SignUpBody = t.Object({
	email: EmailString,
	password: PasswordString,
});
type SignUpBody = Static<typeof SignUpBody>;

export const SignInBody = t.Object({
	email: EmailString,
	password: PasswordString,
});
type SignInBody = Static<typeof SignInBody>;

export const usersRouter = new Elysia({ prefix: "/user" })
	.post(
		"/sign-in",
		async (context) => {
			const { email, password } = context.body;

			try {
				// verify email and password
				const key = await auth.useKey("email", email.toLowerCase(), password);

				// create session
				const session = await auth.createSession({
					userId: key.userId,
					attributes: {},
				});

				// set session cookie
				const authRequest = auth.handleRequest(context);
				authRequest.setSession(session);

				// delete dead sessions for user
				await auth.deleteDeadUserSessions(key.userId);

				return {
					success: true,
					error: null,
				};
			} catch (e) {
				logger.error(e);

				if (
					e instanceof LuciaError &&
					(e.message === "AUTH_INVALID_KEY_ID" ||
						e.message === "AUTH_INVALID_PASSWORD")
				) {
					return {
						success: false,
						error: "Invalid email or password",
					};
				}

				return {
					success: false,
					error: "Something went wrong",
				};
			}
		},
		{
			body: SignInBody,
		},
	)
	.post(
		"/sign-up",
		async (context) => {
			const { email, password } = context.body;
			try {
				// check if email is already in use
				const user = await database.user.findUnique({
					where: {
						email,
					},
				});

				// if email is already in use, return error
				if (user) {
					return {
						success: false,
						error: "Email already in use",
					};
				}

				// create user
				const newUser = await auth.createUser({
					key: {
						providerId: "email",
						providerUserId: email.toLowerCase(),
						password,
					},
					attributes: {
						email,
						email_verified: null,
						role: UserRole.USER,
					},
				});

				// TODO: Send email verification email

				// create session
				const session = await auth.createSession({
					userId: newUser.userId,
					attributes: {},
				});

				// set session cookie
				const authRequest = auth.handleRequest(context);
				authRequest.setSession(session);

				return {
					success: true,
					error: null,
				};
			} catch (e) {
				logger.error(e);

				if (e instanceof Prisma.PrismaClientKnownRequestError) {
					// P2022: Unique constraint failed
					// Prisma error codes: https://www.prisma.io/docs/reference/api-reference/error-reference#error-codes
					if (e.code === "P2002") {
						return {
							success: false,
							error: "Email already in use",
						};
					}

					return {
						success: false,
						error: "Something went wrong",
					};
				}

				return {
					success: false,
					error: "Something went wrong",
				};
			}
		},
		{
			body: SignUpBody,
		},
	)
	.post("/sign-out", async (context) => {
		try {
			const authRequest = auth.handleRequest(context);
			const session = await authRequest.validate();

			if (!session) {
				return {
					success: false,
					error: "You are not signed in",
				};
			}

			// invalidate session
			await auth.invalidateSession(session.sessionId);

			// delete session cookie
			authRequest.setSession(null);

			// delete dead sessions for user
			await auth.deleteDeadUserSessions(session.user.userId);

			return {
				success: true,
				error: null,
			};
		} catch (e) {
			logger.error(e);

			return {
				success: false,
				error: "Something went wrong",
			};
		}
	});
