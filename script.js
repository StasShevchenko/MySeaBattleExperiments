//
//Блок игровой инициализации
//
//Константы
const Orientations = Object.freeze({
  HORIZONTAL: 1,
  VERTICAL: 2,
});
const ShipSizes = Object.freeze({
  BIGGEST: 4,
  BIG: 3,
  MEDIUM: 2,
  SMALL: 1,
});
const GameFieldStates = Object.freeze({
  EMPTY: 0,
  PLACED: 1,
  RESTRICTED: 2,
  DESTRUCTED: 3,
});
const ShipReserve = Object({
  biggestCount: 1,
  bigCount: 2,
  mediumCount: 3,
  smallCount: 4,
});

const clearButton = document.getElementById("clearButton");
const readyButton = document.getElementById("readyButton");
readyButton.disabled = true;

clearButton.addEventListener("click", function(){
  removeShips();
})

const userGameField = document.getElementById("user-game-field");
makeUserGameField(10, 10);
//Radio buttons для выбора размерности корабля
let shipSizeRadios = document.getElementsByName("ship");
let orientationRadios = document.getElementsByName("orientation");
let shipLabels = document.querySelectorAll(".ship-buttons-group p");

//Присваимваем меткам radio button'ов актуальные значения
updateLabels()
//Текущий размер корабля для размещения
let currentShipSize = 4;
//Текущая ориентация 1 - горизонтальная, 2 - вертикальная
let currentOrientation = 1;
//Матрица значений состояния клеток поля и её инициализация
//0-пустая клетка, 1 - клетка с кораблем, 2 - клетка недоступная для выстрела, 3 - клетка с подбитым кораблем
let userFieldMatrix = new Array(10);
for (let i = 0; i < userFieldMatrix.length; i++) {
  userFieldMatrix[i] = new Array(10);
}
for (let i = 0; i < 10; i++) {
  for (let j = 0; j < 10; j++) {
    userFieldMatrix[i][j] = 0;
  }
}

//Навешиваем слушателей для радиокнопок размерности корабля
for (radio of shipSizeRadios) {
  //Переменные цикла надо локализовать, иначе в слушаетеле будет использоваться последнее значение переменной
  let currentRadio = radio;
  radio.addEventListener("change", function () {
    if (currentRadio.checked) {
      if (currentRadio.value == 4) currentShipSize = ShipSizes.BIGGEST;
      if (currentRadio.value == 3) currentShipSize = ShipSizes.BIG;
      if (currentRadio.value == 2) currentShipSize = ShipSizes.MEDIUM;
      if (currentRadio.value == 1) currentShipSize = ShipSizes.SMALL;
    }
  });
}

//Навешиваем слушателей для радиокнопок ориентации корабля
for (radio of orientationRadios) {
  let currentRadio = radio;
  radio.addEventListener("change", function () {
    if (currentRadio.checked) {
      if (currentRadio.value == 1) currentOrientation = Orientations.HORIZONTAL;
      if (currentRadio.value == 2) currentOrientation = Orientations.VERTICAL;
    }
  });
}

//
//Конец блока игровой инициализации
//

//Функция для добавления ячеек игрового поля пользователя
//и добавления слушателя на ячейки
function makeUserGameField(rows, cols) {
  userGameField.style.setProperty("--grid-rows", rows);
  userGameField.style.setProperty("--grid-cols", cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let cell = document.createElement("div");
      let x = i;
      let y = j;
      cell.addEventListener("mouseenter", function () {
        drawCells(getCorrectX(x), getCorrectY(y));
      });
      cell.addEventListener("click", function () {
        putShip(getCorrectX(x), getCorrectY(y));
      });
      cell.addEventListener("mouseleave", function () {
        clearCells(getCorrectX(x), getCorrectY(y));
      });

      userGameField.appendChild(cell).className = "grid-item";
    }
  }
}

//Функция, необходимая для отрисовки допустимых для размещения корабля клеток
//x-строка, y - столбец
function drawCells(x, y) {
  //Горизонтальная ориентация
  if (mapShipSizeToQuantity(currentShipSize) > 0) {
    switch (currentOrientation) {
      case Orientations.HORIZONTAL: {
        if (!checkPlacement(x, y)) {
          for (i = 0; i < currentShipSize; i++) {
            getGameFieldCell(x, y + i).style.background = "red";
          }
        } else {
          for (i = 0; i < currentShipSize; i++) {
            getGameFieldCell(x, y + i).style.background = "green";
          }
        }
        break;
      }
      case Orientations.VERTICAL: {
        if (!checkPlacement(x, y)) {
          for (i = 0; i < currentShipSize; i++) {
            getGameFieldCell(x + i, y).style.background = "red";
          }
        } else {
          for (i = 0; i < currentShipSize; i++) {
            getGameFieldCell(x + i, y).style.background = "green";
          }
        }
        break;
      }
    }
  }
}

//Функция, необходимая для снятия отрисовки клеток размещения корабля
function clearCells(x, y) {
  if (currentOrientation == Orientations.HORIZONTAL) {
    for (i = 0; i < currentShipSize; i++) {
      if (userFieldMatrix[x][y + i] == GameFieldStates.PLACED) {
        getGameFieldCell(x, y + i).style.background = "blue";
      } else getGameFieldCell(x, y + i).style.background = "transparent";
    }
    //Вертикальная ориентация
  } else if (currentOrientation == Orientations.VERTICAL) {
    for (i = 0; i < currentShipSize; i++) {
      if (userFieldMatrix[x + i][y] == GameFieldStates.PLACED) {
        getGameFieldCell(x + i, y).style.background = "blue";
      } else getGameFieldCell(x + i, y).style.background = "transparent";
    }
  }
}

