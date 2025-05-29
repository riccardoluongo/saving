function hasWhiteSpace(s) {
    return /\s/g.test(s);
}

function validateForm(event){
    const newPassword = document.getElementsByName("new-password")[0].value;
    const newPasswordConfirm = document.getElementsByName("confirm-new-password")[0].value;

    if(hasWhiteSpace(newPassword) || hasWhiteSpace(newPasswordConfirm)){
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
//Riccardo Luongo, 16/05/2025