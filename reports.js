
const BOOKING_STORAGE_KEY = "driveWiseBookings";

const startDate = document.getElementById("start-date");
const endDate = document.getElementById("end-date");
const totalRevenue = document.getElementById("total-revenue");
const totalBookings = document.getElementById("total-bookings");
const completedBookings = document.getElementById("completed-bookings");
const averageBooking = document.getElementById("average-booking");
const revenueChart = document.getElementById("revenue-chart");
const statusBreakdown = document.getElementById("status-breakdown");
const categoryTable = document.getElementById("category-table");
const filterMessage = document.getElementById("filter-message");

const demoBookings = [
    { id: "101", date: "2026-01-05", vehicle: "Hyundai Verna", category: "Sedan", status: "Completed", amount: 8000 },
    { id: "102", date: "2026-01-12", vehicle: "Hyundai Creta", category: "SUV", status: "Completed", amount: 12000 },
    { id: "103", date: "2026-01-20", vehicle: "Honda Activa", category: "Bike", status: "Cancelled", amount: 2000 },
    { id: "104", date: "2026-02-04", vehicle: "Maruti Swift", category: "Hatchback", status: "Completed", amount: 5000 },
    { id: "105", date: "2026-02-10", vehicle: "Kia Seltos", category: "SUV", status: "Confirmed", amount: 10000 },
    { id: "106", date: "2026-02-18", vehicle: "Honda City", category: "Sedan", status: "Completed", amount: 7500 },
    { id: "107", date: "2026-03-03", vehicle: "Royal Enfield Classic", category: "Bike", status: "Completed", amount: 2500 },
    { id: "108", date: "2026-03-11", vehicle: "Maruti Baleno", category: "Hatchback", status: "Cancelled", amount: 4000 },
    { id: "109", date: "2026-03-15", vehicle: "Hyundai Creta", category: "SUV", status: "Completed", amount: 15000 },
    { id: "110", date: "2026-04-02", vehicle: "Honda City", category: "Sedan", status: "Confirmed", amount: 9000 },
    { id: "111", date: "2026-04-12", vehicle: "Honda Activa", category: "Bike", status: "Completed", amount: 3000 },
    { id: "112", date: "2026-04-22", vehicle: "Kia Seltos", category: "SUV", status: "Completed", amount: 14000 },
    { id: "113", date: "2026-05-06", vehicle: "Maruti Swift", category: "Hatchback", status: "Completed", amount: 6000 },
    { id: "114", date: "2026-05-14", vehicle: "Hyundai Verna", category: "Sedan", status: "Cancelled", amount: 7000 },
    { id: "115", date: "2026-05-25", vehicle: "Hyundai Creta", category: "SUV", status: "Completed", amount: 16000 },
    { id: "116", date: "2026-06-08", vehicle: "Royal Enfield Classic", category: "Bike", status: "Confirmed", amount: 3500 },
    { id: "117", date: "2026-06-16", vehicle: "Maruti Baleno", category: "Hatchback", status: "Completed", amount: 5500 },
    { id: "118", date: "2026-06-24", vehicle: "Honda City", category: "Sedan", status: "Completed", amount: 8500 }
];

const currency = amount =>
    "₹" + Number(amount).toLocaleString("en-IN");

function inferCategory(vehicleName) {
    const name = String(vehicleName || "").toLowerCase();

    if (/bike|scooter|activa|classic|bullet|scooty|motorcycle/.test(name))
        return "Bike";

    if (/suv|creta|seltos|fortuner|thar|scorpio|xuv|brezza/.test(name))
        return "SUV";

    if (/swift|baleno|wagon|hatch|i10|i20|alto/.test(name))
        return "Hatchback";

    if (/bus|truck/.test(name))
        return /bus/.test(name) ? "Bus" : "Truck";

    if (/bicycle|cycle/.test(name))
        return "Bicycle";

    return "Sedan";
}


