"use server";

import { prisma } from "@/db/prisma";
import bcrypt from "bcryptjs";
import { signAuthToken, setAuthCookie, removeAuthCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/current-user";

type ResponseResult = {
	success: boolean;
	message: string;
};

// Register new user
export async function registerUser(
	prevState: ResponseResult,
	formData: FormData
): Promise<ResponseResult> {
	try {
		const name = formData.get("name") as string;
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		if (!name || !email || !password) {
			return { success: false, message: "All fields are required" };
		}

		// Check if user exists
		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			return { success: false, message: "User already exists" };
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user
		const user = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
			},
		});

		// Sign and set auth token
		const token = await signAuthToken({ userId: user.id });
		await setAuthCookie(token);

		// Audit log
		await logAudit({
			userId: user.id,
			action: "auth.register",
			resourceType: "User",
			resourceId: user.id,
			after: user,
		});

		return { success: true, message: "Registration" };
	} catch {
		return {
			success: false,
			message: "Something went wrong, please try again",
		};
	}
}

// Log user out and remove auth cookie
// export async function logoutUser(): Promise<{
// 	success: boolean;
// 	message: string;
// }> {
// 	try {
// 		await removeAuthCookie();

// 		return { success: true, message: "Logout Successful" };
// 	} catch {
// 		return { success: false, message: "Logout failed. Please try again" };
// 	}
// }

export async function logoutUser(): Promise<ResponseResult> {
	try {
		const user = await getCurrentUser();

		await removeAuthCookie();

		await logAudit({
			userId: user?.id ?? null,
			action: "auth.logout",
			resourceType: "User",
			resourceId: user?.id ? String(user.id) : null,
		});

		return { success: true, message: "Logout Successful" };
	} catch {
		return { success: false, message: "Logout failed. Please try again" };
	}
}

// Log user in
export async function loginUser(
	prevState: ResponseResult,
	formData: FormData
): Promise<ResponseResult> {
	try {
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		if (!email || !password) {
			return { success: false, message: "Email and password are required" };
		}

		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (!user || !user.password) {
			return { success: false, message: "Invalid email or password" };
		}

		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			return { success: false, message: "Invalid email or password" };
		}

		const token = await signAuthToken({ userId: user.id });
		await setAuthCookie(token);

		await logAudit({
			userId: user.id,
			action: "auth.login",
			resourceType: "User",
			resourceId: user.id,
		});

		return { success: true, message: "Login successful" };
	} catch {
		return { success: false, message: "Error during login" };
	}
}
