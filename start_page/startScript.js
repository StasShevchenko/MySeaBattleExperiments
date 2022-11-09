const enterNameButton = document.getElementById("enterNameButton");
const enterNameTextField = document.getElementById("enterNameTextField");

enterNameButton.addEventListener("click", function(){
    if(enterNameTextField.value != ""){
        sessionStorage.setItem("playerName", enterNameTextField.value.trim());
        window.location.href="player_menu/playerMenu.html";
    }
})

