// Set a real password for an existing account (e.g. a seed provider whose
// password hash is a placeholder like "demo_hash_003").
//
// Usage (from /backend):  node scripts/set-password.js rohan@example.com
// The password is typed in hidden. Uses the database in backend/.env.
require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("../config/db");

function hiddenPrompt(question) {
    return new Promise((resolve) => {
        const stdin = process.stdin;
        process.stdout.write(question);
        if (!stdin.isTTY) {
            // Piped input (e.g. echo pass | node ...): read one line
            let data = "";
            stdin.setEncoding("utf8");
            stdin.on("data", (c) => { data += c; });
            stdin.on("end", () => { process.stdout.write("\n"); resolve(data.split(/\r?\n/)[0]); });
            return;
        }
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");
        let value = "";
        const onData = (char) => {
            if (char === "\r" || char === "\n" || char === "\u0004") {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.removeListener("data", onData);
                process.stdout.write("\n");
                resolve(value);
            } else if (char === "\u0003") {
                process.exit(1);
            } else if (char === "\u007f" || char === "\b") {
                value = value.slice(0, -1);
            } else {
                value += char;
            }
        };
        stdin.on("data", onData);
    });
}

async function main() {
    const email = (process.argv[2] || "").trim().toLowerCase();
    if (!email) {
        console.log("Usage: node scripts/set-password.js <email>");
        process.exit(1);
    }
    const [users] = await pool.execute("SELECT User_ID, Name, User_Role FROM customer_user WHERE Email = ?", [email]);
    if (!users.length) {
        console.log(`No account with the email ${email}`);
        process.exit(1);
    }
    const user = users[0];
    console.log(`Account: ${user.Name} (${user.User_Role})`);
    const password = await hiddenPrompt("New password (at least 8 characters): ");
    if (password.length < 8) {
        console.log("Password must be at least 8 characters.");
        process.exit(1);
    }
    await pool.execute("UPDATE customer_user SET Password_Hash = ? WHERE User_ID = ?", [await bcrypt.hash(password, 12), user.User_ID]);
    console.log("Password updated. You can now log in with this email.");
    process.exit(0);
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
