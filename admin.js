
/*
 * DriveWise Vehicle Management
 * Frontend demonstration only.
 * Records are not yet connected to a database.
 * Existing style.css and colour palette remain unchanged.
 */

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

// Sample provider records.
// Later, these will come from the PROVIDER table.
const providerNames = {
    PROV1001: "DriveWise Fleet",
    PROV1002: "Rider Rentals",
    PROV1003: "City Mobility"
};

// Sample branch records.
// Later, these will come from the BRANCH table.
const branchNames = {
    BR001: "Dwarka",
    BR002: "Gurugram",
    BR003: "Rohini"
};

function getStatusClass(status) {
    if (status === "Available") {
        return "available-status";
    }

    if (status === "Booked") {
        return "booked-status";
    }

    return "maintenance-status";
}

function setStatusBadge(row, status) {
    const badge = document.createElement("span");

    badge.className = `status ${getStatusClass(status)}`;
    badge.textContent = status;

    row.cells[7].replaceChildren(badge);
}

// Create Edit and Delete buttons for every vehicle.
function setupActionButtons() {
    tableBody.querySelectorAll("tr").forEach(row => {
        const actionCell = row.cells[8];

        if (!actionCell) return;

        actionCell.replaceChildren();

        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.className = "action-btn";
        editButton.dataset.action = "edit";
        editButton.textContent = "Edit";

        editButton.setAttribute(
            "aria-label",
            `Edit ${row.cells[0].textContent.trim()}`
        );

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "action-btn delete-btn";
        deleteButton.dataset.action = "delete";
        deleteButton.textContent = "Delete";

        deleteButton.setAttribute(
            "aria-label",
            `Delete ${row.cells[0].textContent.trim()}`
        );

        actionCell.append(editButton, deleteButton);
    });
}

// Search by vehicle, registration number, provider or branch.
// Category and status filters work together with search.
function filterVehicles() {
    const searchText = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value.toLowerCase();
    const selectedStatus = statusFilter.value.toLowerCase();

    tableBody.querySelectorAll("tr").forEach(row => {
        const searchableText = [
            row.cells[0],
            row.cells[1],
            row.cells[3],
            row.cells[4]
        ]
            .map(cell => cell.textContent.toLowerCase())
            .join(" ");

        const category = row.cells[2].textContent
            .trim()
            .toLowerCase();

        const status = row.cells[7].textContent
            .trim()
            .toLowerCase();

        const matchesSearch = searchableText.includes(searchText);

        const matchesCategory =
            !selectedCategory || category === selectedCategory;

        const matchesStatus =
            !selectedStatus || status === selectedStatus;

        row.style.display =
            matchesSearch && matchesCategory && matchesStatus
                ? ""
                : "none";
    });

    updateSummary();
}

// Calculate fleet totals from all records, not just filtered rows.
function updateSummary() {
    const rows = Array.from(tableBody.querySelectorAll("tr"));

    const counts = {
        Available: 0,
        Booked: 0,
        Maintenance: 0
    };

    rows.forEach(row => {
        const status = row.cells[7].textContent.trim();

        if (Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status]++;
        }
    });

    document.querySelectorAll(".stat-card").forEach(card => {
        const label = card.querySelector("p")?.textContent.trim();
        const number = card.querySelector("h3");

        if (!number) return;

        if (label === "Total Vehicles") {
            number.textContent = rows.length;
        } else if (label === "Available") {
            number.textContent = counts.Available;
        } else if (label === "Booked") {
            number.textContent = counts.Booked;
        } else if (label === "Maintenance") {
            number.textContent = counts.Maintenance;
        }
    });
}

// Open a blank form for a new vehicle.
function openVehicleForm() {
    editingRow = null;

    vehicleForm.reset();
    formTitle.textContent = "Add New Vehicle";

    formPanel.hidden = false;

    formPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    document.getElementById("vehicleName").focus();
}

// Close the form and clear its fields.
function closeVehicleForm() {
    formPanel.hidden = true;

    vehicleForm.reset();
    editingRow = null;

    formTitle.textContent = "Add New Vehicle";
}

// Populate the form with the selected vehicle's details.
function fillFormFromRow(row) {
    const fieldValues = {
        vehicleName: row.cells[0].textContent.trim(),
        registration: row.cells[1].textContent.trim(),
        vehicleCategory: row.cells[2].textContent.trim(),
        vehicleProvider: row.dataset.providerId || "",
        vehicleBranch: row.dataset.branchId || "",
        vehiclePrice:
            row.dataset.hourlyPrice ||
            row.cells[5].textContent.replace(/[₹,]/g, "").trim(),
        fuelType: row.cells[6].textContent.trim(),
        vehicleStatus: row.cells[7].textContent.trim(),
        vehicleBrand: row.dataset.brand || "",
        vehicleModel: row.dataset.model || "",
        vehicleYear: row.dataset.year || "",
        vehicleSeats: row.dataset.seats || "",
        vehicleDailyPrice: row.dataset.dailyPrice || "",
        vehicleVerification: row.dataset.verification || "Pending",
        gpsEnabled: row.dataset.gps || "No"
    };

    Object.entries(fieldValues).forEach(([id, value]) => {
        document.getElementById(id).value = value;
    });
}

