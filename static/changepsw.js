function hasWhiteSpace(s) {
    return /\s/g.test(s);
}

function validateForm(event){
    const new_password = document.getElementsByName("new-password")[0].value;
    const new_password_confirm = document.getElementsByName("confirm-new-password")[0].value;

    if(hasWhiteSpace(new_password) || hasWhiteSpace(new_password_confirm)){
        event.preventDefault();
        alert(translation["password_no_spaces"]);
    }
    else{
        return;
    }
}

fetch("/current_lang")
.then((response) => response.json())
.then((data) => {
    fetch(`/translations?lang=${data}`).then((response) => response.json())
    .then((data) => {
        translation = data;
    })
})
//By Riccardo Luongo, 26/03/2024