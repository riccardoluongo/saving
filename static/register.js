function hasWhiteSpace(s) {
    return /\s/g.test(s);
}

function validateForm(event){
    const username = document.getElementsByName("username")[0].value;
    const password = document.getElementsByName("password")[0].value;
    const passwordConfirm = document.getElementsByName("password-confirm")[0].value;

    if(hasWhiteSpace(username)){
        event.preventDefault();
        alert(translation["username_no_spaces"]);
        return;
    }

    if(hasWhiteSpace(password) || hasWhiteSpace(passwordConfirm)){
        event.preventDefault();
        alert(translation["password_no_spaces"]);
    }
    else{
        return;
    }
}

window.onload = function(){
    const lang = document.getElementById("lang").innerText;
    fetch(`/login_translations?lang=${lang}`).then((response) => response.json())
    .then((data) => {
        translation = data;
    })
}
//Riccardo Luongo, 16/05/2025