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

function confirmDel(event){
    if(confirm(translation["confirm_del_account"])){
        return
    }
    else{
        event.preventDefault()
    }
}

window.onload = function(){
    fetch("/current_lang")
    .then((response) => response.json())
    .then((data) => {
        fetch(`/translations?lang=${data}`).then((response) => response.json())
        .then((data) => {
            translation = data;

            document.getElementsByName('confirm-del-checkbox')[0].checked = false;
            document.getElementById('submit-del').disabled = true;
        })
    })
}
//By Riccardo Luongo, 18/03/2025