import http from "http";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";
import "dotenv/config";
import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "backend_data_appointments.json");
const PORT = Number(process.env.PORT || 4000);
const DEFAULT_LOCAL_URI = "mongodb://127.0.0.1:27017";
let MONGODB_URI = process.env.MONGODB_URI || DEFAULT_LOCAL_URI;
const MONGODB_DB = process.env.MONGODB_DB || "medserve";
const LEGACY_IMPORT_ID = "backend-data-json-v1";
const API_PROJECTION = { _id: 0, patientEmailLower: 0 };
const STATIC_FILES = new Map([
  ["/", ["frontend_style.html", "text/html; charset=utf-8"]],
  ["/frontend_style.html", ["frontend_style.html", "text/html; charset=utf-8"]],
  ["/about_medserve.html", ["about_medserve.html", "text/html; charset=utf-8"]],
  ["/account_medserve.html", ["account_medserve.html", "text/html; charset=utf-8"]],
  ["/contact_medserve.html", ["contact_medserve.html", "text/html; charset=utf-8"]],
  ["/feedback_medserve.html", ["feedback_medserve.html", "text/html; charset=utf-8"]],
  ["/services_medserve.html", ["services_medserve.html", "text/html; charset=utf-8"]],
  ["/team_medserve.html", ["team_medserve.html", "text/html; charset=utf-8"]],
  ["/frontend_style.css", ["frontend_style.css", "text/css; charset=utf-8"]],
  ["/fronted_style.js", ["fronted_style.js", "text/javascript; charset=utf-8"]],
  ["/site_pages.js", ["site_pages.js", "text/javascript; charset=utf-8"]]
]);
let mongoClient;
let mongoMemoryServer;
let db;
let appointmentsCollection;
let feedbacksCollection;
let contactsCollection;
let usersCollection;
let sessionsCollection;

const doctors = [
  { id: "dr-amara-okafor", name: "Dr. Amara Okafor", specialty: "General Practice", color: "#2A6F6F", workDays: [0, 1, 2, 3, 4, 5, 6], startHour: 9, endHour: 17, slotMinutes: 30 },
  { id: "dr-liam-chen", name: "Dr. Liam Chen", specialty: "Cardiology", color: "#4A6FA5", workDays: [0, 1, 2, 3, 4, 5, 6], startHour: 10, endHour: 16, slotMinutes: 45 },
  { id: "dr-sofia-reyes", name: "Dr. Sofia Reyes", specialty: "Dermatology", color: "#B5654A", workDays: [0, 1, 2, 3, 4, 5, 6], startHour: 8, endHour: 14, slotMinutes: 20 },
  { id: "dr-noah-berg", name: "Dr. Noah Berg", specialty: "Pediatrics", color: "#3F9B6C", workDays: [0, 1, 2, 3, 4, 5, 6], startHour: 9, endHour: 15, slotMinutes: 30 },
  { id: "dr-priya-sharma", name: "Dr. Priya Sharma", specialty: "Internal Medicine", color: "#D97706", workDays: [0, 1, 2, 3, 4, 5, 6], startHour: 9, endHour: 17, slotMinutes: 30 },
  { id: "dr-javier-mendez", name: "Dr. Javier Mendez", specialty: "Orthopedics", color: "#6D28D9", workDays: [0, 1, 2, 3, 4, 5, 6], startHour: 8, endHour: 15, slotMinutes: 45 },
  { id: "dr-elaine-kim", name: "Dr. Elaine Kim", specialty: "Neurology", color: "#0F766E", workDays: [0, 1, 2, 3, 4, 5, 6], startHour: 10, endHour: 16, slotMinutes: 30 },
  { id: "dr-mason-hughes", name: "Dr. Mason Hughes", specialty: "Family Medicine", color: "#DC2626", workDays: [0, 1, 2, 3, 4, 5, 6], startHour: 8, endHour: 14, slotMinutes: 30 }
];

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(json);
}

