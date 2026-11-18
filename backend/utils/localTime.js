// Booking times are stored as local wall-clock time (India), but Render's server
// clock runs in UTC. Use this instead of NOW() when comparing with booking times.
const TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

function nowLocalSql(date = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", {
            timeZone: TIME_ZONE,
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hourCycle: "h23"
        }).formatToParts(date).map((p) => [p.type, p.value])
    );
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

module.exports = { nowLocalSql, TIME_ZONE };
