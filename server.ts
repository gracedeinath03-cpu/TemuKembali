import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("temu_kehilangan.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT CHECK(type IN ('lost', 'found')),
    name TEXT NOT NULL,
    owner_name TEXT,
    location TEXT NOT NULL,
    time TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    item_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id),
    FOREIGN KEY(item_id) REFERENCES items(id)
  );
`);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  app.use(express.json());

  // Auth Endpoints
  app.post("/api/register", (req, res) => {
    const { name, email, password } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
      const result = stmt.run(name, email, password);
      res.json({ id: result.lastInsertRowid, name, email });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json({ id: user.id, name: user.name, email: user.email });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Items Endpoints
  app.get("/api/items", (req, res) => {
    const { type, search } = req.query;
    let query = "SELECT items.*, users.name as user_name FROM items JOIN users ON items.user_id = users.id WHERE status = 'active'";
    const params: any[] = [];
    
    if (type) {
      query += " AND type = ?";
      params.push(type);
    }
    if (search) {
      query += " AND (items.name LIKE ? OR location LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    query += " ORDER BY created_at DESC";
    
    const items = db.prepare(query).all(...params);
    res.json(items);
  });

  app.post("/api/items", (req, res) => {
    const { user_id, type, name, owner_name, location, time, description, image_url } = req.body;
    const stmt = db.prepare(`
      INSERT INTO items (user_id, type, name, owner_name, location, time, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(user_id, type, name, owner_name, location, time, description, image_url);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/items/me", (req, res) => {
    const { user_id } = req.query;
    const items = db.prepare("SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC").all(user_id);
    res.json(items);
  });

  // Chat Endpoints
  app.get("/api/messages/:userId", (req, res) => {
    const { userId } = req.params;
    const messages = db.prepare(`
      SELECT messages.*, u1.name as sender_name, u2.name as receiver_name 
      FROM messages 
      JOIN users u1 ON messages.sender_id = u1.id
      JOIN users u2 ON messages.receiver_id = u2.id
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY created_at ASC
    `).all(userId, userId);
    res.json(messages);
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on("send_message", (data) => {
      const { sender_id, receiver_id, item_id, content } = data;
      const stmt = db.prepare("INSERT INTO messages (sender_id, receiver_id, item_id, content) VALUES (?, ?, ?, ?)");
      const result = stmt.run(sender_id, receiver_id, item_id, content);
      
      const msg = { ...data, id: result.lastInsertRowid, created_at: new Date().toISOString() };
      io.to(`user_${receiver_id}`).emit("receive_message", msg);
      socket.emit("message_sent", msg);
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
