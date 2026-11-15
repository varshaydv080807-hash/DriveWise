
const pool = require("./config/db");
const bcrypt = require("bcrypt");
const readline = require("readline");

const email = "drivewise452@gmail.com";

function hiddenPrompt(question) {
    return new Promise((resolve, reject) => {
        const stdin = process.stdin;
        const stdout = process.stdout;
        let password = "";

        stdout.write(question);
        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");

        function onData(char) {
            if (char === "\u0003") {
                stdin.setRawMode(false);
                stdin.pause();
                reject(new Error("Cancelled"));
            } else if (char === "\r" || char === "\n") {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.removeListener("data", onData);
                stdout.write("\n");
                resolve(password);
            } else if (char === "\u007f" || char === "\b") {
                password = password.slice(0, -1);
            } else {
                password += char;
            }
        }

        stdin.on("data", onData);
    });
}

async function createAdmin() {
    try {
        const [existing] = await pool.execute(
            "SELECT User_ID FROM customer_user WHERE Email = ?",
            [email]
        );

        if (existing.length > 0) {
            console.log("An account with this email already exists.");
            return;
        }

        const password = await hiddenPrompt("Enter Admin password: ");
        const confirmPassword = await hiddenPrompt("Confirm Admin password: ");

        if (password.length < 12) {
            console.log("Password must be at least 12 characters.");
            return;
        }

        if (password !== confirmPassword) {
            console.log("Passwords do not match.");
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await pool.execute(
            `INSERT INTO customer_user
            (Name, Email, Password_Hash, User_Role)
            VALUES (?, ?, ?, ?)`,
            ["DriveWise Admin", email, hashedPassword, "Admin"]
        );

        console.log("Admin account created successfully!");
        console.log("Email:", email);
        console.log("Role: Admin");

    } catch (error) {
        console.error("Admin creation failed:", error.message);
    } finally {
        await pool.end();
    }
}

createAdmin();