function loadBookings() {
    try {
        const saved = localStorage.getItem(BOOKING_STORAGE_KEY);

        // If there are no saved bookings, use sample data for the demo.
        if (saved === null) {
            return demoBookings.map(booking => ({ ...booking }));
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            return demoBookings.map(booking => ({ ...booking }));
        }

        const normalizedBookings = parsed.map(booking => {
            const vehicle = booking.vehicle || booking.vehicleName || "Unknown vehicle";

            let amount = booking.amount;
            if (amount === undefined) amount = booking.totalAmount;
            if (typeof amount === "string") {
                amount = Number(amount.replace(/[₹,\s]/g, ""));
            }

            const rawStatus = String(booking.status || "Pending").toLowerCase();
            const statusMap = {
                pending: "Pending",
                confirmed: "Confirmed",
                ongoing: "Ongoing",
                completed: "Completed",
                cancelled: "Cancelled"
            };

            return {
                id: String(booking.id || booking.bookingId || ""),
                date: booking.pickupDate || booking.date || "",
                vehicle,
                category: booking.category || inferCategory(vehicle),
                status: statusMap[rawStatus] || "Pending",
                amount: Number(amount) || 0
            };
        }).filter(booking =>
            /^\d{4}-\d{2}-\d{2}$/.test(booking.date)
        );

        // If saved data contains no usable records, keep the report populated.
        if (normalizedBookings.length === 0) {
            return demoBookings.map(booking => ({ ...booking }));
        }

        return normalizedBookings;
    } catch (error) {
        console.error("Could not read booking data:", error);
        return demoBookings.map(booking => ({ ...booking }));
    }
}


let bookings = loadBookings();
let filteredBookings = [...bookings];

