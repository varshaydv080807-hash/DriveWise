
document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById("customerTableBody");
    const searchInput = document.getElementById("customerSearch");
    const statusFilter = document.getElementById("customerStatusFilter");
    const formPanel = document.getElementById("customerFormPanel");
    const customerForm = document.getElementById("customerForm");

    const openFormBtn = document.getElementById("openCustomerForm");
    const closeFormBtn = document.getElementById("closeCustomerForm");

    const customerId = document.getElementById("customerId");
    const customerName = document.getElementById("customerName");
    const customerEmail = document.getElementById("customerEmail");
    const customerPhone = document.getElementById("customerPhone");
    const customerLicense = document.getElementById("customerLicense");
    const customerVerified = document.getElementById("customerVerified");
    const customerStatus = document.getElementById("customerStatus");

    const formTitle = document.getElementById("customerFormTitle");

    // Stop early if the HTML and JavaScript IDs do not match.
    const requiredElements = [
        tableBody, searchInput, statusFilter, formPanel, customerForm,
        openFormBtn, closeFormBtn, customerId, customerName,
        customerEmail, customerPhone, customerLicense,
        customerVerified, customerStatus
    ];

    if (requiredElements.some(element => !element)) {
        console.error(
            "Customer page setup error: one or more HTML IDs are missing. " +
            "Check admin-customers.html against customers.js."
        );
        alert("Customer page setup error. Please check the browser console (F12).");
        return;
    }

    let editingRow = null;

    function getCellText(row, index) {
        return row.cells[index]?.textContent.trim() || "";
    }

    function getStatus(row) {
        return getCellText(row, 6);
    }

    function getVerified(row) {
        return getCellText(row, 5);
    }

    function createStatusBadge(status) {
        const badge = document.createElement("span");
        badge.textContent = status;
        badge.className =
            status.toLowerCase() === "active"
                ? "status customer-active"
                : "status customer-inactive";
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

    function attachRowButtons(row) {
        const actionCell = row.cells[7];
        if (!actionCell) return;

        actionCell.replaceChildren();

        const editButton = createActionButton(
            "Edit", "action-btn", () => editCustomer(row)
        );

        const deleteButton = createActionButton(
            "Delete", "action-btn delete-btn", () => deleteCustomer(row)
        );

        actionCell.append(editButton, deleteButton);
    }

    function refreshSummary() {
        const rows = Array.from(tableBody.rows);

        document.getElementById("totalCustomers").textContent = rows.length;
        document.getElementById("activeCustomers").textContent =
            rows.filter(row => getStatus(row).toLowerCase() === "active").length;
        document.getElementById("inactiveCustomers").textContent =
            rows.filter(row => getStatus(row).toLowerCase() === "inactive").length;
        document.getElementById("verifiedCustomers").textContent =
            rows.filter(row => getVerified(row).toLowerCase() === "verified").length;
    }

    function filterCustomers() {
        const query = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value.toLowerCase();

        Array.from(tableBody.rows).forEach(row => {
            const rowText = row.textContent.toLowerCase();
            const matchesSearch = rowText.includes(query);
            const matchesStatus =
                selectedStatus === "" ||
                getStatus(row).toLowerCase() === selectedStatus;

            row.hidden = !(matchesSearch && matchesStatus);
        });
    }

    function clearForm() {
        customerForm.reset();
        customerId.disabled = false;
        editingRow = null;

        if (formTitle) {
            formTitle.textContent = "Add New Customer";
        }
    }

    function openCustomerForm() {
        clearForm();
        formPanel.hidden = false;
        formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        customerName.focus();
    }

    function closeCustomerForm() {
        formPanel.hidden = true;
        clearForm();
    }

    function editCustomer(row) {
        editingRow = row;

        customerId.value = getCellText(row, 0);
        customerName.value = getCellText(row, 1);
        customerEmail.value = getCellText(row, 2);
        customerPhone.value = getCellText(row, 3);
        customerLicense.value = getCellText(row, 4);
        customerVerified.value = getVerified(row);
        customerStatus.value = getStatus(row);

        // Do not allow the customer's ID to change during editing.
        customerId.disabled = true;

        if (formTitle) {
            formTitle.textContent = "Edit Customer";
        }

        formPanel.hidden = false;
        formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function deleteCustomer(row) {
        const name = getCellText(row, 1);

        if (!confirm(`Are you sure you want to delete ${name}?`)) {
            return;
        }

        row.remove();
        refreshSummary();
        filterCustomers();
    }

    function isDuplicate(id, email) {
        return Array.from(tableBody.rows).some(row => {
            if (row === editingRow) return false;

            const sameId = getCellText(row, 0).toLowerCase() === id.toLowerCase();
            const sameEmail = getCellText(row, 2).toLowerCase() === email.toLowerCase();

            return sameId || sameEmail;
        });
    }

    function setCellText(row, index, value) {
        row.cells[index].textContent = value;
    }

    function saveCustomer(event) {
        event.preventDefault();

        const id = customerId.value.trim();
        const name = customerName.value.trim();
        const email = customerEmail.value.trim();
        const phone = customerPhone.value.trim();
        const license = customerLicense.value.trim();
        const verified = customerVerified.value;
        const status = customerStatus.value;

        if (!id || !name || !email || !phone || !license || !verified || !status) {
            alert("Please fill in all customer fields.");
            return;
        }

        if (isDuplicate(id, email)) {
            alert("A customer with this ID or email already exists.");
            return;
        }

        let row = editingRow;

        if (!row) {
            row = tableBody.insertRow();
            for (let i = 0; i < 8; i++) {
                row.insertCell();
            }
        }

        setCellText(row, 0, id);
        setCellText(row, 1, name);
        setCellText(row, 2, email);
        setCellText(row, 3, phone);
        setCellText(row, 4, license);

        row.cells[5].replaceChildren(createStatusBadge(verified));
        row.cells[6].replaceChildren(createStatusBadge(status));

        attachRowButtons(row);

        closeCustomerForm();
        refreshSummary();
        filterCustomers();
    }

    // Make sure the sample customers also get working Edit/Delete buttons.
    Array.from(tableBody.rows).forEach(attachRowButtons);

    openFormBtn.addEventListener("click", openCustomerForm);
    closeFormBtn.addEventListener("click", closeCustomerForm);
    customerForm.addEventListener("submit", saveCustomer);
    searchInput.addEventListener("input", filterCustomers);
    statusFilter.addEventListener("change", filterCustomers);

    refreshSummary();
    filterCustomers();
});
