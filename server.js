const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { promisify } = require("util");

const PORT = Number(process.env.PORT) || 8080;
const ROOT = __dirname;
const DATA_FILE = process.env.TASKFLOW_USERS_FILE || path.join(os.homedir(), ".taskflow", "students.json");
const sessions = new Map();
const loginFailures = new Map();
const scrypt = promisify(crypto.scrypt);
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const SESSION_COOKIE = "taskflow_session";
const users = loadUsers();
const DUMMY_PASSWORD_SALT = crypto.randomBytes(16);
const DUMMY_PASSWORD_HASH = crypto.randomBytes(64);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function loadUsers() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (!Array.isArray(data) || data.some(user =>
      !user ||
      typeof user.email !== "string" ||
      typeof user.passwordSalt !== "string" ||
      typeof user.passwordHash !== "string"
    )) {
      throw new Error("Student data contains invalid account records.");
    }
    return new Map(data.map(user => [user.email, user]));
  } catch (error) {
    if (error.code === "ENOENT") return new Map();
    throw new Error(`Unable to load student accounts: ${error.message}`);
  }
}

function saveUsers() {
  const directory = path.dirname(DATA_FILE);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(Array.from(users.values()), null, 2), { mode: 0o600 });
  fs.renameSync(temporaryFile, DATA_FILE);
}

function publicStudent(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    course: user.course,
    semester: user.semester
  };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

async function verifyPassword(password, user) {
  const expectedHash = user ? Buffer.from(user.passwordHash, "hex") : DUMMY_PASSWORD_HASH;
  const salt = user ? Buffer.from(user.passwordSalt, "hex") : DUMMY_PASSWORD_SALT;
  const actualHash = await scrypt(password, salt, DUMMY_PASSWORD_HASH.length);
  return Boolean(user) &&
    actualHash.length === expectedHash.length &&
    crypto.timingSafeEqual(actualHash, expectedHash);
}

function isLoginRateLimited(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const attempt = loginFailures.get(key);
  if (!attempt || now - attempt.startedAt >= LOGIN_ATTEMPT_WINDOW_MS) {
    loginFailures.set(key, { count: 0, startedAt: now });
    return false;
  }
  return attempt.count >= LOGIN_ATTEMPT_LIMIT;
}

function recordLoginFailure(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let attempt = loginFailures.get(key);
  if (!attempt || now - attempt.startedAt >= LOGIN_ATTEMPT_WINDOW_MS) {
    attempt = { count: 0, startedAt: now };
  }
  attempt.count++;
  loginFailures.set(key, attempt);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 10000) {
        reject(new Error("Request body is too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function getSession(req) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map(part => {
    const separator = part.indexOf("=");
    return separator < 0
      ? ["", ""]
      : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
  const token = cookies[SESSION_COOKIE];
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function createSession(user, res) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { student: publicStudent(user), expiresAt: Date.now() + SESSION_TTL_MS });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`);
}

function clearSession(req, res) {
  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`));
  if (cookie) sessions.delete(cookie.slice(SESSION_COOKIE.length + 1));
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "POST" && url.pathname === "/api/register") {
    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }

    const { email, name, course, semester, password } = body;
    if (![email, name, course, semester, password].every(value => typeof value === "string" && value.trim())) {
      sendJson(res, 400, { error: "Name, email, course, semester, and password are required." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const studentName = name.trim();
    const studentCourse = course.trim();
    const studentSemester = semester.trim();
    if (!isValidEmail(normalizedEmail)) {
      sendJson(res, 400, { error: "Enter a valid email address." });
      return;
    }
    if (studentName.length > 80 || studentCourse.length > 100 || studentSemester.length > 50) {
      sendJson(res, 400, { error: "Please shorten the student profile fields." });
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      sendJson(res, 400, { error: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.` });
      return;
    }
    if (users.has(normalizedEmail)) {
      sendJson(res, 409, { error: "An account with this email already exists. Sign in instead." });
      return;
    }

    try {
      const { salt, hash } = await hashPassword(password);
      if (users.has(normalizedEmail)) {
        sendJson(res, 409, { error: "An account with this email already exists. Sign in instead." });
        return;
      }
      const user = {
        id: `student-${crypto.randomBytes(8).toString("hex")}`,
        email: normalizedEmail,
        name: studentName,
        course: studentCourse,
        semester: studentSemester,
        passwordSalt: salt,
        passwordHash: hash
      };
      users.set(normalizedEmail, user);
      try {
        saveUsers();
      } catch (error) {
        users.delete(normalizedEmail);
        throw error;
      }
      createSession(user, res);
      sendJson(res, 201, { student: publicStudent(user) });
    } catch (error) {
      console.error("Unable to register student:", error);
      sendJson(res, 500, { error: "Unable to create the account. Please try again." });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    if (isLoginRateLimited(req)) {
      sendJson(res, 429, { error: "Too many sign-in attempts. Try again in 15 minutes." });
      return;
    }
    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }
    const { email, password } = body;
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
      sendJson(res, 400, { error: "Email and password are required." });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail) || password.length > PASSWORD_MAX_LENGTH) {
      sendJson(res, 400, { error: "Enter a valid email and password." });
      return;
    }
    try {
      const user = users.get(normalizedEmail);
      if (!(await verifyPassword(password, user))) {
        recordLoginFailure(req);
        sendJson(res, 401, { error: "Invalid email or password." });
        return;
      }
      loginFailures.delete(req.socket.remoteAddress || "unknown");
      createSession(user, res);
      sendJson(res, 200, { student: publicStudent(user) });
    } catch (error) {
      console.error("Unable to sign in student:", error);
      sendJson(res, 500, { error: "Unable to sign in right now. Please try again." });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    const session = getSession(req);
    if (!session) {
      sendJson(res, 401, { error: "Not authenticated." });
      return;
    }
    sendJson(res, 200, {
      student: session.student
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    clearSession(req, res);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  let relativePath = decodeURIComponent(url.pathname);
  if (relativePath === "/") relativePath = "/index.html";
  const filePath = path.resolve(ROOT, "." + relativePath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`TASKFLOW running at http://localhost:${PORT}`);
});