function serveStatic(pathname, res) {
  const asset = STATIC_FILES.get(pathname);
  if (!asset) return false;
  const [fileName, contentType] = asset;
  res.writeHead(200, { "Content-Type": contentType });
  res.end(readFileSync(join(__dirname, fileName)));
  return true;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function migrateLegacyData() {
  if (!existsSync(DB_PATH)) return;

  const migrations = db.collection("_migrations");
  if (await migrations.findOne({ _id: LEGACY_IMPORT_ID })) return;

  const legacyData = JSON.parse(readFileSync(DB_PATH, "utf-8"));
  const store = Array.isArray(legacyData) ? { appointments: legacyData } : legacyData;
  const imports = [
    [appointmentsCollection, Array.isArray(store.appointments) ? store.appointments : [], true],
    [feedbacksCollection, Array.isArray(store.feedbacks) ? store.feedbacks : [], false],
    [contactsCollection, Array.isArray(store.contacts) ? store.contacts : [], false]
  ];

  for (const [collection, records, isAppointment] of imports) {
    for (const record of records) {
      const document = { ...record, _id: String(record.id) };
      if (isAppointment) document.patientEmailLower = String(record.patientEmail || "").toLowerCase();
      await collection.updateOne({ _id: document._id }, { $setOnInsert: document }, { upsert: true });
    }
  }

  await migrations.updateOne(
    { _id: LEGACY_IMPORT_ID },
    { $setOnInsert: { importedAt: new Date() } },
    { upsert: true }
  );
}

async function records(collection, filter = {}) {
  return collection.find(filter, { projection: API_PROJECTION }).sort({ createdAt: -1 }).toArray();
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
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

function verifyPassword(password, storedHash) {
  if (!storedHash) return Promise.resolve(false);
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      const expected = Buffer.from(hash, "hex");
      resolve(expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey));
    });
  });
}

async function authenticatedUser(req) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const session = await sessionsCollection.findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  return usersCollection.findOne({ _id: session.userId });
}

async function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await sessionsCollection.insertOne({ _id: hashToken(token), userId: user._id, expiresAt });
  return { token, user: { name: user.name, email: user.email } };
}

