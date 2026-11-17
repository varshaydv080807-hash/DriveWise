const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

function responseRecorder() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test("auth middleware rejects requests without a bearer token", () => {
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-only-secret";
    try {
        const req = { headers: {} };
        const res = responseRecorder();
        let called = false;
        authMiddleware(req, res, () => { called = true; });
        assert.equal(res.statusCode, 401);
        assert.equal(called, false);
    } finally {
        if (previous === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previous;
    }
});

test("auth middleware attaches a verified user", () => {
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-only-secret";
    try {
        const token = jwt.sign({ userId: 42, userRole: "Provider" }, process.env.JWT_SECRET, { issuer: "drivewise-api" });
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = responseRecorder();
        let called = false;
        authMiddleware(req, res, () => { called = true; });
        assert.equal(called, true);
        assert.equal(req.user.userId, 42);
        assert.equal(req.user.userRole, "Provider");
    } finally {
        if (previous === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previous;
    }
});

test("role middleware rejects an unapproved role", () => {
    const req = { user: { userRole: "Customer" } };
    const res = responseRecorder();
    let called = false;
    authorizeRoles("Admin")(req, res, () => { called = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(called, false);
});

test("role middleware permits an approved role", () => {
    const req = { user: { userRole: "Admin" } };
    const res = responseRecorder();
    let called = false;
    authorizeRoles("Admin")(req, res, () => { called = true; });
    assert.equal(called, true);
});


test("auth middleware rejects tokens without the DriveWise issuer", () => {
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-only-secret";
    try {
        const token = jwt.sign({ userId: 42, userRole: "Provider" }, process.env.JWT_SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = responseRecorder();
        let called = false;
        authMiddleware(req, res, () => { called = true; });
        assert.equal(res.statusCode, 401);
        assert.equal(called, false);
    } finally {
        if (previous === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previous;
    }
});

test("auth middleware rejects unsupported roles in a correctly issued token", () => {
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-only-secret";
    try {
        const token = jwt.sign(
            { userId: 42, userRole: "SuperAdmin" },
            process.env.JWT_SECRET,
            { issuer: "drivewise-api" }
        );
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = responseRecorder();
        let called = false;
        authMiddleware(req, res, () => { called = true; });
        assert.equal(res.statusCode, 401);
        assert.equal(called, false);
    } finally {
        if (previous === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previous;
    }
});
