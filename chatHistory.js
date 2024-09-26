const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./chat_history.db');

// Initialize the database
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        role TEXT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

module.exports = {
    getHistory: (userId) => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT role, message FROM messages WHERE userId = ? ORDER BY timestamp ASC LIMIT 30',
                [userId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        const history = rows.map((row) => ({
                            role: row.role,
                            parts: [{ text: row.message }],
                        }));
                        resolve(history);
                    }
                }
            );
        });
    },

    addMessage: (userId, message, role) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO messages (userId, role, message) VALUES (?, ?, ?)',
                [userId, role, message],
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    },

    errorTemplateMessage: (userId, message) => {
        return Promise.all([
            module.exports.addMessage(userId, message, 'user'),
            module.exports.addMessage(userId, 'Astaghfirullah 😌', 'model'),
        ]);
    },

    addGeminiVisionChat: (userId, message, role) => {
        return module.exports.addMessage(userId, message, role);
    },

    clearLastTwo: (userId) => {
        return new Promise((resolve, reject) => {
            db.run(
                'DELETE FROM messages WHERE userId = ? AND id IN (SELECT id FROM messages WHERE userId = ? ORDER BY timestamp DESC LIMIT 2)',
                [userId, userId],
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    },

    clearHistory: (userId) => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM messages WHERE userId = ?', [userId], (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Chat history cleared');
                    resolve();
                }
            });
        });
    },

    clearAllHistory: () => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM messages', (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('All chat history cleared');
                    resolve();
                }
            });
        });
    },
};
