import { beforeEach, describe, expect, it } from "bun:test";
import request from "supertest";
import { PrismaClient } from "@webcraft/database";

const database = new PrismaClient();

let agent = request.agent("http://localhost:4001");

const userDetails = {
	email: "test@example.com",
	password: "password",
};

const userPasswordHash =
	"$2b$10$SKWsTeX29Jfd4W1I3sFUzuAihCkTxsl1CmB5AOAWNk4fmwnWcOt7a"; // bcrypt hashed password of "password"

describe("Authentication", () => {
	beforeEach(async () => {
		// reset database
		await database.user.deleteMany({});
		await database.key.deleteMany({});
		await database.session.deleteMany({});

		// reset agent
		agent = request.agent("http://localhost:4001");
	});

	it("should allow a user to sign out", async () => {
		// arrange
		await agent.post("/user/sign-up").send(userDetails);

		// act
		const response = await agent.post("/user/sign-out").send();
		expect(response.body).toEqual({
			success: true,
			error: null,
		});
	});

	it("should allow a user to signup", async () => {
		// act
		const response = await agent.post("/user/sign-up").send(userDetails);

		// assert
		expect(response.body).toEqual({
			success: true,
			error: null,
		});
	});

	it("should throw an error if the email is already in use", async () => {
		// arange - create a user with the same email
		await database.user.create({
			data: {
				id: "test",
				email: userDetails.email,
				role: "USER",
			},
		});

		// act
		const response = await agent.post("/user/sign-up").send(userDetails);

		// assert
		expect(response.body).toEqual({
			success: false,
			error: "Email already in use",
		});
	});

	it("should allow a user to login", async () => {
		// arrange
		await database.user.create({
			data: {
				id: "test",
				email: userDetails.email,
				role: "USER",
				key: {
					create: {
						id: `email:${userDetails.email}`,
						hashed_password: userPasswordHash,
					},
				},
			},
		});

		// act
		const response = await agent.post("/user/sign-in").send(userDetails);

		// assert
		expect(response.body).toEqual({
			success: true,
			error: null,
		});
	});

	it("should throw an error if the email is not found", async () => {
		// act
		const response = await agent.post("/user/sign-in").send(userDetails);

		// assert
		expect(response.body).toEqual({
			success: false,
			error: "Invalid email or password",
		});
	});

	it("should throw an error if the password is incorrect", async () => {
		// arrange
		await database.user.create({
			data: {
				id: "test",
				email: userDetails.email,
				role: "USER",
				key: {
					create: {
						id: `email:${userDetails.email}`,
						hashed_password: userPasswordHash,
					},
				},
			},
		});

		// act
		const response = await agent
			.post("/user/sign-in")
			.send({ ...userDetails, password: "wrong-password" });

		// assert
		expect(response.body).toEqual({
			success: false,
			error: "Invalid email or password",
		});
	});

	it("should throw an error if the email is not in the correct format", async () => {
		// act
		const response = await agent
			.post("/user/sign-up")
			.send({ ...userDetails, email: "wrong" });

		// assert
		expect(response.body).toEqual({
			success: false,
			error: "Invalid email format",
		});
	});

	it("should throw an error if the password is not long enough", async () => {
		// act
		const response = await agent
			.post("/user/sign-up")
			.send({ ...userDetails, password: "short" });

		// assert
		expect(response.body).toEqual({
			success: false,
			error: "Password must be at least 8 characters",
		});
	});
});
