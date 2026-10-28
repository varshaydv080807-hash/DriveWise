
const bookingTableBody = document.getElementById("bookingTableBody");
const bookingSearch = document.getElementById("bookingSearch");
const bookingStatusFilter = document.getElementById("bookingStatusFilter");
const bookingFormPanel = document.getElementById("bookingFormPanel");
const bookingForm = document.getElementById("bookingForm");
const bookingFormTitle = document.getElementById("bookingFormTitle");
const openBookingFormButton = document.getElementById("openBookingForm");
const closeBookingFormButton = document.getElementById("closeBookingForm");
const cancelBookingFormButton = document.getElementById("cancelBookingForm");

const BOOKING_STORAGE_KEY = "driveWiseBookings";
let editingBookingRow = null;

function bookingStatusClass(status) {
    return {
        Pending: "pending",
        Confirmed: "confirmed",
        Ongoing: "confirmed",
        Completed: "completed",
        Cancelled: "cancelled"
    }[status] || "pending";
}

function getRowBooking(row) {
    return {
        id: row.cells[0].textContent.trim(),
        customer: row.cells[1].textContent.trim(),
        vehicle: row.cells[2].textContent.trim(),
        pickupDate: row.cells[3].textContent.trim(),
        returnDate: row.cells[4].textContent.trim(),
        amount: Number(
            row.cells[5].textContent.replace(/[^0-9.]/g, "")
        ) || 0,
        status: row.cells[6].textContent.trim()
    };
}

function getAllBookings() {
    return Array.from(bookingTableBody.querySelectorAll("tr"))
        .map(getRowBooking);
}

function saveBookings() {
    try {
        localStorage.setItem(
            BOOKING_STORAGE_KEY,
            JSON.stringify(getAllBookings())
        );
        return true;
    } catch (error) {
        console.error("Could not save DriveWise bookings:", error);
        alert("Bookings could not be saved in this browser.");
        return false;
    }
}

