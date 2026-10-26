
const bookings = [
    { id: 101, date: "2026-01-05", category: "Sedan", status: "Completed", amount: 8000 },
    { id: 102, date: "2026-01-12", category: "SUV", status: "Completed", amount: 12000 },
    { id: 103, date: "2026-01-20", category: "Bike", status: "Cancelled", amount: 2000 },
    { id: 104, date: "2026-02-04", category: "Hatchback", status: "Completed", amount: 5000 },
    { id: 105, date: "2026-02-10", category: "SUV", status: "Confirmed", amount: 10000 },
    { id: 106, date: "2026-02-18", category: "Sedan", status: "Completed", amount: 7500 },
    { id: 107, date: "2026-03-03", category: "Bike", status: "Completed", amount: 2500 },
    { id: 108, date: "2026-03-11", category: "Hatchback", status: "Cancelled", amount: 4000 },
    { id: 109, date: "2026-03-15", category: "SUV", status: "Completed", amount: 15000 },
    { id: 110, date: "2026-04-02", category: "Sedan", status: "Confirmed", amount: 9000 },
    { id: 111, date: "2026-04-12", category: "Bike", status: "Completed", amount: 3000 },
    { id: 112, date: "2026-04-22", category: "SUV", status: "Completed", amount: 14000 },
    { id: 113, date: "2026-05-06", category: "Hatchback", status: "Completed", amount: 6000 },
    { id: 114, date: "2026-05-14", category: "Sedan", status: "Cancelled", amount: 7000 },
    { id: 115, date: "2026-05-25", category: "SUV", status: "Completed", amount: 16000 },
    { id: 116, date: "2026-06-08", category: "Bike", status: "Confirmed", amount: 3500 },
    { id: 117, date: "2026-06-16", category: "Hatchback", status: "Completed", amount: 5500 },
    { id: 118, date: "2026-06-24", category: "Sedan", status: "Completed", amount: 8500 }
];

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

const currency = amount =>
    "₹" + amount.toLocaleString("en-IN");

let filteredBookings = [...bookings];

function getCompleted(list) {
    return list.filter(
        booking => booking.status === "Completed"
    );
}

function renderSummary(list) {
    const completed = getCompleted(list);

    const revenue = completed.reduce(
        (sum, booking) => sum + booking.amount, 0
    );

    totalRevenue.textContent = currency(revenue);
    totalBookings.textContent = list.length;
    completedBookings.textContent = completed.length;

    averageBooking.textContent = currency(
        completed.length ? Math.round(revenue / completed.length) : 0
    );
}

function renderRevenueChart(list) {
    const monthlyRevenue = {};

    list.forEach(booking => {
        if (booking.status !== "Completed") return;

        const month = booking.date.slice(0, 7);
        monthlyRevenue[month] =
            (monthlyRevenue[month] || 0) + booking.amount;
    });

    const months = Object.keys(monthlyRevenue).sort();

    if (months.length === 0) {
        revenueChart.innerHTML =
            '<p class="empty-message">No completed revenue for this period.</p>';
        return;
    }

    const maxRevenue = Math.max(...Object.values(monthlyRevenue), 1);

    revenueChart.innerHTML = months.map(month => {
        const amount = monthlyRevenue[month];
        const width = (amount / maxRevenue) * 100;

        const label = new Date(
            month + "-01T12:00:00"
        ).toLocaleDateString("en-IN", {
            month: "short",
            year: "2-digit"
        });

        return `
            <div class="chart-row">
                <span class="chart-month">${label}</span>
                <div class="chart-track">
                    <div class="chart-bar" style="width: ${width}%"></div>
                </div>
                <span class="chart-value">${currency(amount)}</span>
            </div>
        `;
    }).join("");
}

function renderStatusBreakdown(list) {
    const statuses = ["Completed", "Confirmed", "Cancelled"];

    statusBreakdown.innerHTML = statuses.map(status => {
        const count = list.filter(
            booking => booking.status === status
        ).length;

        const percentage = list.length
            ? (count / list.length) * 100
            : 0;

        return `
            <div class="breakdown-item">
                <div class="breakdown-label">
                    <span class="status status-${status.toLowerCase()}">
                        ${status}
                    </span>
                    <strong>${count}</strong>
                </div>
                <div class="breakdown-track">
                    <div class="breakdown-fill"
                         style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function renderCategoryTable(list) {
    const categories = [...new Set(
        bookings.map(booking => booking.category)
    )].sort();

    categoryTable.innerHTML = categories.map(category => {
        const categoryBookings = list.filter(
            booking => booking.category === category
        );

        const completed = getCompleted(categoryBookings);

        const revenue = completed.reduce(
            (sum, booking) => sum + booking.amount, 0
        );

        return `
            <tr>
                <td>${category}</td>
                <td>${categoryBookings.length}</td>
                <td>${completed.length}</td>
                <td>${currency(revenue)}</td>
            </tr>
        `;
    }).join("");
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

    filteredBookings = bookings.filter(booking => {
        const afterStart = !from || booking.date >= from;
        const beforeEnd = !to || booking.date <= to;

        return afterStart && beforeEnd;
    });

    filterMessage.classList.remove("error-message");
    filterMessage.textContent =
        `Showing ${filteredBookings.length} booking(s) for the selected period.`;

    renderReport(filteredBookings);
}

function resetFilter() {
    startDate.value = "";
    endDate.value = "";
    filteredBookings = [...bookings];

    filterMessage.classList.remove("error-message");
    filterMessage.textContent = "Showing all available sample data.";

    renderReport(filteredBookings);
}

function downloadCSV() {
    const headers = [
        "Booking ID",
        "Date",
        "Vehicle Category",
        "Status",
        "Amount (INR)"
    ];

    const rows = filteredBookings.map(booking => [
        booking.id,
        booking.date,
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

filterMessage.textContent = "Showing all available sample data.";
renderReport(filteredBookings);