async function availabilityFor(doctor, date) {
  const day = new Date(`${date}T00:00:00`);
  if (Number.isNaN(day.getTime())) return { error: "Invalid date" };
  const weekday = day.getDay();
  if (!doctor.workDays.includes(weekday)) return { date, slots: [] };

  const booked = new Set(await appointmentsCollection.distinct("time", {
    doctorId: doctor.id,
    date,
    status: { $ne: "cancelled" }
  }));

  const slots = [];
  const { startHour, endHour, slotMinutes } = doctor;
  const totalMinutes = (endHour - startHour) * 60;
  for (let m = 0; m < totalMinutes; m += slotMinutes) {
    const hour = startHour + Math.floor(m / 60);
    const minute = m % 60;
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    slots.push({ time, available: !booked.has(time) });
  }
  return { date, slots };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean); // e.g. ['api','doctors']

  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method === "GET" && serveStatic(url.pathname, res)) return;

  try {
    // POST /api/auth/signup
    if (req.method === "POST" && parts[0] === "api" && parts[1] === "auth" && parts[2] === "signup") {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!name || !email || !password) return send(res, 400, { error: "Name, email, and password are required" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "Enter a valid email address" });
      if (password.length < 8 || password.length > 128) return send(res, 400, { error: "Password must be between 8 and 128 characters" });
      const user = {
        _id: email,
        name,
        email,
        passwordHash: await hashPassword(password),
        createdAt: Date.now()
      };
      try {
        await usersCollection.insertOne(user);
      } catch (error) {
        if (error.code === 11000) return send(res, 409, { error: "An account with this email already exists" });
        throw error;
      }
      return send(res, 201, await createSession(user));
    }

    // POST /api/auth/login
    if (req.method === "POST" && parts[0] === "api" && parts[1] === "auth" && parts[2] === "login") {
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || !password) return send(res, 400, { error: "Email and password are required" });
      const user = await usersCollection.findOne({ _id: email });
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return send(res, 401, { error: "Email or password is incorrect" });
      }
      return send(res, 200, await createSession(user));
    }

    // GET /api/auth/me
    if (req.method === "GET" && parts[0] === "api" && parts[1] === "auth" && parts[2] === "me") {
      const user = await authenticatedUser(req);
      if (!user) return send(res, 401, { error: "Please log in to continue" });
      return send(res, 200, { name: user.name, email: user.email });
    }

    // GET /api/doctors
    if (req.method === "GET" && parts[0] === "api" && parts[1] === "doctors" && parts.length === 2) {
      return send(res, 200, doctors);
    }

    // GET /api/doctors/:id/availability?date=YYYY-MM-DD
    if (req.method === "GET" && parts[0] === "api" && parts[1] === "doctors" && parts[3] === "availability") {
      const doctor = doctors.find((d) => d.id === parts[2]);
      if (!doctor) return send(res, 404, { error: "Doctor not found" });
      const date = url.searchParams.get("date");
      if (!date) return send(res, 400, { error: "date query param (YYYY-MM-DD) is required" });
      const result = await availabilityFor(doctor, date);
      if (result.error) return send(res, 400, result);
      return send(res, 200, result);
    }

    // GET /api/appointments?email=
    if (req.method === "GET" && parts[0] === "api" && parts[1] === "appointments" && parts.length === 2) {
      const user = await authenticatedUser(req);
      if (!user) return send(res, 401, { error: "Please log in to view appointments" });
      const list = await records(appointmentsCollection, { patientEmailLower: user.email.toLowerCase() });
      return send(res, 200, list);
    }

    // POST /api/appointments
    if (req.method === "POST" && parts[0] === "api" && parts[1] === "appointments" && parts.length === 2) {
      const user = await authenticatedUser(req);
      if (!user) return send(res, 401, { error: "Log in or create an account before booking an appointment" });
      const body = await readBody(req);
      const { doctorId, reason, date, time } = body;
      const missing = ["doctorId", "date", "time"].filter((f) => !body[f]);
      if (missing.length) return send(res, 400, { error: `Missing required field(s): ${missing.join(", ")}` });

      const doctor = doctors.find((d) => d.id === doctorId);
      if (!doctor) return send(res, 404, { error: "Doctor not found" });

      const clash = await appointmentsCollection.findOne({
        doctorId,
        date,
        time,
        status: { $ne: "cancelled" }
      }, { projection: { _id: 1 } });
      if (clash) return send(res, 409, { error: "That slot was just booked. Pick another time." });

      const appointment = {
        id: crypto.randomBytes(6).toString("hex"),
        doctorId,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        patientName: user.name,
        patientEmail: user.email,
        reason: (reason || "").trim(),
        date,
        time,
        status: "confirmed",
        createdAt: Date.now()
      };
      try {
        await appointmentsCollection.insertOne({
          ...appointment,
          _id: appointment.id,
          patientEmailLower: appointment.patientEmail.toLowerCase()
        });
      } catch (error) {
        if (error.code === 11000) return send(res, 409, { error: "That slot was just booked. Pick another time." });
        throw error;
      }
      return send(res, 201, appointment);
    }

    // GET /api/feedbacks
    if (req.method === "GET" && parts[0] === "api" && parts[1] === "feedbacks" && parts.length === 2) {
      const list = await records(feedbacksCollection);
      return send(res, 200, list);
    }

    // POST /api/feedbacks
    if (req.method === "POST" && parts[0] === "api" && parts[1] === "feedbacks" && parts.length === 2) {
      const body = await readBody(req);
      const { name, email, feedback, rating } = body;
      const missing = ["name", "email", "feedback", "rating"].filter((f) => !body[f] && body[f] !== 0);
      if (missing.length) return send(res, 400, { error: `Missing required field(s): ${missing.join(", ")}` });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "Enter a valid email address" });
      const score = Number(rating);
      if (!Number.isInteger(score) || score < 1 || score > 5) return send(res, 400, { error: "Rating must be between 1 and 5" });

      const entry = {
        id: crypto.randomBytes(6).toString("hex"),
        name: String(name).trim(),
        email: String(email).trim(),
        feedback: String(feedback).trim(),
        rating: score,
        createdAt: Date.now()
      };
      await feedbacksCollection.insertOne({ ...entry, _id: entry.id });
      return send(res, 201, entry);
    }

    // GET /api/contacts
    if (req.method === "GET" && parts[0] === "api" && parts[1] === "contacts" && parts.length === 2) {
      const list = await records(contactsCollection);
      return send(res, 200, list);
    }

    // POST /api/contacts
    if (req.method === "POST" && parts[0] === "api" && parts[1] === "contacts" && parts.length === 2) {
      const body = await readBody(req);
      const { name, email, message } = body;
      const missing = ["name", "email", "message"].filter((f) => !body[f]);
      if (missing.length) return send(res, 400, { error: `Missing required field(s): ${missing.join(", ")}` });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "Enter a valid email address" });

      const entry = {
        id: crypto.randomBytes(6).toString("hex"),
        name: String(name).trim(),
        email: String(email).trim(),
        message: String(message).trim(),
        createdAt: Date.now()
      };
      await contactsCollection.insertOne({ ...entry, _id: entry.id });
      return send(res, 201, entry);
    }

    // DELETE /api/appointments/:id
    if (req.method === "DELETE" && parts[0] === "api" && parts[1] === "appointments" && parts.length === 3) {
      const user = await authenticatedUser(req);
      if (!user) return send(res, 401, { error: "Please log in to cancel an appointment" });
      const result = await appointmentsCollection.deleteOne({
        _id: parts[2],
        patientEmailLower: user.email.toLowerCase()
      });
      if (!result.deletedCount) return send(res, 404, { error: "Appointment not found" });
      return send(res, 200, { ok: true });
    }

    if (req.method === "GET" && parts[0] === "api" && parts[1] === "health") {
      await db.command({ ping: 1 });
      return send(res, 200, { ok: true, storage: "mongodb" });
    }

    if (req.method === "GET" && parts[0] === "api" && parts[1] === "admin" && parts.length === 2) {
      const expectedToken = process.env.ADMIN_API_TOKEN || "";
      const providedToken = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
      const expectedBuffer = Buffer.from(expectedToken);
      const providedBuffer = Buffer.from(providedToken);
      if (!expectedToken || expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
        return send(res, 403, { error: "Forbidden" });
      }
      const [appointments, feedbacks, contacts] = await Promise.all([
        records(appointmentsCollection),
        records(feedbacksCollection),
        records(contactsCollection)
      ]);
      return send(res, 200, {
        appointments,
        feedbacks,
        contacts
      });
    }

    send(res, 404, { error: "Not found" });
  } catch (err) {
    send(res, 500, { error: err.message || "Something went wrong on the server" });
  }
});

