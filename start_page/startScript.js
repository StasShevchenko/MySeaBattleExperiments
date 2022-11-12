const enterButton = document.getElementById("enterButton");
const loginInput = document.getElementById("loginInput");
const passwordInput = document.getElementById("passwordInput");
const errorMessage = document.getElementById("errorMessageHeader");
const registrationButton = document.getElementById("registrationButton");
const URL = "http://192.168.109.228:8080/login";
const Http = new XMLHttpRequest();

registrationButton.addEventListener("click", function(){
    window.location.href="../registration_page/registration.html";
})

enterButton.addEventListener("click", function () {
  Http.open("POST", URL);
  Http.setRequestHeader("Content-Type", "application/json");
  
  let body = JSON.stringify({
    login: loginInput.value.trim(),
    password: passwordInput.value.trim(),
  });
  Http.send(body);
});

loginInput.addEventListener("input", function(){
    errorMessage.style.display = "none";
})

passwordInput.addEventListener("input", function(){
    errorMessage.style.display = "none";
})

Http.onreadystatechange = function () {
  if (this.readyState == 4 && this.status == 200) {
    if (Http.responseText == "0") {
      errorMessage.style.display = "block";
    } else if(Http.responseText == "1"){
        sessionStorage.setItem("playerName", loginInput.value.trim());
        window.location.href = "../player_menu/playerMenu.html";
    }
  }
};
