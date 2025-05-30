function reset(){
    const token = document.getElementsByName("csrf_token")[0].value;
    const confirmText = document.getElementById("confirm-text").value;

    if (confirm(confirmText)) {
        fetch("/reset_settings", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken' : token
            }
        })
    }
}

function updateSettings(){
    fetch("/preferred_currency")
    .then(response => response.json())
    .then((preferredCurrency) => {
        const selector = document.getElementsByName("default-currency-selector")[0];

        selector.value = preferredCurrency;
        selector.selectedIndex = preferredCurrency == "USD" ? 0 : 1;
    })
}

window.onload = () => {
    updateSettings();
    document.getElementById("reset-btn").addEventListener('click', reset);
}
//Riccardo Luongo, 30/05/2025