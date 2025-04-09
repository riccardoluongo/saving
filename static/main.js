let translation = null;
let currency = null;
function setAttributes(el, attrs) {
    for (let key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
}

function updateBalance(){
    const select_value = document.getElementById('wallet-selector').value;
    if(select_value == "Totalbalance"){
        fetch(`/total_balance`)
        .then((response) => response.json())
        .then((data) => {
            const balance_div = document.getElementById("balance-val");
            balance_div.innerText = data + currency;
            updateTransactionTable("date", 1);
        })
    }
    else{
        fetch(`/balance?wallet=${select_value}`)
        .then((response) => response.json())
        .then((data) => {
            const balance_div = document.getElementById("balance-val");
            balance_div.innerText = data.slice(0, -1) + currency;
            updateTransactionTable("date", 1);
        })
    }
}

function updateWalletSelector() {
    fetch('/wallets')
        .then((response) => response.json())
        .then((data) => {
            const selector = document.getElementById('wallet-selector');

            for(const wallet in data) {
                const option = selector.appendChild(document.createElement('option'));
                option.setAttribute('value', data[wallet]);
                option.innerText = data[wallet];
            }

            selector.options[0].selected = true;
            updateBalance();
        })
}

function addMoney() {
    const add_form = document.getElementById('add-form');
    add_form.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("add-transaction-name").value
        const wallet = document.getElementById('wallet-selector').value;
        const value = document.getElementById("add-transaction-value").value;

        if (name != "" && value != "") {
            fetch(`/add?name=${name}&wallet=${wallet}&value=${value}`)
                .then(function(response) {
                    if (!response.ok) {
                        return response.text();
                    }
                    else{
                        updateBalance();
                        name = "";
                        value = 0;
                    }
                })//fix unfocusable form control
                .then((data) => {
                    if(data){
                        alert(data);
                    }
                })
        } else {
            alert(translation["empty_fields"]);
        }
        document.getElementById("add-transaction-name").value = "";
        document.getElementById("add-transaction-value").value = 0;
    });
}

function pay() {
    const add_form = document.getElementById('pay-form');
    add_form.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("pay-transaction-name").value
        const wallet = document.getElementById('wallet-selector').value;
        const value = document.getElementById("pay-transaction-value").value;

        if (name != "" && value != "") {
            fetch(`/balance?wallet=${wallet}`)
            .then((response) => response.json())
            .then((data) => {
                const balance = data.substring(0, data.length - 1);
                if(parseFloat(value) > parseFloat(balance)){
                    alert(translation["no_balance"]);
                }
                else{
                    fetch(`/pay?name=${name}&wallet=${wallet}&value=${value}`)//use POST
                    .then(function(response) {
                        if (!response.ok) {
                            return response.text();
                        }
                        else{
                            updateBalance();
                        }
                    })
                    .then((data) => {
                        if(data){
                            alert(data);
                        }
                    })
                }
                document.getElementById("pay-transaction-name").value = "";
                document.getElementById("pay-transaction-value").value = 0;
            })
        } 
        else {
            alert(translation["empty_fields"]);
        }
    });
}

function delete_trans(wallet, id){
    if(confirm(translation["del_transaction_confirm"])){
        fetch(`/delete_transaction?wallet=${wallet}&id=${id}`)
        .then(function(){
            updateBalance();
        })
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

function calculatePages(data){
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

            btn.setAttribute("onclick", `updateTransactionTable('date',${i})`);
            btn.setAttribute("id", `btn-${i}`);
            btn.classList.add('page-btn');
        }
    }

    checkScrollPosition();
}

var nameSortCounter = walletSortCounter = valueSortCounter = dateSortCounter = 0;

