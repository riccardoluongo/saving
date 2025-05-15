function hasWhiteSpace(s) {
    return /\s/g.test(s);
}

function new_wallet() {
    const wallet_form = document.getElementById('wallet-form');
    wallet_form.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("wallet-name");
        const start_balance = document.getElementById("wallet-start-balance");
        const currency = document.getElementById("currency");

        const regex = /^[A-Za-z0-9_]+$/;

        if (name.value != "" && start_balance.value != "") {
            if(hasWhiteSpace(name.value)){
                alert(translation["no_spaces"]);
            }
            else{
                if(regex.test(name.value)){
                    fetch(`/new_wallet`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify([name.value,start_balance.value * 100,currency.value])
                    })
                    .then(function(response) {
                        if (!response.ok) {
                            alert(translation["wallet_exists"]);
                        }
                        else{
                            updateWalletTable();
                        }
                    })
                }
                else{
                    alert(translation["invalid_wallet_name"]);
                }
            }
            name.value = "";
            start_balance.value = 0;
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
        fetch(`/delete_wallet?wallet=${wallet}`)
        .then(function(){
            updateWalletTable();
        })
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

            const title_row = table.appendChild(document.createElement('tr'));
            const name_column = title_row.appendChild(document.createElement('th'));
            const balance_column = title_row.appendChild(document.createElement('th'));
            const actions_column = title_row.appendChild(document.createElement('th'));

            actions_column.classList.add("actions-th");

            name_column.innerText = translation["name_sorter"].slice(0, -1);
            balance_column.innerText = translation["bal_header"];
            actions_column.innerText = translation["actions_header"];

            for (const wallet in data) {
                let currency = "$";
                const row = table.appendChild(document.createElement('tr'));
                
                const name_td = row.appendChild(document.createElement('td'));
                name_td.setAttribute('class','name-td');
                name_td.innerText = data[wallet];

                const balance_td = row.appendChild(document.createElement('td'));
                balance_td.setAttribute('class', 'balance-td');
                fetch(`/balance?wallet=${data[wallet]}`)
                    .then(response => response.json())
                    .then(data => {
                        if(data[1] == "EUR")
                            currency = "€";
                        balance_td.innerText = data[0]/100 + currency;
                    })
                                    
                const actions_td = row.appendChild(document.createElement('td'));
                actions_td.setAttribute('class', 'actions-td');
                
                const del_href = actions_td.appendChild(document.createElement('a'));
                del_href.setAttribute('onclick', `deleteWallet('${data[wallet]}')`);
                const del_btn = del_href.appendChild(document.createElement('button'));
                setAttributes(del_btn, {'class' : 'del-btn', 'title' : 'Delete'});
                const del_btn_icon = del_btn.appendChild(document.createElement('i'));
                del_btn_icon.setAttribute('class', 'fa fa-trash del-btn-icon');
            }
        })
}

function delAll() {
    if(confirm(translation["delete_all_wallets"])){
        fetch('/delete_all_wallets')
            .then(function() {
                updateWalletTable();
            })
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
        currency = data == "ita" ? "€" : "$";
        fetch(`/translations?lang=${data}`).then((response) => response.json())
        .then((data) => {
            translation = data;

            new_wallet();
            updateWalletTable();
        })
    })
}
//By Riccardo Luongo, 14/05/2025