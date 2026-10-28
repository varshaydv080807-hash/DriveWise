
const bookingTableBody = document.getElementById("bookingTableBody");
const bookingSearch = document.getElementById("bookingSearch");
const bookingStatusFilter = document.getElementById("bookingStatusFilter");
const bookingFormPanel = document.getElementById("bookingFormPanel");
const bookingForm = document.getElementById("bookingForm");
const bookingFormTitle = document.getElementById("bookingFormTitle");

const fields = {
    id: document.getElementById("bookingId"),
    customer: document.getElementById("bookingCustomer"),
    vehicle: document.getElementById("bookingVehicle"),
    pickupBranch: document.getElementById("pickupBranch"),
    returnBranch: document.getElementById("returnBranch"),
    pickupDate: document.getElementById("pickupDate"),
    returnDate: document.getElementById("returnDate"),
    amount: document.getElementById("bookingAmount"),
    status: document.getElementById("bookingStatus")
};

let editingBookingRow = null;

// Initial statuses for the five sample bookings already in the HTML.
const initialStatuses = [
    "Confirmed",
    "Pending",
    "Completed",
    "Confirmed",
    "Cancelled"
];

function getStatus(row) {
    return row.cells[8].querySelector(".status")?.textContent.trim() || "";
}

function getStatusClass(status) {
    const classes = {
        Pending: "pending",
        Confirmed: "confirmed",
        Ongoing: "confirmed",
        Completed: "completed",
        Cancelled: "cancelled"
    };

    return classes[status] || "pending";
}

// Fill the missing status and action cells for existing HTML rows.
function initializeBookings() {
    const rows = [...bookingTableBody.querySelectorAll("tr")];

    rows.forEach((row, index) => {
        // Ensure every row has exactly 10 cells.
        while (row.cells.length < 10) {
            row.appendChild(document.createElement("td"));
        }

        // Add the sample status if the row doesn't already have one.
        if (!getStatus(row)) {
            const status = initialStatuses[index] || "Pending";
            const badge = document.createElement("span");
            badge.className = `status ${getStatusClass(status)}`;
            badge.textContent = status;
            row.cells[8].replaceChildren(badge);
        }
    });

    setupActionButtons();
    updateBookingSummary();
}

function setupActionButtons() {
    bookingTableBody.querySelectorAll("tr").forEach(row => {
        while (row.cells.length < 10) {
            row.appendChild(document.createElement("td"));
        }

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "action-btn";
        editButton.dataset.action = "edit";
        editButton.textContent = "Edit";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "action-btn delete-btn";
        cancelButton.dataset.action = "cancel";
        cancelButton.textContent = "Cancel";

        row.cells[9].replaceChildren(editButton, cancelButton);
    });
}

function updateBookingSummary() {
    const rows = [...bookingTableBody.querySelectorAll("tr")];

    document.getElementById("totalBookings").textContent = rows.length;
    document.getElementById("pendingBookings").textContent =
        rows.filter(row => getStatus(row) === "Pending").length;
    document.getElementById("confirmedBookings").textContent =
        rows.filter(row => getStatus(row) === "Confirmed").length;
    document.getElementById("completedBookings").textContent =
        rows.filter(row => getStatus(row) === "Completed").length;
}

function filterBookings() {
    const query = bookingSearch.value.toLowerCase().trim();
    const selectedStatus = bookingStatusFilter.value.toLowerCase();

    bookingTableBody.querySelectorAll("tr").forEach(row => {
        const searchableText = [
            row.cells[0].textContent,
            row.cells[1].textContent,
            row.cells[2].textContent,
            row.cells[3].textContent,
            row.cells[4].textContent
        ].join(" ").toLowerCase();

        const status = getStatus(row).toLowerCase();

        const matchesSearch = searchableText.includes(query);
        const matchesStatus = !selectedStatus || status === selectedStatus;

        row.style.display = matchesSearch && matchesStatus ? "" : "none";
    });

    updateBookingSummary();
}