function renderBookingRows(bookings) {
    bookingTableBody.replaceChildren();

    bookings.forEach(booking => {
        const row = document.createElement("tr");

        const values = [
            booking.id,
            booking.customer,
            booking.vehicle,
            booking.pickupDate,
            booking.returnDate,
            `₹${Number(booking.amount).toLocaleString("en-IN")}`
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");

        badge.className = `status ${bookingStatusClass(booking.status)}`;
        badge.textContent = booking.status;

        statusCell.appendChild(badge);
        row.appendChild(statusCell);
        row.appendChild(document.createElement("td"));

        bookingTableBody.appendChild(row);
    });
}

function updateBookingSummary() {
    const rows = Array.from(bookingTableBody.querySelectorAll("tr"));

    document.getElementById("totalBookings").textContent = rows.length;

    const counts = {
        Pending: 0,
        Confirmed: 0,
        Completed: 0
    };

    rows.forEach(row => {
        const status = row.cells[6].textContent.trim();

        if (Object.hasOwn(counts, status)) {
            counts[status]++;
        }
    });

    document.getElementById("pendingBookings").textContent =
        counts.Pending;

    document.getElementById("confirmedBookings").textContent =
        counts.Confirmed;

    document.getElementById("completedBookings").textContent =
        counts.Completed;
}

function setupBookingButtons() {
    bookingTableBody.querySelectorAll("tr").forEach(row => {
        const actionsCell = row.cells[7];
        actionsCell.replaceChildren();

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

        cancelButton.disabled =
            row.cells[6].textContent.trim() === "Cancelled";

        actionsCell.append(editButton, cancelButton);
    });
}

function filterBookings() {
    const searchText = bookingSearch.value.toLowerCase().trim();
    const selectedStatus = bookingStatusFilter.value.toLowerCase();

    bookingTableBody.querySelectorAll("tr").forEach(row => {
        const searchableText = [
            row.cells[0],
            row.cells[1],
            row.cells[2]
        ].map(cell => cell.textContent).join(" ").toLowerCase();

        const status = row.cells[6].textContent.trim().toLowerCase();

        row.style.display =
            searchableText.includes(searchText) &&
            (!selectedStatus || status === selectedStatus)
                ? ""
                : "none";
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

openBookingFormButton.addEventListener("click", openBookingForm);
closeBookingFormButton.addEventListener("click", closeBookingForm);
cancelBookingFormButton.addEventListener("click", closeBookingForm);

bookingSearch.addEventListener("input", filterBookings);
bookingStatusFilter.addEventListener("change", filterBookings);

bookingTableBody.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const row = button.closest("tr");
    if (!row) return;

    if (button.dataset.action === "edit") {
        editingBookingRow = row;

        document.getElementById("bookingId").value =
            row.cells[0].textContent.trim();

        document.getElementById("bookingCustomer").value =
            row.cells[1].textContent.trim();

        document.getElementById("bookingVehicle").value =
            row.cells[2].textContent.trim();

        document.getElementById("pickupDate").value =
            row.cells[3].textContent.trim();

        document.getElementById("returnDate").value =
            row.cells[4].textContent.trim();

        document.getElementById("bookingAmount").value =
            row.cells[5].textContent.replace(/[^0-9.]/g, "");

        document.getElementById("bookingStatus").value =
            row.cells[6].textContent.trim();

        bookingFormTitle.textContent = "Edit Booking";
        bookingFormPanel.hidden = false;

        bookingFormPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    if (button.dataset.action === "cancel") {
        const bookingId = row.cells[0].textContent.trim();

        if (row.cells[6].textContent.trim() === "Completed") {
            alert("A completed booking cannot be cancelled.");
            return;
        }

        if (!confirm(`Cancel booking ${bookingId}?`)) return;

        const badge = document.createElement("span");

        badge.className = "status cancelled";
        badge.textContent = "Cancelled";

        row.cells[6].replaceChildren(badge);

        if (!saveBookings()) return;

        setupBookingButtons();
        filterBookings();
    }
});

bookingForm.addEventListener("submit", event => {
    event.preventDefault();

    const id = document.getElementById("bookingId")
        .value.trim().toUpperCase();

    const customer = document.getElementById("bookingCustomer")
        .value.trim();

    const vehicle = document.getElementById("bookingVehicle")
        .value.trim();

    const pickupDate = document.getElementById("pickupDate").value;
    const returnDate = document.getElementById("returnDate").value;

    const amount = Number(
        document.getElementById("bookingAmount").value
    );

    const status = document.getElementById("bookingStatus").value;

    if (returnDate < pickupDate) {
        alert("Return date cannot be earlier than pickup date.");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Enter a valid booking amount.");
        return;
    }

    const duplicate = Array.from(bookingTableBody.rows).some(row =>
        row !== editingBookingRow &&
        row.cells[0].textContent.trim().toUpperCase() === id
    );

    if (duplicate) {
        alert("This booking ID already exists.");
        return;
    }

    let row = editingBookingRow;

    if (!row) {
        row = document.createElement("tr");

        for (let i = 0; i < 8; i++) {
            row.appendChild(document.createElement("td"));
        }

        bookingTableBody.appendChild(row);
    }

    [
        id,
        customer,
        vehicle,
        pickupDate,
        returnDate,
        `₹${amount.toLocaleString("en-IN")}`
    ].forEach((value, index) => {
        row.cells[index].textContent = value;
    });

    const badge = document.createElement("span");

    badge.className = `status ${bookingStatusClass(status)}`;
    badge.textContent = status;

    row.cells[6].replaceChildren(badge);

    if (!saveBookings()) return;

    setupBookingButtons();
    closeBookingForm();
    filterBookings();

    alert("Booking saved successfully!");
});

// Restore saved bookings on page load.
try {
    const saved = localStorage.getItem(BOOKING_STORAGE_KEY);

    if (saved !== null) {
        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            throw new Error("Invalid saved booking data.");
        }

        renderBookingRows(parsed);
    } else {
        // Save the sample bookings already present in the HTML.
        saveBookings();
    }
} catch (error) {
    console.error("Could not load saved bookings:", error);

    alert(
        "Saved bookings could not be loaded. " +
        "The page will use its initial sample data."
    );
}

setupBookingButtons();
filterBookings();
