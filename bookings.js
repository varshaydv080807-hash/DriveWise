
const bookingTableBody = document.getElementById("bookingTableBody");
const bookingSearch = document.getElementById("bookingSearch");
const bookingStatusFilter = document.getElementById("bookingStatusFilter");

const bookingFormPanel = document.getElementById("bookingFormPanel");
const bookingForm = document.getElementById("bookingForm");
const bookingFormTitle = document.getElementById("bookingFormTitle");

const openBookingFormButton = document.getElementById("openBookingForm");
const closeBookingFormButton = document.getElementById("closeBookingForm");
const cancelBookingFormButton = document.getElementById("cancelBookingForm");

let editingBookingRow = null;

function bookingStatusClass(status) {
    const classes = {
        Pending: "pending",
        Confirmed: "confirmed",
        Completed: "completed",
        Cancelled: "cancelled"
    };

    return classes[status];
}

function updateBookingSummary() {
    const rows = Array.from(bookingTableBody.querySelectorAll("tr"));

    document.getElementById("totalBookings").textContent = rows.length;

    const counts = {
        Pending: 0,
        Confirmed: 0,
        Completed: 0
    };

    rows.forEach(function (row) {
        const status = row.cells[6].textContent.trim();

        if (Object.hasOwn(counts, status)) {
            counts[status]++;
        }
    });

    document.getElementById("pendingBookings").textContent = counts.Pending;
    document.getElementById("confirmedBookings").textContent = counts.Confirmed;
    document.getElementById("completedBookings").textContent = counts.Completed;
}

function filterBookings() {
    const searchText = bookingSearch.value.toLowerCase().trim();
    const selectedStatus = bookingStatusFilter.value.toLowerCase();

    bookingTableBody.querySelectorAll("tr").forEach(function (row) {
        const searchableText = [
            row.cells[0].textContent,
            row.cells[1].textContent,
            row.cells[2].textContent
        ].join(" ").toLowerCase();

        const status = row.cells[6].textContent.trim().toLowerCase();

        const matchesSearch = searchableText.includes(searchText);
        const matchesStatus =
            selectedStatus === "" || status === selectedStatus;

        row.style.display =
            matchesSearch && matchesStatus ? "" : "none";
    });

    updateBookingSummary();
}

function setupBookingButtons() {
    bookingTableBody.querySelectorAll("tr").forEach(function (row) {
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

        actionsCell.append(editButton, cancelButton);
    });
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

bookingTableBody.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const row = button.closest("tr");
    if (!row) return;

    if (button.dataset.action === "edit") {
        editingBookingRow = row;

        document.getElementById("bookingId").value = row.cells[0].textContent.trim();
        document.getElementById("bookingCustomer").value = row.cells[1].textContent.trim();
        document.getElementById("bookingVehicle").value = row.cells[2].textContent.trim();
        document.getElementById("pickupDate").value = row.cells[3].textContent.trim();
        document.getElementById("returnDate").value = row.cells[4].textContent.trim();
        document.getElementById("bookingAmount").value =
            row.cells[5].textContent.replace(/[₹,]/g, "").trim();
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

        if (!confirm(`Cancel booking ${bookingId}?`)) return;

        row.cells[6].replaceChildren();

        const badge = document.createElement("span");
        badge.className = "status cancelled";
        badge.textContent = "Cancelled";
        row.cells[6].appendChild(badge);

        setupBookingButtons();
        filterBookings();
    }
});

bookingForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const id = document.getElementById("bookingId").value.trim().toUpperCase();
    const customer = document.getElementById("bookingCustomer").value.trim();
    const vehicle = document.getElementById("bookingVehicle").value.trim();
    const pickup = document.getElementById("pickupDate").value;
    const returnDate = document.getElementById("returnDate").value;
    const amount = Number(document.getElementById("bookingAmount").value);
    const status = document.getElementById("bookingStatus").value;

    if (returnDate < pickup) {
        alert("Return date cannot be earlier than pickup date.");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Enter a valid booking amount.");
        return;
    }

    const rows = bookingTableBody.querySelectorAll("tr");

    for (const row of rows) {
        const existingId = row.cells[0].textContent.trim().toUpperCase();

        if (row !== editingBookingRow && existingId === id) {
            alert("This booking ID already exists.");
            return;
        }
    }

    let row = editingBookingRow;

    if (!row) {
        row = document.createElement("tr");

        for (let i = 0; i < 8; i++) {
            row.appendChild(document.createElement("td"));
        }

        bookingTableBody.appendChild(row);
    }

    const values = [
        id,
        customer,
        vehicle,
        pickup,
        returnDate,
        `₹${amount.toLocaleString("en-IN")}`
    ];

    values.forEach(function (value, index) {
        row.cells[index].textContent = value;
    });

    const badge = document.createElement("span");
    badge.className = `status ${bookingStatusClass(status)}`;
    badge.textContent = status;
    row.cells[6].replaceChildren(badge);

    setupBookingButtons();
    closeBookingForm();
    filterBookings();

    alert("Booking saved successfully!");
});

setupBookingButtons();
filterBookings();