function openBookingForm() {
    editingBookingRow = null;
    bookingForm.reset();
    bookingFormTitle.textContent = "Add New Booking";
    bookingFormPanel.hidden = false;
    bookingFormPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function closeBookingForm() {
    bookingFormPanel.hidden = true;
    bookingForm.reset();
    editingBookingRow = null;
    bookingFormTitle.textContent = "Add New Booking";
}

function populateForm(row) {
    fields.id.value = row.cells[0].textContent.trim();
    fields.customer.value = row.cells[1].textContent.trim();
    fields.vehicle.value = row.cells[2].textContent.trim();
    fields.pickupBranch.value = row.cells[3].textContent.trim();
    fields.returnBranch.value = row.cells[4].textContent.trim();
    fields.pickupDate.value = row.cells[5].textContent.trim();
    fields.returnDate.value = row.cells[6].textContent.trim();
    fields.amount.value = row.cells[7].textContent.replace(/[₹,]/g, "").trim();
    fields.status.value = getStatus(row);
}

function renderBookingRow(row, booking) {
    const values = [
        booking.id,
        booking.customer,
        booking.vehicle,
        booking.pickupBranch,
        booking.returnBranch,
        booking.pickupDate,
        booking.returnDate,
        `₹${booking.amount.toLocaleString("en-IN")}`
    ];

    values.forEach((value, index) => {
        row.cells[index].textContent = value;
    });

    const badge = document.createElement("span");
    badge.className = `status ${getStatusClass(booking.status)}`;
    badge.textContent = booking.status;
    row.cells[8].replaceChildren(badge);
}

document.getElementById("openBookingForm")
    .addEventListener("click", openBookingForm);

document.getElementById("closeBookingForm")
    .addEventListener("click", closeBookingForm);

document.getElementById("cancelBookingForm")
    .addEventListener("click", closeBookingForm);

bookingSearch.addEventListener("input", filterBookings);
bookingStatusFilter.addEventListener("change", filterBookings);

bookingTableBody.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const row = button.closest("tr");
    if (!row) return;

    if (button.dataset.action === "edit") {
        editingBookingRow = row;
        populateForm(row);
        bookingFormTitle.textContent = "Edit Booking";
        bookingFormPanel.hidden = false;
        bookingFormPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    if (button.dataset.action === "cancel") {
        const id = row.cells[0].textContent.trim();
        const status = getStatus(row);

        if (status === "Completed") {
            alert("A completed booking cannot be cancelled.");
            return;
        }

        if (status === "Cancelled") {
            alert("This booking is already cancelled.");
            return;
        }

        if (!confirm(`Cancel booking ${id}?`)) return;

        const badge = document.createElement("span");
        badge.className = "status cancelled";
        badge.textContent = "Cancelled";
        row.cells[8].replaceChildren(badge);

        filterBookings();
    }
});

bookingForm.addEventListener("submit", event => {
    event.preventDefault();

    const booking = {
        id: fields.id.value.trim().toUpperCase(),
        customer: fields.customer.value.trim(),
        vehicle: fields.vehicle.value.trim(),
        pickupBranch: fields.pickupBranch.value,
        returnBranch: fields.returnBranch.value,
        pickupDate: fields.pickupDate.value,
        returnDate: fields.returnDate.value,
        amount: Number(fields.amount.value),
        status: fields.status.value
    };

    if (booking.returnDate < booking.pickupDate) {
        alert("Return date cannot be earlier than pickup date.");
        return;
    }

    if (!Number.isFinite(booking.amount) || booking.amount <= 0) {
        alert("Enter a valid amount greater than zero.");
        return;
    }

    const duplicate = [...bookingTableBody.querySelectorAll("tr")].some(row =>
        row !== editingBookingRow &&
        row.cells[0].textContent.trim().toUpperCase() === booking.id
    );

    if (duplicate) {
        alert("This booking ID already exists.");
        return;
    }

    let row = editingBookingRow;

    if (!row) {
        row = document.createElement("tr");

        for (let i = 0; i < 10; i++) {
            row.appendChild(document.createElement("td"));
        }

        bookingTableBody.appendChild(row);
    }

    renderBookingRow(row, booking);
    setupActionButtons();
    closeBookingForm();
    filterBookings();

    alert("Booking saved successfully in this demo.");
});

// Initialize statuses and actions before enabling filtering.
initializeBookings();
filterBookings();
