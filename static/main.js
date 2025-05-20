let translation = null;

function setAttributes(el, attrs) {
    for (let key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
}

function updateBalance(){
    const selectedWallet = document.getElementById('wallet-selector').value;
    const currency = document.getElementById("currency");

    if(selectedWallet == "Totalbalance"){
        fetch(`/total_balance?currency=${currency.value}`)
        .then((response) => response.json())
        .then((data) => {
            const balanceDiv = document.getElementById("balance-val");
            const currencySymbol = currency.value == 'EUR' ? '€' : '$';
            currency.setAttribute('onchange', `updateBalance()`);
            currency.style.display = '';

            balanceDiv.innerText = (parseFloat(data)/100).toFixed(2) + currencySymbol;
            updateTransactionTable("date", 1, currencySymbol);
        })
    }
    else{
        currency.style.display = 'none';

        fetch(`/balance?wallet=${selectedWallet}`)
        .then((response) => response.json())
        .then((data) => {
            const balanceDiv = document.getElementById("balance-val");
            const balance = parseFloat(data[0]) / 100
            let currency = "$";
            if(data[1] == "EUR")
                currency = "€";

            balanceDiv.innerText = balance + currency;
            updateTransactionTable("date", 1, currency);
        })
    }
}

function updateWalletSelector() {
    fetch('/wallets')
        .then((response) => response.json())
        .then((data) => {
            const walletSelector = document.getElementById('wallet-selector');

            for(const wallet in data) {
                const option = walletSelector.appendChild(document.createElement('option'));
                option.setAttribute('value', data[wallet]);
                option.innerText = data[wallet];
            }

            walletSelector.options[0].selected = true;
            updateBalance();
        })
}

function addMoney(event) {
    event.preventDefault();

    const nameDiv = document.getElementById("add-transaction-name");
    const name = nameDiv.value;
    const wallet = document.getElementById('wallet-selector').value;
    const valueDiv = document.getElementById("add-transaction-value");
    const value = valueDiv.value;

    if (name != "" && value != "") {
        fetch("/add", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken' : token
            },
            body: JSON.stringify([name,wallet,value])
        })
        .then((response) => {
            if(response.ok)
            updateBalance();
            else
            response.text().then(alert(translation["transaction_err"]));
        })
    } else{
        alert(translation["empty_fields"]);
    }

    nameDiv.value = "";
    valueDiv.value = 0;
}

function pay(event) {
    event.preventDefault();

    const nameDiv = document.getElementById("pay-transaction-name");
    const name = nameDiv.value;
    const valueDiv = document.getElementById("pay-transaction-value");
    const value = valueDiv.value;
    const wallet = document.getElementById('wallet-selector').value;
    const currentBalance = parseFloat(document.getElementById("balance-val").innerText);

    if (name != "" && value != "") {
        if(value <= currentBalance){
            fetch("/pay", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken' : token
                },
                body: JSON.stringify([name,wallet,value])
            })
            .then((response) => {
                if(response.ok)
                updateBalance();
                else
                response.text().then(alert(translation["transaction_err"]));
            });
        } else{
            alert(translation["no_balance"]);
        }
    } else{
        alert(translation["empty_fields"]);
    }

    nameDiv.value = "";
    valueDiv.value = 0;
}

    function deleteTransaction(wallet, id){
        if(confirm(translation["del_transaction_confirm"])){
            fetch("/delete_transaction", {
                method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken' : token
                    },
                    body: JSON.stringify([wallet,id])
            })
            .then(updateBalance);
    }
}

function checkScrollPosition(){
    const wrapper = document.getElementById("page-btn-wrapper");
    const prevBtn = document.getElementsByClassName("prev-btn")[0];
    const nextBtn = document.getElementsByClassName("next-btn")[0];

    if(wrapper.scrollLeft <= 0){
        prevBtn.style.color="grey";
    }
    else{
        prevBtn.style.color="black";
    }

    if(wrapper.scrollLeft + wrapper.clientWidth === wrapper.scrollWidth){
        nextBtn.style.color="grey";
    }
    else{
        nextBtn.style.color="black";
    }
}

function scrollPageBtnBack(){
    const wrapper = document.getElementById("page-btn-wrapper");
    wrapper.scrollLeft -= 115;

    checkScrollPosition()
}

function scrollPageBtnFwd(){
    const wrapper = document.getElementById("page-btn-wrapper");
    wrapper.scrollLeft += 115;

    checkScrollPosition()
}

function whiteBtn(id){
    document.getElementById(id).style.color = "white"
}

