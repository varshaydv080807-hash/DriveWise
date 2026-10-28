
document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("customerTableBody");
    const searchInput = document.getElementById("customerSearch");
    const statusFilter = document.getElementById("customerStatusFilter");

    const formPanel = document.getElementById("customerFormPanel");
    const customerForm = document.getElementById("customerForm");

    const openFormBtn = document.getElementById("openCustomerForm");
    const closeFormBtn = document.getElementById("closeCustomerForm");
    const cancelFormBtn = document.getElementById("cancelCustomerForm");
    const formTitle = document.getElementById("customerFormTitle");

    const customerId = document.getElementById("customerId");
    const customerName = document.getElementById("customerName");
    const customerEmail = document.getElementById("customerEmail");
    const customerPhone = document.getElementById("customerPhone");
    const customerLicense = document.getElementById("customerLicense");
    const customerVerified = document.getElementById("customerVerified");
    const customerStatus = document.getElementById("customerStatus");

    const STORAGE_KEY = "driveWiseCustomers";

    // Initial demo records are used only when no saved records exist.
    const initialCustomers = [
        {
            id: "CUS1001",
            name: "Aarav Sharma",
            email: "aarav@example.com",
            phone: "9876543210",
            license: "HR0120260001",
            verified: "Yes",
            status: "Active"
        },
        {
            id: "CUS1002",
            name: "Priya Verma",
            email: "priya@example.com",
            phone: "9876543211",
            license: "DL0420260002",
            verified: "Yes",
            status: "Active"
        },
        {
            id: "CUS1003",
            name: "Rohan Mehta",
            email: "rohan@example.com",
            phone: "9876543212",
            license: "HR0620260003",
            verified: "No",
            status: "Active"
        },
        {
            id: "CUS1004",
            name: "Ananya Singh",
            email: "ananya@example.com",
            phone: "9876543213",
            license: "DL0820260004",
            verified: "Yes",
            status: "Inactive"
        },
        {
            id: "CUS1005",
            name: "Kabir Gupta",
            email: "kabir@example.com",
            phone: "9876543214",
            license: "HR1020260005",
            verified: "No",
            status: "Active"
        }
    ];

    let customers = [];
    let editingId = null;

    // Load previously saved records, or create the demo records.
    try {
        const savedCustomers = localStorage.getItem(STORAGE_KEY);

        if (savedCustomers !== null) {
            const parsedCustomers = JSON.parse(savedCustomers);

            if (!Array.isArray(parsedCustomers)) {
                throw new Error("Saved customer data is invalid.");
            }

            customers = parsedCustomers;
        } else {
            customers = initialCustomers.map(customer => ({ ...customer }));
            saveCustomers();
        }
    } catch (error) {
        console.error("Unable to load customer data:", error);
        alert("Customer data could not be loaded. Check browser storage.");
        return;
    }

    function saveCustomers() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
            return true;
        } catch (error) {
            console.error("Unable to save customer data:", error);
            alert("Changes could not be saved in this browser.");
            return false;
        }
    }

    function createStatusBadge(value, type) {
        const badge = document.createElement("span");
        badge.textContent = value;

        if (type === "status") {
            badge.className = value === "Active"
                ? "status customer-active"
                : "status customer-inactive";
        } else {
            badge.className = value === "Yes"
                ? "status customer-active"
                : "status customer-inactive";
        }

        return badge;
    }

    function createActionButton(label, className, handler) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.className = className;
        button.addEventListener("click", handler);
        return button;
    }

    function renderCustomers() {
        tableBody.replaceChildren();

        customers.forEach(customer => {
            const row = document.createElement("tr");

            // Use textContent instead of injecting user-entered HTML.
            const values = [
                customer.id,
                customer.name,
                customer.email,
                customer.phone,
                customer.license
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const verifiedCell = document.createElement("td");
            verifiedCell.appendChild(
                createStatusBadge(customer.verified, "verified")
            );
            row.appendChild(verifiedCell);

            const statusCell = document.createElement("td");
            statusCell.appendChild(
                createStatusBadge(customer.status, "status")
            );
            row.appendChild(statusCell);

            const actionCell = document.createElement("td");

            const editButton = createActionButton(
                "Edit",
                "action-btn",
                () => editCustomer(customer.id)
            );

            const deleteButton = createActionButton(
                "Delete",
                "action-btn delete-btn",
                () => deleteCustomer(customer.id)
            );

            actionCell.append(editButton, deleteButton);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });

        updateStatistics();
        filterCustomers();
    }

    function updateStatistics() {
        document.getElementById("totalCustomers").textContent =
            customers.length;

        document.getElementById("activeCustomers").textContent =
            customers.filter(c => c.status === "Active").length;

        document.getElementById("inactiveCustomers").textContent =
            customers.filter(c => c.status === "Inactive").length;

        document.getElementById("verifiedCustomers").textContent =
            customers.filter(c => c.verified === "Yes").length;
    }

    function filterCustomers() {
        const query = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;

        Array.from(tableBody.rows).forEach(row => {
            const matchesSearch =
                row.textContent.toLowerCase().includes(query);

            const matchesStatus =
                !selectedStatus ||
                row.cells[6].textContent.trim() === selectedStatus;

            row.hidden = !(matchesSearch && matchesStatus);
        });
    }

    function clearForm() {
        customerForm.reset();
        customerId.disabled = false;
        editingId = null;
        formTitle.textContent = "Add New Customer";
    }

    function openCustomerForm() {
        clearForm();
        formPanel.hidden = false;
        formPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
        customerName.focus();
    }

    function closeCustomerForm() {
        formPanel.hidden = true;
        clearForm();
    }

    function editCustomer(id) {
        const customer = customers.find(c => c.id === id);
        if (!customer) return;

        editingId = id;

        customerId.value = customer.id;
        customerName.value = customer.name;
        customerEmail.value = customer.email;
        customerPhone.value = customer.phone;
        customerLicense.value = customer.license;
        customerVerified.value = customer.verified;
        customerStatus.value = customer.status;

        // Customer IDs cannot be changed while editing.
        customerId.disabled = true;
        formTitle.textContent = "Edit Customer";

        formPanel.hidden = false;
        formPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        customerName.focus();
    }

    function deleteCustomer(id) {
        const customer = customers.find(c => c.id === id);
        if (!customer) return;

        const confirmed = confirm(
            `Are you sure you want to delete ${customer.name}?`
        );

        if (!confirmed) return;

        const previousCustomers = customers;
        customers = customers.filter(c => c.id !== id);

        if (!saveCustomers()) {
            customers = previousCustomers;
            return;
        }

        renderCustomers();
    }

    function hasDuplicate(id, email, license) {
        return customers.some(customer => {
            if (editingId && customer.id === editingId) {
                return false;
            }

            return (
                customer.id.toLowerCase() === id.toLowerCase() ||
                customer.email.toLowerCase() === email.toLowerCase() ||
                customer.license.toLowerCase() === license.toLowerCase()
            );
        });
    }

    function saveCustomer(event) {
        event.preventDefault();

        const customer = {
            id: customerId.value.trim(),
            name: customerName.value.trim(),
            email: customerEmail.value.trim(),
            phone: customerPhone.value.trim(),
            license: customerLicense.value.trim(),
            verified: customerVerified.value,
            status: customerStatus.value
        };

        if (
            !customer.id ||
            !customer.name ||
            !customer.email ||
            !customer.phone ||
            !customer.license
        ) {
            alert("Please fill in all customer fields.");
            return;
        }

        if (!/^[0-9]{10}$/.test(customer.phone)) {
            alert("Please enter a valid 10-digit phone number.");
            return;
        }

        if (
            hasDuplicate(
                customer.id,
                customer.email,
                customer.license
            )
        ) {
            alert(
                "Customer ID, email or licence number already exists."
            );
            return;
        }

        const previousCustomers = customers.map(c => ({ ...c }));

        if (editingId) {
            const index = customers.findIndex(c => c.id === editingId);

            if (index === -1) {
                alert("Customer not found. Please refresh the page.");
                return;
            }

            customer.id = editingId;
            customers[index] = customer;
        } else {
            customers.push(customer);
        }

        if (!saveCustomers()) {
            customers = previousCustomers;
            return;
        }

        closeCustomerForm();
        renderCustomers();
    }

    openFormBtn.addEventListener("click", openCustomerForm);
    closeFormBtn.addEventListener("click", closeCustomerForm);
    cancelFormBtn.addEventListener("click", closeCustomerForm);

    customerForm.addEventListener("submit", saveCustomer);
    searchInput.addEventListener("input", filterCustomers);
    statusFilter.addEventListener("change", filterCustomers);

    renderCustomers();
});
