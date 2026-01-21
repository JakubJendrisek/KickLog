const database = require("../db");
const argon = require("argon2");
const jwt = require("jsonwebtoken");
require('dotenv').config()

const getBearerToken = (req) => {
  const raw = req.headers?.authorization;
  if (!raw || typeof raw !== "string") return "";
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
};

const verifyAccessToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
};

const signAccessToken = (user) => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || "1h";
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
    },
    secret,
    { expiresIn }
  );
};

const registerUser = async (req, res) => {
  try{
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ message: "Chybí email/username/password" });
    }

    const existing = await database.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Uživatel s tímto emailem už existuje" });
    }

    const hashedPassword = await argon.hash(password);
    console.log(hashedPassword)

    const created = await database.query(
      "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username",
      [email, username, hashedPassword]
    );

    const user = created.rows[0];
    const token = signAccessToken(user);

    res.status(201).json({ message: "Uživatel úspěšně zaregistrován", token, user });
  }
  catch (error) {
    res.status(500).json({ message: 'Chyba při registraci uživatele', error: error.message });
  }
};

const loginUser = async (req, res) => { 
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Chybí email/password" });
    }

    const result = await database.query(
      "SELECT id, email, username, password_hash FROM users WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Uživatel neexistuje" });
    }

    const user = result.rows[0];

    const isPasswordValid = await argon.verify(user.password_hash, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Neplatné heslo" });
    }

    const token = signAccessToken(user);

    res.status(200).json({ message: "Uživatel úspěšně přihlášen", token, user: { id: user.id, email: user.email, username: user.username } });
  }
  catch (error) {
    res.status(500).json({ message: 'Chyba při přihlášení uživatele', error: error.message });
  }
}

const changePassword = async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Chybí Authorization Bearer token" });

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return res.status(401).json({ message: "Neplatný nebo expirovaný token" });
    }

    const userId = decoded?.sub;
    if (userId == null) return res.status(401).json({ message: "Token nemá sub (user id)" });

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Chybí currentPassword/newPassword" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "Nové heslo musí mít alespoň 8 znaků" });
    }

    const result = await database.query(
      "SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Uživatel neexistuje" });

    const user = result.rows[0];
    const ok = await argon.verify(user.password_hash, currentPassword);
    if (!ok) return res.status(401).json({ message: "Aktuální heslo není správně" });

    const hashedPassword = await argon.hash(newPassword);
    await database.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hashedPassword, user.id]);
    return res.status(200).json({ message: "Heslo bylo změněno" });
  } catch (error) {
    return res.status(500).json({ message: "Chyba při změně hesla", error: error.message });
  }
};

module.exports = { registerUser, loginUser, changePassword };