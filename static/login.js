function hasWhiteSpace(s) {
    return /\s/g.test(s);
}

function validateUsername(event){
    const username = document.getElementsByName("username")[0].value;

    if(hasWhiteSpace(username)){
        event.preventDefault();
        alert(translation["username_no_spaces"]);
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
//By Riccardo Luongo, 26/03/2025