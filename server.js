const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- ФУНКЦИИ БАЗЫ ---
function getDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return { users: [] };
        const raw = fs.readFileSync(DB_FILE);
        return JSON.parse(raw);
    } catch (e) {
        return { users: [] };
    }
}

function saveDB(data) {
    const content = Array.isArray(data) ? { users: data } : data;
    fs.writeFileSync(DB_FILE, JSON.stringify(content, null, 2));
}

// --- АВТО-ПОЧИНКА АДМИНА ---
// При каждом запуске проверяем и перезаписываем админа, чтобы пароль точно подходил
const adminUser = { 
    id: 'admin', 
    accountNumber: '0000', // <--- ВАЖНО: Номер счета, а не логин
    pass: 'Toyota400', 
    name: 'Главный Админ', 
    balance: 999999999, 
    isAdmin: true, 
    emoji: '👑', 
    isFrozen: false,
    history: [],
    reactions: {},
    wall: []
};

const db = getDB();
// Удаляем старого админа (если был) и ставим нового в начало списка
db.users = db.users.filter(u => u.id !== 'admin');
db.users.unshift(adminUser);
saveDB(db);
console.log("✅ Аккаунт Админа восстановлен: Счет 0000 / Пароль Toyota400");

// --- API ---
app.get('/api/users', (req, res) => {
    res.json(getDB().users);
});

app.post('/api/save', (req, res) => {
    saveDB({ users: req.body });
    res.json({ success: true });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});
