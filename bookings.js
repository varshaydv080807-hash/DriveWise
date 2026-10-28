const bookingTableBody = document.getElementById("bookingTableBody");
const bookingSearch = document.getElementById("bookingSearch");
const bookingStatusFilter = document.getElementById("bookingStatusFilter");

const bookingFormPanel = document.getElementById("bookingFormPanel");
const bookingForm = document.getElementById("bookingForm");
const bookingFormTitle = document.getElementById("bookingFormTitle");

const openBookingFormButton = document.getElementById("openBookingForm");
const closeBookingFormButton = document.getElementById("closeBookingForm");
const cancelBookingFormButton = document.getElementById("cancelBookingForm");

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

// Map each booking status to an existing stylesheet class.
function bookingStatusClass(status) {
    const classes = {
        Pending: "pending",
        Confirmed: "confirmed",
        Ongoing: "confirmed",
        Completed: "completed",
        Cancelled: "cancelled"
    };

    return classes[status] || "pending";
}

// Update the booking summary cards.
function updateBookingSummary() {
    const rows = Array.from(bookingTableBody.querySelectorAll("tr"));

    document.getElementById("totalBookings").textContent = rows.length;

    const counts = {
        Pending: 0,
        Confirmed: 0,
        Completed: 0
    };

    rows.forEach(function (row) {
        const status = row.cells[8].textContent.trim();

        if (Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status]++;
        }
    });

    document.getElementById("pendingBookings").textContent = counts.Pending;
    document.getElementById("confirmedBookings").textContent = counts.Confirmed;
    document.getElementById("completedBookings").textContent = counts.Completed;
}

// Search bookings and apply the selected status filter.
function filterBookings() {
    const searchText = bookingSearch.value.toLowerCase().trim();
    const selectedStatus = bookingStatusFilter.value.toLowerCase();

    bookingTableBody.querySelectorAll("tr").forEach(function (row) {
        const searchableText = [
            row.cells[0].textContent,
            row.cells[1].textContent,
            row.cells[2].textContent,
            row.cells[3].textContent,
            row.cells[4].textContent
        ].join(" ").toLowerCase();

        const status = row.cells[8].textContent.trim().toLowerCase();

        const matchesSearch = searchableText.includes(searchText);
        const matchesStatus =
            selectedStatus === "" || status === selectedStatus;

        row.style.display =
            matchesSearch && matchesStatus ? "" : "none";
    });

    updateBookingSummary();
}

// Add Edit and Cancel buttons to each booking row.
function setupBookingButtons() {
    bookingTableBody.querySelectorAll("tr").forEach(function (row) {
        const actionsCell = row.cells[9];
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

// Open the form to create a new booking.
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

// Close and reset the form.
function closeBookingForm() {
    bookingFormPanel.hidden = true;
    bookingForm.reset();

    editingBookingRow = null;
    bookingFormTitle.textContent = "Add New Booking";
}

// Fill the form with the selected booking's current information.
function setFormFromRow(row) {
    fields.id.value = row.cells[0].textContent.trim();
    fields.customer.value = row.cells[1].textContent.trim();
    fields.vehicle.value = row.cells[2].textContent.trim();
    fields.pickupBranch.value = row.cells[3].textContent.trim();
    fields.returnBranch.value = row.cells[4].textContent.trim();
    fields.pickupDate.value = row.cells[5].textContent.trim();
    fields.returnDate.value = row.cells[6].textContent.trim();

    fields.amount.value = row.cells[7].textContent
        .replace(/[₹,]/g, "")
        .trim();

    fields.status.value = row.cells[8].textContent.trim();
}

// Display the updated information in a table row.
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

    values.forEach(function (value, index) {
        row.cells[index].textContent = value;
    });

    const badge = document.createElement("span");
    badge.className = `status ${bookingStatusClass(booking.status)}`;
    badge.textContent = booking.status;

    row.cells[8].replaceChildren(badge);
}

// Connect the form controls.
openBookingFormButton.addEventListener("click", openBookingForm);
closeBookingFormButton.addEventListener("click", closeBookingForm);
cancelBookingFormButton.addEventListener("click", closeBookingForm);

bookingSearch.addEventListener("input", filterBookings);
bookingStatusFilter.addEventListener("change", filterBookings);

// Handle Edit and Cancel actions.
bookingTableBody.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const row = button.closest("tr");

    if (!row) return;

    if (button.dataset.action === "edit") {
        editingBookingRow = row;

        setFormFromRow(row);
        bookingFormTitle.textContent = "Edit Booking";
        bookingFormPanel.hidden = false;

        bookingFormPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    if (button.dataset.action === "cancel") {
        const bookingId = row.cells[0].textContent.trim();
        const currentStatus = row.cells[8].textContent.trim();

        if (currentStatus === "Completed") {
            alert("A completed booking cannot be cancelled.");
            return;
        }

        if (currentStatus === "Cancelled") {
            alert("This booking is already cancelled.");
            return;
        }

        const confirmed = confirm(`Cancel booking ${bookingId}?`);

        if (!confirmed) return;

        const badge = document.createElement("span");
        badge.className = "status cancelled";
        badge.textContent = "Cancelled";

        row.cells[8].replaceChildren(badge);

        setupBookingButtons();
        filterBookings();
    }
});

// Validate and save a new or edited booking.
bookingForm.addEventListener("submit", function (event) {
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

    // Validate rental dates.
    if (booking.returnDate < booking.pickupDate) {
        alert("Return date cannot be earlier than pickup date.");
        return;
    }

    // Validate the amount.
    if (!Number.isFinite(booking.amount) || booking.amount <= 0) {
        alert("Enter a valid booking amount greater than zero.");
        return;
    }

    // Prevent duplicate booking IDs.
    for (const row of bookingTableBody.querySelectorAll("tr")) {
        const existingId = row.cells[0].textContent.trim().toUpperCase();

        if (row !== editingBookingRow && existingId === booking.id) {
            alert("This booking ID already exists.");
            return;
        }
    }

    let row = editingBookingRow;

    // Create a new table row if this is a new booking.
    if (!row) {
        row = document.createElement("tr");

        for (let i = 0; i < 10; i++) {
            row.appendChild(document.createElement("td"));
        }

        bookingTableBody.appendChild(row);
    }

    renderBookingRow(row, booking);

    setupBookingButtons();
    closeBookingForm();
    filterBookings();

    alert("Booking saved successfully in this demo.");
});

// Initialize the page.
setupBookingButtons();
filterBookings();