function calculatePages(data, currency){
    const pageBtnContainer = document.getElementById('page-btn-wrapper');
    const rowsPerPageSelector = document.getElementById('items-page');

    while(pageBtnContainer.firstChild){
        pageBtnContainer.removeChild(pageBtnContainer.firstChild);
    }

    if(rowsPerPageSelector.value == 0){
        const btn = pageBtnContainer.appendChild(document.createElement('span'));
        btn.innerText = "1";
        btn.setAttribute("id", `btn-1`);
        btn.classList.add('page-btn');
    } else{
        buttonsNum = Math.ceil(data.length / rowsPerPageSelector.value);
        for(let i=1; i<=buttonsNum; i++){
            const btn = pageBtnContainer.appendChild(document.createElement('span'));
            btn.innerText = i;

            btn.setAttribute("onclick", `updateTransactionTable('date',${i})`, currency);
            btn.setAttribute("id", `btn-${i}`);
            btn.classList.add('page-btn');
        }
    }

    checkScrollPosition();
}

let nameSortCounter = walletSortCounter = valueSortCounter = dateSortCounter = 0;

function updateTransactionTable(sortMode, page, currency) {
    const wallet = document.getElementById('wallet-selector').value;
    const rowsPerPageSelector = document.getElementById('items-page');
    rowsPerPageSelector.setAttribute("onchange", `updateTransactionTable("date", 1, "${currency}")`);
    const offset = Number(rowsPerPageSelector.value) * (Number(page) - 1);

    if(wallet == "Totalbalance"){
        fetch(`/transactions_list?offset=0&limit=0`)
        .then(response => response.json())
        .then(data => {
            calculatePages(data, currency);
            document.getElementById(`btn-${page}`).style.color = "white";
        })

        fetch(`/transactions_list?offset=${offset}&limit=${rowsPerPageSelector.value}`)
        .then(response => response.json())
        .then(data => {
            const buttons = document.getElementById("buttons");
            const piggyWrapper = document.getElementById("piggy-wrapper");

            piggyWrapper.style.bottom = "135%";
            if(buttons){buttons.remove();}

            const balanceContainer = document.getElementById("main-square");
            balanceContainer.style.height = "7rem";

            const transactionTableContainer = document.getElementById("transaction-square");
            transactionTableContainer.style.height = "75%";
            transactionTableContainer.style.top = "10.8rem";

            const table = document.getElementById('trans-table');

            while(table.firstChild) {
                table.removeChild(table.firstChild);
            }

            const titleRow = table.appendChild(document.createElement('tr'));
            const nameColumn = titleRow.appendChild(document.createElement('th'));
            const walletColumn = titleRow.appendChild(document.createElement('th'));
            const valueColumn = titleRow.appendChild(document.createElement('th'));

            nameColumn.innerText = translation["name_sorter"].slice(0, -1);
            nameColumn.setAttribute('class', 'name-column');
            nameColumn.setAttribute("onclick", `updateTransactionTable("name", ${page}, '${currency}'); nameSortCounter+=1`);

            walletColumn.innerText = translation["wallet_sorter"];
            walletColumn.setAttribute('class', 'wallet-column');
            walletColumn.setAttribute("onclick", `updateTransactionTable("wallet", ${page}, '${currency}'); walletSortCounter+=1`);

            valueColumn.innerText = translation["value_sorter"].slice(0, -1);
            valueColumn.setAttribute('class', 'value-column');
            valueColumn.setAttribute("onclick", `updateTransactionTable("value", ${page}, '${currency}'); valueSortCounter+=1`);

            data.sort((a, b) => {
                const dateA = new Date(a[0]);
                const dateB = new Date(b[0]);

                return dateB - dateA;
            });

            const selectedSort = document.getElementsByClassName(`${sortMode}-column`)[0];
            const arrow = document.createElement("span");

            if(sortMode=="name"){
                walletSortCounter = 0;
                valueSortCounter = 0;
                dateSortCounter = 0;

                if(nameSortCounter%2 != 0){
                    data.sort((a, b) => b[4].localeCompare(a[4]));
                }
                else{
                    data.sort((a, b) => a[4].localeCompare(b[4]));
                }

                selectedSort.appendChild(arrow);
                arrow.innerText = nameSortCounter%2 == 0 ? " \u2191" : " \u2193";
            }
            if(sortMode=="wallet"){
                valueSortCounter = 0;
                nameSortCounter = 0;
                dateSortCounter = 0;

                if(walletSortCounter%2 != 0){
                    data.sort((a, b) => b[5].localeCompare(a[5]));
                }
                else{
                    data.sort((a, b) => a[5].localeCompare(b[5]));
                }

                selectedSort.appendChild(arrow);
                arrow.innerText = walletSortCounter%2 == 0 ? " \u2191" : " \u2193";
            }
            if(sortMode=="value"){
                walletSortCounter = 0;
                nameSortCounter = 0;
                dateSortCounter = 0;

                if(valueSortCounter%2 != 0){
                    data.sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]));
                }
                else{
                    data.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
                }

                selectedSort.appendChild(arrow);
                arrow.innerText = valueSortCounter%2 == 0 ? " \u2191" : " \u2193";
            }

            if(selectedSort){
                selectedSort.style.color = `white`;
            }

            for(const transaction in data){
                const row = table.appendChild(document.createElement('tr'));

                const nameColumn = row.appendChild(document.createElement('td'));
                nameColumn.setAttribute('class', 'trans-name-td')
                nameColumn.innerText = data[transaction][4]

                const walletColumn = row.appendChild(document.createElement('td'));
                walletColumn.setAttribute('class', 'trans-date-td');
                walletColumn.innerText = data[transaction][5]

                const valueColumn = row.appendChild(document.createElement('td'));
                valueColumn.setAttribute('class', 'trans-value-td');
                const value = data[transaction][1]/100;
                if(value > 0)
                    valueColumn.innerText = `+${value.toString() + currency}`;
                else
                    valueColumn.innerText = value.toString() + currency;

                const actionsColumn = row.appendChild(document.createElement('td'));
                actionsColumn.setAttribute('class', 'trans-actions-td');

                const deleteColumn = actionsColumn.appendChild(document.createElement('a'));
                deleteColumn.setAttribute('onclick', `deleteTransaction('${data[transaction][5]}', ${data[transaction][3]})`);
                const deleteButton = deleteColumn.appendChild(document.createElement('button'));
                setAttributes(deleteButton, {'class' : 'del-btn3', 'title' : 'Delete'});
                const deleteButtonIcon = deleteButton.appendChild(document.createElement('i'));
                deleteButtonIcon.setAttribute('class', 'fa fa-trash del-btn-icon');
            }
        })
    }
    else{
        fetch(`/get_transactions?wallet=${wallet}&offset=0&limit=0`)
        .then(response => response.json())
        .then(data => {
            calculatePages(data);
            document.getElementById(`btn-${page}`).style.color = "white";
        })

        fetch(`/get_transactions?wallet=${wallet}&offset=${offset}&limit=${rowsPerPageSelector.value}`)
        .then(response => response.json())
        .then(data => {
            const mainSquare = document.getElementById("main-square");
            const buttonsDiv = document.getElementById("buttons");
            const piggyWrapper = document.getElementById("piggy-wrapper");

            piggyWrapper.style.bottom = "102%";
            mainSquare.style.height = "10.5rem";
            if(buttonsDiv){buttonsDiv.remove();};


            const buttons = mainSquare.appendChild(document.createElement("div"));
            setAttributes(buttons, {'id':'buttons', 'class':'buttons'});

            const addButtonDiv = buttons.appendChild(document.createElement("div"));
            addButtonDiv.setAttribute('class', 'pay-buttons');
            const addButton = addButtonDiv.appendChild(document.createElement("button"));
            setAttributes(addButton, {'type':'button', 'class':'btn btn-primary btn-lg btn-block transaction-btn', 'data-bs-toggle':'modal', 'data-bs-target':'#addModal'});
            addButton.innerText = translation["add_btn"];

            const payButtonDiv = buttons.appendChild(document.createElement("div"));
            payButtonDiv.setAttribute('class', 'pay-buttons');
            const payButton = payButtonDiv.appendChild(document.createElement("button"));
            setAttributes(payButton, {'type':'button', 'class':'btn btn-primary btn-lg btn-block transaction-btn', 'data-bs-toggle':'modal', 'data-bs-target':'#payModal'});
            payButton.innerText = translation["pay_btn"];

            const transactionTableContainer = document.getElementById("transaction-square");
            transactionTableContainer.style.height = "70%";
            transactionTableContainer.style.top = "14.3rem";

            const table = document.getElementById('trans-table');

            while(table.firstChild) {
                table.removeChild(table.firstChild);
            }

            const titleRow = table.appendChild(document.createElement('tr'));
            const nameColumn = titleRow.appendChild(document.createElement('th'));
            const dateColumn = titleRow.appendChild(document.createElement('th'));
            const valueColumn = titleRow.appendChild(document.createElement('th'));

            nameColumn.innerText = translation["name_sorter"].slice(0, -1);
            nameColumn.setAttribute('class', 'name-column');
            nameColumn.setAttribute("onclick", `updateTransactionTable("name", ${page}, '${currency}'); nameSortCounter+=1`)

            dateColumn.innerText = translation["date_sorter"];
            dateColumn.setAttribute('class', 'date-column');
            dateColumn.setAttribute("onclick", `updateTransactionTable("date", ${page}, '${currency}'); dateSortCounter+=1`)

            valueColumn.innerText = translation["value_sorter"].slice(0, -1);
            valueColumn.setAttribute('class', 'value-column');
            valueColumn.setAttribute("onclick", `updateTransactionTable("value", ${page}, '${currency}'); valueSortCounter+=1`)

            let transactions = data;
            const selectedSort = document.getElementsByClassName(`${sortMode}-column`)[0];
            const arrow = document.createElement("span");

            if(sortMode=="name"){
                walletSortCounter = 0;
                valueSortCounter = 0;
                dateSortCounter = 0;

                if(nameSortCounter%2 != 0){
                    transactions.sort((a, b) => b[0].localeCompare(a[0]));
                }
                else{
                    transactions.sort((a, b) => a[0].localeCompare(b[0]));
                }

                selectedSort.appendChild(arrow);
                arrow.innerText = nameSortCounter%2 == 0 ? " \u2191" : " \u2193";
            }

            if(sortMode=="date"){
                valueSortCounter = 0;
                nameSortCounter = 0;
                walletSortCounter = 0;


                if(dateSortCounter%2 != 0){
                    transactions.sort((a, b) => {
                        const dateA = new Date(a[0]);
                        const dateB = new Date(b[0]);

                        return dateB - dateA;
                    })
                }
                else{
                    transactions.sort((a, b) => {
                        const dateA = new Date(a[0]);
                        const dateB = new Date(b[0]);

                        return dateB - dateA;
                    });
                    transactions = transactions.reverse();
                }

                selectedSort.appendChild(arrow);
                arrow.innerText = dateSortCounter%2 == 0 ? " \u2191" : " \u2193";
            }

            if(sortMode=="value"){
                walletSortCounter = 0;
                nameSortCounter = 0;
                dateSortCounter = 0;

                if(valueSortCounter%2 != 0){
                    transactions.sort((a, b) => Math.abs(a[2]) - Math.abs(b[2]));
                }
                else{
                    transactions.sort((a, b) => Math.abs(b[2]) - Math.abs(a[2]));
                }

                selectedSort.appendChild(arrow);
                arrow.innerText = valueSortCounter%2 == 0 ? " \u2191" : " \u2193";
            }

            if(selectedSort){
                selectedSort.style.color = `white`;
            }

            for(const transaction in transactions) {
                const row = table.appendChild(document.createElement('tr'));

                const nameColumn = row.appendChild(document.createElement('td'));
                nameColumn.setAttribute('class', 'trans-name-td')
                nameColumn.innerText = data[transaction][0]

                const dateColumn = row.appendChild(document.createElement('td'));
                dateColumn.setAttribute('class', 'trans-date-td');
                dateColumn.innerText = data[transaction][1]

                const valueColumn = row.appendChild(document.createElement('td'));
                valueColumn.setAttribute('class', 'trans-value-td');
                const value = data[transaction][2]/100;
                if(value > 0)
                    valueColumn.innerText = `+${value.toString() + currency}`;
                else
                    valueColumn.innerText = value.toString() + currency;

                const actionsColumn = row.appendChild(document.createElement('td'));
                actionsColumn.setAttribute('class', 'trans-actions-td');

                const deleteLink = actionsColumn.appendChild(document.createElement('a'));
                deleteLink.setAttribute('onclick', `deleteTransaction('${data[transaction][3]}', ${data[transaction][4]})`);
                const deleteButton = deleteLink.appendChild(document.createElement('button'));
                setAttributes(deleteButton, {'class' : 'del-btn3', 'title' : 'Delete'});
                const deleteButtonIcon = deleteButton.appendChild(document.createElement('i'));
                deleteButtonIcon.setAttribute('class', 'fa fa-trash del-btn-icon');
            }
        })
    }
}

function openNav() {
    document.getElementById("mainSidenav").classList.add("sidenav-big")
    closeNav2()
}

function closeNav() {
    document.getElementById("mainSidenav").classList.remove("sidenav-big");
}

function openNav2() {
    document.getElementById("accSidenav").classList.add("sidenav-big")
    closeNav()
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

            updateWalletSelector();
            document.getElementById('wallet-selector').addEventListener('change', updateBalance);
        })
    })
}
//Riccardo Luongo, 20/05/2025