function getCorrectX(x) {
  switch (currentOrientation) {
    case Orientations.HORIZONTAL: {
      return x;
    }
    case Orientations.VERTICAL: {
      if (currentShipSize == ShipSizes.SMALL) {
        return x;
      } else if (x > 10 - currentShipSize) {
        return 10 - currentShipSize;
      } else return x;
    }
  }
}

function getCorrectY(y) {
  switch (currentOrientation) {
    case Orientations.VERTICAL: {
      return y;
    }
    case Orientations.HORIZONTAL: {
      if (currentShipSize == ShipSizes.SMALL) {
        return y;
      } else if (y > 10 - currentShipSize) {
        return 10 - currentShipSize;
      } else return y;
    }
  }
}

//Утилитарная функция для получения ячейки игрового поля
function getGameFieldCell(row, column) {
  return userGameField.children[row * 10 + column];
}

//Функция отвечающая за размещение корабля
function putShip(x, y) {
  if (mapShipSizeToQuantity(currentShipSize) > 0 && checkPlacement(x, y)) {
    switch (currentOrientation) {
      case Orientations.HORIZONTAL: {
        for (let i = 0; i < currentShipSize; i++) {
          userFieldMatrix[x][y + i] = GameFieldStates.PLACED;
          getGameFieldCell(x, y + i).style.background = "blue";
        }
        break;
      }
      case Orientations.VERTICAL: {
        for (let i = 0; i < currentShipSize; i++) {
          userFieldMatrix[x + i][y] = GameFieldStates.PLACED;
          getGameFieldCell(x + i, y).style.background = "blue";
        }
        break;
      }
    }
    console.log(ShipReserve.smallCount);
    decreaseShipCount();
    updateLabels();
  }
}

//Функция необходимая для проверки возможности размещения корабля
function checkPlacement(x, y) {
  switch (currentOrientation) {
    case Orientations.HORIZONTAL: {
      for (let i = 0; i < currentShipSize; i++) {
        if (userFieldMatrix[x][y + i] == GameFieldStates.PLACED) {
          return false;
        }
        if (!validatePosition(x, y + i)) return false;
      }
      return true;
    }
    case Orientations.VERTICAL: {
      for (let i = 0; i < currentShipSize; i++) {
        if (userFieldMatrix[x + i][y] == GameFieldStates.PLACED) {
          return false;
        }
        if (!validatePosition(x + i, y)) return false;
      }
      return true;
    }
  }
}

//Функция, которая проверяет наличие корабля в соседней клетке
function validatePosition(x, y) {
  if (x > 0 && y > 0) {
    if (userFieldMatrix[x - 1][y - 1] == GameFieldStates.PLACED) return false;
  }
  if (x > 0) {
    if (x > 0 && userFieldMatrix[x - 1][y] == GameFieldStates.PLACED)
      return false;
  }
  if (x > 0 && y < 9) {
    if (userFieldMatrix[x - 1][y + 1] == GameFieldStates.PLACED) return false;
  }
  if (y > 0) {
    if (userFieldMatrix[x][y - 1] == GameFieldStates.PLACED) return false;
  }
  if (y < 9) {
    if (userFieldMatrix[x][y + 1] == GameFieldStates.PLACED) return false;
  }
  if (x < 9 && y > 0) {
    if (userFieldMatrix[x + 1][y - 1] == GameFieldStates.PLACED) return false;
  }
  if (x < 9) {
    if (userFieldMatrix[x + 1][y] == GameFieldStates.PLACED) return false;
  }
  if (x < 9 && y < 9) {
    if (userFieldMatrix[x + 1][y + 1] == GameFieldStates.PLACED) return false;
  }
  return true;
}

//Размер корабля, к количеству
function mapShipSizeToQuantity(shipSize) {
  switch (shipSize) {
    case ShipSizes.BIGGEST: {
      return ShipReserve.biggestCount;
    }
    case ShipSizes.BIG: {
      return ShipReserve.bigCount;
    }
    case ShipSizes.MEDIUM: {
      return ShipReserve.mediumCount;
    }
    case ShipSizes.SMALL: {
      return ShipReserve.smallCount;
    }
  }
}

//Уменьшить количество кораблей
function decreaseShipCount() {
  switch (currentShipSize) {
    case ShipSizes.BIGGEST: {
      ShipReserve.biggestCount--;
      break;
    }
    case ShipSizes.BIG: {
      ShipReserve.bigCount--;
      break;
    }
    case ShipSizes.MEDIUM: {
      ShipReserve.mediumCount--;
      break;
    }
    case ShipSizes.SMALL: {
      ShipReserve.smallCount--;
      break;
    }
  }
}

function updateLabels() {
  shipLabels[0].innerHTML = `Четырёхпалубный корабль (осталось: ${ShipReserve.biggestCount})`;
  shipLabels[1].innerHTML = `Трёхпалубный корабль (осталось: ${ShipReserve.bigCount})`;
  shipLabels[2].innerHTML = `Двухпалубный корабль (осталось: ${ShipReserve.mediumCount})`;
  shipLabels[3].innerHTML = `Однопалубный корабль (осталось: ${ShipReserve.smallCount})`;
}

function removeShips(){
  for(i = 0; i < 10; i++){
    for(j = 0; j < 10; j++){
      getGameFieldCell(i, j).style.background = "transparent";
      userFieldMatrix[i][j] = GameFieldStates.EMPTY;
    }
  }
  ShipReserve.biggestCount = 1;
  ShipReserve.bigCount = 2;
  ShipReserve.mediumCount = 3;
  ShipReserve.smallCount = 4;
  updateLabels();
}