// Connect buttons and filters.
openFormButton.addEventListener("click", openVehicleForm);
closeFormButton.addEventListener("click", closeVehicleForm);
cancelFormButton.addEventListener("click", closeVehicleForm);

searchInput.addEventListener("input", filterVehicles);
categoryFilter.addEventListener("change", filterVehicles);
statusFilter.addEventListener("change", filterVehicles);

// Handle Edit and Delete using event delegation.
tableBody.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const row = button.closest("tr");

    if (!row) return;

    if (button.dataset.action === "edit") {
        editingRow = row;

        fillFormFromRow(row);

        formTitle.textContent = "Edit Vehicle";
        formPanel.hidden = false;

        formPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        document.getElementById("vehicleName").focus();
    }

    if (button.dataset.action === "delete") {
        const name = row.cells[0].textContent.trim();
        const registration = row.cells[1].textContent.trim();

        const confirmed = confirm(
            `Delete ${name} (${registration})?`
        );

        if (!confirmed) return;

        if (editingRow === row) {
            closeVehicleForm();
        }

        row.remove();

        filterVehicles();
    }
});

// Validate and save a vehicle.
vehicleForm.addEventListener("submit", event => {
    event.preventDefault();

    const value = id =>
        document.getElementById(id).value.trim();

    const name = value("vehicleName");
    const registration = value("registration").toUpperCase();

    const brand = value("vehicleBrand");
    const model = value("vehicleModel");

    const year = Number(value("vehicleYear"));
    const category = value("vehicleCategory");
    const seats = Number(value("vehicleSeats"));

    const hourlyPrice = Number(value("vehiclePrice"));

    const dailyPriceText = value("vehicleDailyPrice");
    const dailyPrice =
        dailyPriceText === "" ? "" : Number(dailyPriceText);

    const fuel = value("fuelType");
    const providerId = value("vehicleProvider");
    const branchId = value("vehicleBranch");

    const status = value("vehicleStatus");
    const verification = value("vehicleVerification");
    const gps = value("gpsEnabled");

    const currentYear = new Date().getFullYear();

    // Required-field validation.
    if (
        !name ||
        !registration ||
        !brand ||
        !model ||
        !category ||
        !fuel ||
        !providerId ||
        !branchId ||
        !status ||
        !verification ||
        !gps
    ) {
        alert("Please complete all required fields.");
        return;
    }

    // Manufacture-year validation.
    if (
        !Number.isInteger(year) ||
        year < 1990 ||
        year > currentYear + 1
    ) {
        alert(
            `Enter a valid manufacture year between 1990 and ${currentYear + 1}.`
        );
        return;
    }

    // Seating-capacity validation.
    if (
        !Number.isInteger(seats) ||
        seats < 1 ||
        seats > 100
    ) {
        alert("Enter a valid seating capacity between 1 and 100.");
        return;
    }

    // Hourly-price validation.
    if (
        !Number.isFinite(hourlyPrice) ||
        hourlyPrice <= 0
    ) {
        alert("Enter a valid price per hour greater than zero.");
        return;
    }

    // Optional daily-price validation.
    if (
        dailyPrice !== "" &&
        (!Number.isFinite(dailyPrice) || dailyPrice < 0)
    ) {
        alert(
            "Daily price must be zero or greater, or left blank."
        );
        return;
    }

    // Prevent duplicate registration numbers in the current page.
    for (const row of tableBody.querySelectorAll("tr")) {
        const existingRegistration =
            row.cells[1].textContent.trim().toUpperCase();

        if (
            row !== editingRow &&
            existingRegistration === registration
        ) {
            alert(
                "A vehicle with this registration number already exists."
            );
            return;
        }
    }

    const wasEditing = Boolean(editingRow);

    let row = editingRow;

    // Create a new row if this is an Add operation.
    if (!row) {
        row = document.createElement("tr");

        for (let i = 0; i < 9; i++) {
            row.appendChild(document.createElement("td"));
        }

        tableBody.appendChild(row);
    }

    // Update visible table cells.
    row.cells[0].textContent = name;
    row.cells[1].textContent = registration;
    row.cells[2].textContent = category;

    row.cells[3].textContent =
        providerNames[providerId] || providerId;

    row.cells[4].textContent =
        branchNames[branchId] || branchId;

    row.cells[5].textContent =
        `₹${hourlyPrice.toLocaleString("en-IN")}`;

    row.cells[6].textContent = fuel;

    setStatusBadge(row, status);

    // Store additional attributes on the row for editing.
    // These are temporary frontend values, not database records.
    Object.assign(row.dataset, {
        brand,
        model,
        year: String(year),
        seats: String(seats),
        hourlyPrice: String(hourlyPrice),
        dailyPrice:
            dailyPrice === "" ? "" : String(dailyPrice),
        providerId,
        branchId,
        verification,
        gps
    });

    setupActionButtons();

    closeVehicleForm();
    filterVehicles();

    alert(
        wasEditing
            ? "Vehicle details updated successfully!"
            : "Vehicle added successfully!"
    );
});

// Initialize the page.
setupActionButtons();
filterVehicles();