function getCompleted(list) {
    return list.filter(booking => booking.status === "Completed");
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function renderSummary(list) {
    const completed = getCompleted(list);

    const revenue = completed.reduce(
        (sum, booking) => sum + booking.amount,
        0
    );

    totalRevenue.textContent = currency(revenue);
    totalBookings.textContent = list.length;
    completedBookings.textContent = completed.length;

    averageBooking.textContent = currency(
        completed.length ? Math.round(revenue / completed.length) : 0
    );
}

function renderRevenueChart(list) {
    revenueChart.replaceChildren();

    const monthlyRevenue = {};

    list.forEach(booking => {
        if (booking.status !== "Completed") return;

        const month = booking.date.slice(0, 7);

        monthlyRevenue[month] =
            (monthlyRevenue[month] || 0) + booking.amount;
    });

    const months = Object.keys(monthlyRevenue).sort();

    if (!months.length) {
        revenueChart.appendChild(
            createElement(
                "p",
                "empty-message",
                "No completed revenue for this period."
            )
        );
        return;
    }

    const maxRevenue = Math.max(
        ...Object.values(monthlyRevenue),
        1
    );

    months.forEach(month => {
        const amount = monthlyRevenue[month];

        const label = new Date(`${month}-01T12:00:00`)
            .toLocaleDateString("en-IN", {
                month: "short",
                year: "2-digit"
            });

        const row = createElement("div", "chart-row");
        row.appendChild(createElement("span", "chart-month", label));

        const track = createElement("div", "chart-track");
        const bar = createElement("div", "chart-bar");

        bar.style.width = `${(amount / maxRevenue) * 100}%`;
        bar.title = currency(amount);

        track.appendChild(bar);
        row.appendChild(track);

        row.appendChild(
            createElement("span", "chart-value", currency(amount))
        );

        revenueChart.appendChild(row);
    });
}

function renderStatusBreakdown(list) {
    statusBreakdown.replaceChildren();

    const statuses = [
        "Pending",
        "Confirmed",
        "Ongoing",
        "Completed",
        "Cancelled"
    ];

    statuses.forEach(status => {
        const count = list.filter(
            booking => booking.status === status
        ).length;

        const percentage = list.length
            ? (count / list.length) * 100
            : 0;

        const item = createElement("div", "breakdown-item");
        const label = createElement("div", "breakdown-label");

        const badge = createElement(
            "span",
            `status ${status.toLowerCase()}`,
            status
        );

        label.append(
            badge,
            createElement("strong", "", String(count))
        );

        const track = createElement("div", "breakdown-track");
        const fill = createElement("div", "breakdown-fill");

        fill.style.width = `${percentage}%`;

        track.appendChild(fill);
        item.append(label, track);
        statusBreakdown.appendChild(item);
    });
}

function renderCategoryTable(list) {
    categoryTable.replaceChildren();

    const categories = [
        ...new Set([
            ...list.map(booking => booking.category),
            "Bike",
            "Hatchback",
            "Sedan",
            "SUV"
        ])
    ].sort();

    categories.forEach(category => {
        const categoryBookings = list.filter(
            booking => booking.category === category
        );

        const completed = getCompleted(categoryBookings);

        const revenue = completed.reduce(
            (sum, booking) => sum + booking.amount,
            0
        );

        const row = document.createElement("tr");

        [
            category,
            categoryBookings.length,
            completed.length,
            currency(revenue)
        ].forEach(value => {
            row.appendChild(
                createElement("td", "", String(value))
            );
        });

        categoryTable.appendChild(row);
    });
}

function renderReport(list) {
    renderSummary(list);
    renderRevenueChart(list);
    renderStatusBreakdown(list);
    renderCategoryTable(list);
}

function applyFilter() {
    const from = startDate.value;
    const to = endDate.value;

    if (from && to && from > to) {
        filterMessage.textContent =
            "The start date must be before or equal to the end date.";

        filterMessage.classList.add("error-message");
        return;
    }

    filteredBookings = bookings.filter(booking =>
        (!from || booking.date >= from) &&
        (!to || booking.date <= to)
    );

    filterMessage.classList.remove("error-message");

    filterMessage.textContent =
        `Showing ${filteredBookings.length} booking(s) for the selected period` +
        (localStorage.getItem(BOOKING_STORAGE_KEY) !== null
            ? ". Data source: Booking Management."
            : ". Data source: sample data.");

    renderReport(filteredBookings);
}

function resetFilter() {
    startDate.value = "";
    endDate.value = "";

    bookings = loadBookings();
    filteredBookings = [...bookings];

    filterMessage.classList.remove("error-message");

    filterMessage.textContent =
        `Showing all ${filteredBookings.length} booking(s). ` +
        (localStorage.getItem(BOOKING_STORAGE_KEY) !== null
            ? "Data source: Booking Management."
            : "Data source: sample data.");

    renderReport(filteredBookings);
}

function downloadCSV() {
    const headers = [
        "Booking ID",
        "Pickup Date",
        "Vehicle",
        "Vehicle Category",
        "Status",
        "Amount (INR)"
    ];

    const rows = filteredBookings.map(booking => [
        booking.id,
        booking.date,
        booking.vehicle,
        booking.category,
        booking.status,
        booking.amount
    ]);

    const csvContent = [headers, ...rows]
        .map(row =>
            row.map(value =>
                `"${String(value).replace(/"/g, '""')}"`
            ).join(",")
        )
        .join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csvContent],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "drivewise-report.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

document.getElementById("apply-filter")
    .addEventListener("click", applyFilter);

document.getElementById("reset-filter")
    .addEventListener("click", resetFilter);

document.getElementById("download-report")
    .addEventListener("click", downloadCSV);

const hasSavedBookings =
    localStorage.getItem(BOOKING_STORAGE_KEY) !== null;

filterMessage.textContent = hasSavedBookings
    ? `Showing all ${bookings.length} booking(s). Data source: Booking Management.`
    : `Showing all ${bookings.length} booking(s). Data source: sample data until bookings are saved.`;

renderReport(filteredBookings);