async function startServer() {
  const shouldUseLocalFallback = process.env.NODE_ENV !== "production" && (!process.env.MONGODB_URI || MONGODB_URI === DEFAULT_LOCAL_URI);

  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
  } catch (error) {
    if (!shouldUseLocalFallback) throw error;

    mongoMemoryServer = await MongoMemoryServer.create({
      binary: { version: "7.0.14" },
      instance: { dbName: MONGODB_DB }
    });
    MONGODB_URI = mongoMemoryServer.getUri();
    console.log(`MongoDB fallback started at ${MONGODB_URI}`);
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
  }

  db = mongoClient.db(MONGODB_DB);
  appointmentsCollection = db.collection("appointments");
  feedbacksCollection = db.collection("feedbacks");
  contactsCollection = db.collection("contacts");
  usersCollection = db.collection("users");
  sessionsCollection = db.collection("sessions");

  await appointmentsCollection.createIndex(
    { doctorId: 1, date: 1, time: 1 },
    { unique: true, partialFilterExpression: { status: "confirmed" }, name: "confirmed_appointment_slot" }
  );
  await appointmentsCollection.createIndex({ patientEmailLower: 1, createdAt: -1 });
  await feedbacksCollection.createIndex({ createdAt: -1 });
  await contactsCollection.createIndex({ createdAt: -1 });
  await sessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await migrateLegacyData();

  server.listen(PORT, () => {
    console.log(`Appointment booking API using MongoDB (${MONGODB_DB}) on http://localhost:${PORT}`);
  });
}

startServer().catch(async (error) => {
  console.error(`Failed to start MedServe API: ${error.message}`);
  await mongoClient?.close().catch(() => {});
  if (mongoMemoryServer) await mongoMemoryServer.stop().catch(() => {});
  process.exitCode = 1;
});