function updateTransactionTable(sortMode, page) {
    const wallet = document.getElementById('wallet-selector').value;
    const rowsPerPageSelector = document.getElementById('items-page');
    rowsPerPageSelector.setAttribute("onchange", `updateTransactionTable("date", 1)`);
    const offset = Number(rowsPerPageSelector.value) * (Number(page) - 1);

    if(wallet == "Totalbalance"){
        fetch(`/transactions_list?offset=0&limit=0`)
        .then(response => response.json())
        .then(data => {
            calculatePages(data);
            document.getElementById(`btn-${page}`).style.color = "white";
        })

        fetch(`/transactions_list?offset=${offset}&limit=${rowsPerPageSelector.value}`)
        .then(response => response.json())
        .then(data => {
            const buttons = document.getElementById("buttons");
            if(buttons){
                buttons.remove();
            }
    
            const balance_container = document.getElementById("main-square");
            balance_container.style.height = "7rem";
    
            const trans_table_container = document.getElementById("transaction-square");
            trans_table_container.style.height = "75%";
            trans_table_container.style.top = "10.8rem";
    
            const table = document.getElementById('trans-table');
    
            while(table.firstChild) {
                table.removeChild(table.firstChild);
            }
    
            const title_row = table.appendChild(document.createElement('tr'));
            const name_column = title_row.appendChild(document.createElement('th'));
            const wallet_column = title_row.appendChild(document.createElement('th'));
            const value_column = title_row.appendChild(document.createElement('th'));
    
            name_column.innerText = translation["name_sorter"].slice(0, -1);
            name_column.setAttribute('class', 'name-column');
            name_column.setAttribute("onclick", `updateTransactionTable("name", ${page}); nameSortCounter+=1`);
            
            wallet_column.innerText = translation["wallet_sorter"];
            wallet_column.setAttribute('class', 'wallet-column');
            wallet_column.setAttribute("onclick", `updateTransactionTable("wallet", ${page}); walletSortCounter+=1`);
    
            value_column.innerText = translation["value_sorter"].slice(0, -1);
            value_column.setAttribute('class', 'value-column');
            value_column.setAttribute("onclick", `updateTransactionTable("value", ${page}); valueSortCounter+=1`);

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

                const name_td = row.appendChild(document.createElement('td'));
                name_td.setAttribute('class', 'trans-name-td')
                name_td.innerText = data[transaction][4]

                const wallet_td = row.appendChild(document.createElement('td'));
                wallet_td.setAttribute('class', 'trans-date-td');
                wallet_td.innerText = data[transaction][5]

                const value_td = row.appendChild(document.createElement('td'));
                value_td.setAttribute('class', 'trans-value-td');
                if(parseFloat(data[transaction][1])>0){
                    value_td.innerText = `+${data[transaction][1] + currency}`;
                }
                else{
                    value_td.innerText = `${data[transaction][1] + currency}`;
                }

                const actions_td = row.appendChild(document.createElement('td'));
                actions_td.setAttribute('class', 'trans-actions-td');

                const del_href = actions_td.appendChild(document.createElement('a'));
                del_href.setAttribute('onclick', `delete_trans('${data[transaction][5]}', ${data[transaction][3]})`);
                const del_btn = del_href.appendChild(document.createElement('button'));
                setAttributes(del_btn, {'class' : 'del-btn3', 'title' : 'Delete'});
                const del_btn_icon = del_btn.appendChild(document.createElement('i'));
                del_btn_icon.setAttribute('class', 'fa fa-trash del-btn-icon');
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
            const main_square = document.getElementById("main-square");
            main_square.style.height = "10.5rem";

            const buttons_div = document.getElementById("buttons");
            if(buttons_div){
                buttons_div.remove();
            }

            const buttons = main_square.appendChild(document.createElement("div"));
            setAttributes(buttons, {'id':'buttons', 'class':'buttons'});

            const add_button_div = buttons.appendChild(document.createElement("div"));
            add_button_div.setAttribute('class', 'pay-buttons');
            add_button = add_button_div.appendChild(document.createElement("button"));
            setAttributes(add_button, {'type':'button', 'class':'btn btn-primary btn-lg btn-block palle', 'data-bs-toggle':'modal', 'data-bs-target':'#addModal'});
            add_button.innerText = translation["add_btn"];

            const pay_button_div = buttons.appendChild(document.createElement("div"));
            pay_button_div.setAttribute('class', 'pay-buttons');
            pay_button = pay_button_div.appendChild(document.createElement("button"));
            setAttributes(pay_button, {'type':'button', 'class':'btn btn-primary btn-lg btn-block palle', 'data-bs-toggle':'modal', 'data-bs-target':'#payModal'});
            pay_button.innerText = translation["pay_btn"];

            const trans_table_container = document.getElementById("transaction-square");
            trans_table_container.style.height = "70%";
            trans_table_container.style.top = "14.3rem";

            const table = document.getElementById('trans-table');

            while(table.firstChild) {
                table.removeChild(table.firstChild);
            }

            const title_row = table.appendChild(document.createElement('tr'));
            const name_column = title_row.appendChild(document.createElement('th'));
            const date_column = title_row.appendChild(document.createElement('th'));
            const value_column = title_row.appendChild(document.createElement('th'));

            name_column.innerText = translation["name_sorter"].slice(0, -1);
            name_column.setAttribute('class', 'name-column')
            name_column.setAttribute("onclick", `updateTransactionTable("name", ${page}); nameSortCounter+=1`)
            
            date_column.innerText = translation["date_sorter"];
            date_column.setAttribute('class', 'date-column')
            date_column.setAttribute("onclick", `updateTransactionTable("date", ${page}); dateSortCounter+=1`)

            value_column.innerText = translation["value_sorter"].slice(0, -1);
            value_column.setAttribute('class', 'value-column')
            value_column.setAttribute("onclick", `updateTransactionTable("value", ${page}); valueSortCounter+=1`)

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
                    transactions.sort((a, b) => Math.abs(a[2].slice(1, -1)) - Math.abs(b[2].slice(1, -1)));
                }
                else{
                    transactions.sort((a, b) => Math.abs(b[2].slice(1, -1)) - Math.abs(a[2].slice(1, -1)));
                }

                selectedSort.appendChild(arrow);
                arrow.innerText = valueSortCounter%2 == 0 ? " \u2191" : " \u2193";
            }

            if(selectedSort){
                selectedSort.style.color = `white`;
            }

            for(const transaction in transactions) {
                const row = table.appendChild(document.createElement('tr'));

                const name_td = row.appendChild(document.createElement('td'));
                name_td.setAttribute('class', 'trans-name-td')
                name_td.innerText = data[transaction][0]

                const date_td = row.appendChild(document.createElement('td'));
                date_td.setAttribute('class', 'trans-date-td');
                date_td.innerText = data[transaction][1]

                const value_td = row.appendChild(document.createElement('td'));
                value_td.setAttribute('class', 'trans-value-td');
                value_td.innerText = data[transaction][2].slice(0, -1) + currency;

                const actions_td = row.appendChild(document.createElement('td'));
                actions_td.setAttribute('class', 'trans-actions-td');

                const del_href = actions_td.appendChild(document.createElement('a'));
                del_href.setAttribute('onclick', `delete_trans('${data[transaction][3]}', ${data[transaction][4]})`);
                const del_btn = del_href.appendChild(document.createElement('button'));
                setAttributes(del_btn, {'class' : 'del-btn3', 'title' : 'Delete'});
                const del_btn_icon = del_btn.appendChild(document.createElement('i'));
                del_btn_icon.setAttribute('class', 'fa fa-trash del-btn-icon');
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
        currency = data == "ita" ? "€" : "$";
        fetch(`/translations?lang=${data}`).then((response) => response.json())
        .then((data) => {
            translation = data;

            updateWalletSelector();
            document.getElementById('wallet-selector').addEventListener('change', updateBalance);
            addMoney();
            pay();
        })
    })
}
//By Riccardo Luongo, 02/04/2025