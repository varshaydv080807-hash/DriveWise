
const message = document.getElementById("settings-message");

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("settings-error", isError);
}

document.getElementById("profile-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("admin-name").value.trim();
    const email = document.getElementById("admin-email").value.trim();

    if (!name || !email) {
        showMessage("Please enter a name and valid email.", true);
        return;
    }

    showMessage("Profile validated successfully. Permanent saving will be added later.");
});

document.getElementById("rental-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const minDays = Number(document.getElementById("min-days").value);
    const maxDays = Number(document.getElementById("max-days").value);

    if (minDays < 1 || maxDays < minDays) {
        showMessage("Maximum rental duration must be at least the minimum duration.", true);
        return;
    }

    showMessage("Rental preferences validated successfully.");
});

document.getElementById("save-notifications").addEventListener("click", function () {
    const emailEnabled = document.getElementById("email-notifications").checked;
    const bookingEnabled = document.getElementById("booking-notifications").checked;

    showMessage(
        `Notification preferences selected: Email ${emailEnabled ? "ON" : "OFF"}, Booking ${bookingEnabled ? "ON" : "OFF"}.`
    );
});

document.getElementById("password-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const current = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirm = document.getElementById("confirm-password").value;

    if (newPassword === current) {
        showMessage("Your new password must differ from your current password.", true);
        return;
    }

    if (newPassword !== confirm) {
        showMessage("The new password and confirmation do not match.", true);
        return;
    }

    showMessage("Password fields validated. Actual password changes require backend authentication.");

    document.getElementById("password-form").reset();
});
