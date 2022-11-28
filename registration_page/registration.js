const emptyInputErrorMessage = document.getElementById("emptyInputErrorMessage");
const userAlreadyExistsErrorMessage = document.getElementById("userAlreadyExistsErrorMessage");
const registrationButton = document.getElementById("registrationButton");
const loginInput = document.getElementById("loginInput");
const passwordInput = document.getElementById("passwordInput");
const successMessage = document.getElementById("successMessage");
const backButton = document.getElementById("backButton");
const URL = "http://192.168.224.228:8080/register";
const Http = new XMLHttpRequest();

registrationButton.addEventListener("click", function(){
    successMessage.style.display = "none";
    let login = loginInput.value.trim();
    let password = passwordInput.value.trim();
    if(login == "" || password == ""){
        emptyInputErrorMessage.style.display = "block";
    } else{
        Http.open("POST", URL);
        Http.setRequestHeader("Content-Type", "application/json")
        let body = JSON.stringify({
            login: login,
            password: password
        })
        Http.send(body);
    }
});

Http.onreadystatechange = function (){
    if(this.readyState == 4 && this.status == 200){
        if(Http.responseText == "0"){
            userAlreadyExistsErrorMessage.style.display = "block";
        } else if(Http.responseText == "1"){
            successMessage.style.display = "block";
        }
    }
}

loginInput.addEventListener("input", function(){
    emptyInputErrorMessage.style.display = "none";
    userAlreadyExistsErrorMessage.style.display = "none";
    successMessage.style.display = "none";
});

passwordInput.addEventListener("input", function(){
    emptyInputErrorMessage.style.display = "none";
    userAlreadyExistsErrorMessage.style.display = "none";
    successMessage.style.display = "none";
});

backButton.addEventListener("click", function(){
    window.location.href = "../index.html";
})
