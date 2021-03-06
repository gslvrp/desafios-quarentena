const CellColors = [
	'transparent',
	'blue',
	'green',
	'red',
	'purple',
	'maroon',
	'turquoise',
	'black',
];

// Cell class declaration
class Cell {
	constructor (root, x, y, map) {
    // Create a div element
		const element = document.createElement('div');
    // Add class cell and hidden to the created div element
		element.classList.add('cell', 'hidden');
    // Append div on root element
		root.appendChild(element);

		element.addEventListener('click', () => map.cellLeftClick(this));
		element.addEventListener('contextmenu', event => {
			event.preventDefault();
			map.cellRightClick(this);
			return false;
		});

		this.element = element;
		this.visited = false;
		this.isFlagged = false;
		this.isBomb = false;
		this.value = 0;
		this.x = x;
		this.y = y;
	}

	reveal () {
		if (this.visited) return;
    // Replace class hidden with class revealed on the div element
		this.element.classList.replace('hidden', 'revealed');
		if (this.isBomb) {
			this.element.classList.add('bomb');
		} else {
			this.element.innerText = this.value;
			this.element.style.color = CellColors[this.value] || 'black';
		}
		this.visited = true;
	}

  // *************************************************************************************
  // Here you need to implement toggleFlag function that depending on isFlagged variable
  // will apply or remove the css class 'flag' from the this instantite element
  // and will invert the flag
  // (This function is called inside cellRightClick function that are in the Map class,
  // you dont need to worry with that)
  // *************************************************************************************
  	toggleFlag() {
		if (this.isFlagged) {
			this.isFlagged = false;
			this.element.classList.remove('flag');
		} else {
			this.isFlagged = true;
			this.element.classList.add('flag');
		} 
  	}
}

class Map {
	constructor (root, difficulty, lives, lifeElement) {
		this.cells = [];
		this.lives = lives;
		this.lifeElement = lifeElement;
		this.difficulty = difficulty;
		this.hasMapBeenClickedYet = false;
		this.isGameOver = false;
		this.visibleCells = 0;

		switch (difficulty) {
			case 'easy':
				this.width = 30;
				this.height = 20;
				this.bombCount = 75;
			break;
			case 'medium':
				this.width = 50;
				this.height = 30;
				this.bombCount = 300;
			break;
			case 'hard':
				this.width = 75;
				this.height = 35;
				this.bombCount = 650;
			break;
		}

		for (let row = 0; row < this.height; row ++) {
			this.cells.push([]);
			for (let column = 0; column < this.width; column ++) {
				this.cells[row].push(new Cell(root, column, row, this));
			}
		}

		root.style.gridTemplateColumns = `repeat(${this.width}, max-content)`;
		lifeElement.innerText = `Lives: ${this.lives}`
	}

	// Used to verify if the given position is outside the map bounds
	doesPositionExist (x, y) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
		return true;
	}

	// Iterates over each neighbor of a cell, calling `callback` with a cell as argument.
	forEachNeighbor (cell, callback) {
		for (let newY = cell.y - 1; newY <= cell.y + 1; newY ++) {
			for (let newX = cell.x - 1; newX <= cell.x + 1; newX ++) {
				if (!this.doesPositionExist(newX, newY)) continue;
				if (newX === cell.x && newY === cell.y) continue;
				callback(this.cells[newY][newX]);
			}
		}
	}

	countBombsAroundCell (cell) {
		let bombs = 0;
		this.forEachNeighbor(cell, neighbor => {
			if (neighbor.isBomb) bombs ++;
		});
		return bombs;
	}

	placeAllNumbersInMap () {
		for (let row = 0; row < this.height; row ++){
			for (let column = 0; column < this.width; column ++){
				const cell = this.cells[row][column];
				if (cell.isBomb) continue;
				cell.value = this.countBombsAroundCell(cell);
			}
		}
	}

	// Finds proper positions to bombs
	placeAllBombsInMap (clickX, clickY) {
		const generateBombSomewhere = async () => {
			let x, y;
			do {
				x = Math.floor(Math.random() * this.width);
				y = Math.floor(Math.random() * this.height);
			} while (
				this.cells[y][x].isBomb ||
				(Math.abs(x - clickX) <= 1 && Math.abs(y - clickY) <= 1)
			);

			this.cells[y][x].isBomb = true;
		}

		for (let i = 0; i < this.bombCount; i ++) {
			generateBombSomewhere();
		}
	}

	// Funtion called when player left clicks a cell
	cellLeftClick (clickedCell) {
		if (this.isGameOver) return;
		if (clickedCell.isFlagged) return;
		if (clickedCell.visited) return;
		if (!this.hasMapBeenClickedYet) {
			this.placeAllBombsInMap(clickedCell.x, clickedCell.y);
			this.placeAllNumbersInMap();
			this.hasMapBeenClickedYet = true;
		}
		if (clickedCell.isBomb) {
			clickedCell.element.style.backgroundColor = 'red';
			--this.lives;
			if (this.lives > 0) {
				this.lifeElement.innerText = `Lives: ${this.lives}`
				this.lifeElement.style.color = 'red';
				setTimeout(() => {
					this.lifeElement.style.color = 'black';
				}, 400);
				clickedCell.reveal();
			} else {
				this.lifeElement.innerText = `You lost the game! Redirecting...`
				this.gameOver();
			}
			return;
		}
		clickedCell.reveal();
		this.visibleCells ++;
		if (this.didPlayerWin()) {
			setTimeout(() => alert('Congratulations, you won!'));
			window.history.back();
		}

		// If the cell is empty, open all surrounding cells.
		if (clickedCell.value === 0 && !clickedCell.isFlagged) {
			this.forEachNeighbor(clickedCell, cell => this.cellLeftClick(cell));
		}
	}

	didPlayerWin () {
		return this.visibleCells >= this.width * this.height - this.bombCount;
	}

	cellRightClick (clickedCell) {
		if (this.isGameOver) return;
		if (clickedCell.visited) return;
		clickedCell.toggleFlag();
	}

	gameOver () {
		for (let row = 0; row < this.height; row ++) {
			for (let column = 0; column < this.width; column ++) {
				const cell = this.cells[row][column];
				if (cell.isFlagged) {
					if (cell.isBomb) cell.element.style.backgroundColor = 'green';
					else cell.element.classList.replace('flag', 'cross');
				} else if (cell.isBomb) cell.reveal();
			}
		}
		this.isGameOver = true;
		setTimeout(() => window.history.back(), 4000);
	}
}
// fetch difficulty attribute from index.html
let difficulty = localStorage.getItem("difficulty");

// Instantiate a Map object
new Map(document.getElementById('root'), difficulty, 3, document.getElementById('lives'));