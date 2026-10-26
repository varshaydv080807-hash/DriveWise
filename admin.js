
const searchInput = document.getElementById("vehicleSearch");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");
const tableBody = document.getElementById("vehicleTableBody");

const openFormButton = document.getElementById("openVehicleForm");
const closeFormButton = document.getElementById("closeVehicleForm");
const cancelFormButton = document.getElementById("cancelVehicleForm");
const formPanel = document.getElementById("vehicleFormPanel");
const vehicleForm = document.getElementById("vehicleForm");
const formTitle = document.getElementById("vehicleFormTitle");

let editingRow = null;

// Convert a status into its corresponding CSS class.
function getStatusClass(status) {
    if (status === "Available") return "available-status";
    if (status === "Booked") return "booked-status";
    return "maintenance-status";
}

// Update the status badge in a table row.
function updateStatusBadge(row, status) {
    const badge = document.createElement("span");
    badge.classList.add("status", getStatusClass(status));
    badge.textContent = status;
    row.cells[5].replaceChildren(badge);
}

// Add Edit and Delete buttons to every row.
function setupActionButtons() {
    const rows = tableBody.querySelectorAll("tr");

    rows.forEach(function (row) {
        const actionCell = row.cells[6];

        if (!actionCell) return;

        actionCell.replaceChildren();

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "action-btn";
        editButton.dataset.action = "edit";
        editButton.textContent = "Edit";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "action-btn delete-btn";
        deleteButton.dataset.action = "delete";
        deleteButton.textContent = "Delete";

        actionCell.append(editButton, deleteButton);
    });
}

// Search and filter vehicles.
function filterVehicles() {
    const searchText = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value.toLowerCase();
    const selectedStatus = statusFilter.value.toLowerCase();

    const rows = tableBody.querySelectorAll("tr");
    let visibleCount = 0;

    rows.forEach(function (row) {
        const name = row.cells[0].textContent.toLowerCase();
        const registration = row.cells[1].textContent.toLowerCase();
        const category = row.cells[2].textContent.toLowerCase();
        const status = row.cells[5].textContent.trim().toLowerCase();

        const matchesSearch =
            name.includes(searchText) ||
            registration.includes(searchText);

        const matchesCategory =
            selectedCategory === "" ||
            category === selectedCategory;

        const matchesStatus =
            selectedStatus === "" ||
            status === selectedStatus;

        const isVisible =
            matchesSearch && matchesCategory && matchesStatus;

        row.style.display = isVisible ? "" : "none";

        if (isVisible) visibleCount++;
    });

    updateSummary();
}

searchInput.addEventListener("input", filterVehicles);
categoryFilter.addEventListener("change", filterVehicles);
statusFilter.addEventListener("change", filterVehicles);

// Update the summary cards using the complete vehicle list.
function updateSummary() {
    const rows = Array.from(tableBody.querySelectorAll("tr"));

    let available = 0;
    let booked = 0;
    let maintenance = 0;

    rows.forEach(function (row) {
        const status = row.cells[5].textContent.trim();

        if (status === "Available") available++;
        else if (status === "Booked") booked++;
        else if (status === "Maintenance") maintenance++;
    });

    const cards = document.querySelectorAll(".stat-card");

    cards.forEach(function (card) {
        const label = card.querySelector("p")?.textContent.trim();
        const number = card.querySelector("h3");

        if (!number) return;

        if (label === "Total Vehicles") {
            number.textContent = rows.length;
        } else if (label === "Available") {
            number.textContent = available;
        } else if (label === "Booked") {
            number.textContent = booked;
        } else if (label === "Maintenance") {
            number.textContent = maintenance;
        }
    });
}

// Open a blank form for adding a vehicle.
function openVehicleForm() {
    editingRow = null;
    vehicleForm.reset();
    formTitle.textContent = "Add New Vehicle";
    formPanel.hidden = false;

    formPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Close the form and clear its fields.
function closeVehicleForm() {
    formPanel.hidden = true;
    vehicleForm.reset();
    editingRow = null;
    formTitle.textContent = "Add New Vehicle";
}

openFormButton.addEventListener("click", openVehicleForm);
closeFormButton.addEventListener("click", closeVehicleForm);
cancelFormButton.addEventListener("click", closeVehicleForm);

// Handle Edit and Delete clicks for both old and new rows.
tableBody.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const row = button.closest("tr");

    if (!row) return;

    if (button.dataset.action === "edit") {
        editingRow = row;

        document.getElementById("vehicleName").value =
            row.cells[0].textContent.trim();

        document.getElementById("registration").value =
            row.cells[1].textContent.trim();

        document.getElementById("vehicleCategory").value =
            row.cells[2].textContent.trim();

        document.getElementById("vehiclePrice").value =
            row.cells[3].textContent.replace(/[₹,]/g, "").trim();

        document.getElementById("fuelType").value =
            row.cells[4].textContent.trim();

        document.getElementById("vehicleStatus").value =
            row.cells[5].textContent.trim();

        formTitle.textContent = "Edit Vehicle";
        formPanel.hidden = false;

        formPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    if (button.dataset.action === "delete") {
        const vehicleName = row.cells[0].textContent.trim();
        const registration = row.cells[1].textContent.trim();

        const confirmed = confirm(
            `Delete ${vehicleName} (${registration})?`
        );

        if (!confirmed) return;

        if (editingRow === row) {
            closeVehicleForm();
        }

        row.remove();
        filterVehicles();
    }
});

// Add a new vehicle or save edits to an existing vehicle.
vehicleForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("vehicleName").value.trim();
    const registration = document.getElementById("registration")
        .value.trim().toUpperCase();

    const category = document.getElementById("vehicleCategory").value;
    const price = Number(document.getElementById("vehiclePrice").value);
    const fuel = document.getElementById("fuelType").value;
    const status = document.getElementById("vehicleStatus").value;

    if (!name || !registration || !category || !fuel || !status) {
        alert("Please fill in all the fields.");
        return;
    }

    if (!Number.isFinite(price) || price <= 0) {
        alert("Please enter a valid daily rental price.");
        return;
    }

    // A registration number must be unique.
    const rows = tableBody.querySelectorAll("tr");

    for (const row of rows) {
        const existingRegistration =
            row.cells[1].textContent.trim().toUpperCase();

        if (row !== editingRow &&
            existingRegistration === registration) {
            alert("A vehicle with this registration number already exists.");
            return;
        }
    }

    let row = editingRow;

    // If we are adding, create a new row with seven cells.
    if (!row) {
        row = document.createElement("tr");

        for (let i = 0; i < 7; i++) {
            row.appendChild(document.createElement("td"));
        }

        tableBody.appendChild(row);
    }

    row.cells[0].textContent = name;
    row.cells[1].textContent = registration;
    row.cells[2].textContent = category;
    row.cells[3].textContent =
        `₹${price.toLocaleString("en-IN")}`;
    row.cells[4].textContent = fuel;

    updateStatusBadge(row, status);

    // Rebuild the action buttons consistently.
    setupActionButtons();

    closeVehicleForm();
    filterVehicles();

    alert(
        editingRow
            ? "Vehicle details updated successfully!"
            : "Vehicle added successfully!"
    );
});

// Initialize the page.
setupActionButtons();
filterVehicles();
