function hasWhiteSpace(s) {
    return /\s/g.test(s);
}

function new_wallet() {
    const walletForm = document.getElementById('wallet-form');
    walletForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("wallet-name");
        const startBalance = document.getElementById("wallet-start-balance");
        const currency = document.getElementById("currency");

        const regex = /^[A-Za-z0-9_]+$/;

        if (name.value != "" && startBalance.value != "") {
            if(hasWhiteSpace(name.value)){
                alert(translation["no_spaces"]);
            }
            else{
                if(regex.test(name.value)){
                    fetch(`/new_wallet`, {
                        method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken' : token
                    },
                    body: JSON.stringify([name.value,startBalance.value * 100,currency.value])
                    })
                    .then(function(response) {
                        if (response.ok)
                            updateWalletTable();
                        else if(response.status == 400)
                            alert(translation["wallet_exists"]);
                        else
                            alert(translation["create_wallet_err"]);
                    })
                }
                else{
                    alert(translation["invalid_wallet_name"]);
                }
            }
            name.value = "";
            startBalance.value = 0;
        } else {
            alert(translation["empty_fields"]);
        }
    });
}

function setAttributes(el, attrs) {
    for (const key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
}

function deleteWallet(wallet){
    if(confirm(translation["wallet_delete_confirm"])){
        fetch(`/delete_wallet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken' : token
            },
            body: JSON.stringify(wallet)
        })
        .then((response) => {
            if(response.ok)
                updateWalletTable();
            else
                alert(translation['del_wallet_err']);
        });
    }
}

function updateWalletTable() {
    fetch('/wallets')
        .then(response => response.json())
        .then(data => {
            const table = document.getElementById("wallet-table");

            while(table.firstChild) {
                table.removeChild(table.firstChild);
            }

            const titleRow = table.appendChild(document.createElement('tr'));
            const nameHeader = titleRow.appendChild(document.createElement('th'));
            const balanceHeader = titleRow.appendChild(document.createElement('th'));
            const actionsHeader = titleRow.appendChild(document.createElement('th'));

            actionsHeader.classList.add("actions-th");

            nameHeader.innerText = translation["name_sorter"].slice(0, -1);
            balanceHeader.innerText = translation["bal_header"];
            actionsHeader.innerText = translation["actions_header"];

            for (const wallet in data) {
                let currency = "$";
                const row = table.appendChild(document.createElement('tr'));
                const nameColumn = row.appendChild(document.createElement('td'));
                const balanceColumn = row.appendChild(document.createElement('td'));
                const actionsColumn = row.appendChild(document.createElement('td'));
                const deleteLink = actionsColumn.appendChild(document.createElement('a'));
                const deleteButton = deleteLink.appendChild(document.createElement('button'));
                const deleteButtonIcon = deleteButton.appendChild(document.createElement('i'));

                nameColumn.setAttribute('class','name-td');
                nameColumn.innerText = data[wallet];
                actionsColumn.setAttribute('class', 'actions-td');
                balanceColumn.setAttribute('class', 'balance-td');

                fetch(`/balance?wallet=${data[wallet]}`)
                    .then(response => {
                        if(response.ok)
                            return response.json();
                        else
                            alert(translation["balance_err"]);
                    })
                    .then((data) => {
                        if(data != null){
                            if(data[1] == "EUR")
                                currency = "€";
                            balanceColumn.innerText = data[0]/100 + currency;
                        } else{
                            alert(translation["balance_err"]);
                        }
                    })

                deleteLink.setAttribute('onclick', `deleteWallet('${data[wallet]}')`);
                setAttributes(deleteButton, {'class' : 'del-btn', 'title' : 'Delete'});
                deleteButtonIcon.setAttribute('class', 'fa fa-trash del-btn-icon');
            }
        })
}

function delAll() {
    if(confirm(translation["delete_all_wallets"])){
        fetch(`/delete_all_wallets`, {
            method: 'POST',
            headers: {
                'X-CSRFToken' : token
            },
        })
        .then((response) => {
            if(response.ok)
                updateWalletTable();
            else
                alert(translation['del_all_wallets_err']);
        });
    }
}

function openNav2() {
    document.getElementById("accSidenav").classList.add("sidenav-big")
}

function closeNav2() {
    document.getElementById("accSidenav").classList.remove("sidenav-big");
}

window.onload = function() {
    fetch("/current_lang")
    .then((response) => response.json())
    .then((data) => {
        fetch(`/translations?lang=${data}`).then((response) => response.json())
        .then((data) => {
            translation = data;
            token = document.getElementById('csrf-token').value;

            new_wallet();
            updateWalletTable();
        })
    })
}
//Riccardo Luongo, 20/05/2025