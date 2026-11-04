import crypto from "node:crypto";
import "dotenv/config";
import { MongoClient } from "mongodb";
import readline from "node:readline/promises";

async function promptLine(question) {
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await input.question(question);
  } finally {
    input.close();
  }
}

function promptPassword(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal to enter the password safely.");
  }

  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let password = "";
    const onData = (characters) => {
      for (const character of characters) {
        if (character === "\u0003") {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdout.write("\n");
          reject(new Error("Password reset cancelled."));
          return;
        } else if (character === "\r" || character === "\n") {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdout.write("\n");
          resolve(password);
          return;
        } else if (character === "\u007f" || character === "\b") {
          if (password.length) {
            password = password.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (character >= " ") {
          password += character;
          process.stdout.write("*");
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function main() {
  const email = (await promptLine("Account email: ")).trim().toLowerCase();
  const password = await promptPassword("New password (8-128 characters): ");
  const confirmation = await promptPassword("Confirm new password: ");

  if (password.length < 8 || password.length > 128) throw new Error("Password must be between 8 and 128 characters.");
  if (password !== confirmation) throw new Error("Passwords do not match.");

  const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
  try {
    await client.connect();
    const users = client.db(process.env.MONGODB_DB || "medserve").collection("users");
    const result = await users.updateOne(
      { _id: email, $or: [{ passwordHash: { $exists: false } }, { passwordHash: null }, { passwordHash: "" }] },
      { $set: { passwordHash: await hashPassword(password) } }
    );
    if (!result.matchedCount) throw new Error("No legacy account without a password hash was found for that email.");
    console.log("Password set. You can now log in with this email and your new password.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});