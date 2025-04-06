/***********************
* VARIABLE DECLARATION *
***********************/

let data = [];
let positions = [];
let canvas;
let context;

// Radius for each node circle.
const nodeRadius = 20;
// Vertical space between levels.
const levelSpacing = 100;
// Top margin .
const marginTop = 50;

// Flag to indicate if a traversal is in progress.
let traversalInProgress = false;

/******************
* TREE GENERATION *
******************/

function generateTree() {
	const input = document.getElementById("data-input").value;

	// Split input by commas.
	const items = input.split(",");

	// Trim each item, filter out empty items, and restrict each node to a maximum of 2 characters.
	let processedItems = [];
	for (let i = 0; i < items.length; i++) {
		const trimmed = items[i].trim();
		if (trimmed !== "") {
			processedItems.push(trimmed.substring(0, 2));
		}
	}

	// Limit to 15 nodes.
	if (processedItems.length > 15) {
		processedItems = processedItems.slice(0, 15);
	}

	data = processedItems;

	if (data.length === 0) {
		alert("Please enter valid data.");
		return;
	}

	canvas = document.getElementById("tree-canvas");
	context = canvas.getContext("2d");

	// Adjust canvas width if the lowest level is overcrowded.
	const maxLevel = Math.floor(Math.log2(data.length));
	const nodesInMaxLevel = Math.pow(2, maxLevel);
	const minSpacing = 2 * nodeRadius + 20;
	const requiredWidth = (nodesInMaxLevel + 1) * minSpacing;

	if (canvas.width < requiredWidth) {
		canvas.width = requiredWidth;
	}

	// Calculate positions for each node.
	positions = [];

	for (let i = 0; i < data.length; i++) {
		const level = Math.floor(Math.log2(i + 1));
		const indexInLevel = i - (Math.pow(2, level) - 1);
		const nodesInLevel = Math.pow(2, level);
		const spacingX = canvas.width / (nodesInLevel + 1);
		const x = spacingX * (indexInLevel + 1);
		const y = marginTop + level * levelSpacing;

		positions.push({ x: x, y: y });
	}

	// Draw the tree initially without any highlights.
	drawTree(-1);
}

function drawTree(highlightIndex) {
	// Clear the canvas.
	context.clearRect(0, 0, canvas.width, canvas.height);

	// Draw lines connecting each node to its parent.
	context.strokeStyle = "#000000";
	context.lineWidth = 2;

	for (let i = 1; i < data.length; i++) {
		const parentIndex = Math.floor((i - 1) / 2);
		context.beginPath();
		context.moveTo(positions[parentIndex].x, positions[parentIndex].y + nodeRadius);
		context.lineTo(positions[i].x, positions[i].y - nodeRadius);
		context.stroke();
	}

	// Draw circles and text for each node.
	context.font = "15px sans-serif";
	context.textAlign = "center";
	context.textBaseline = "middle";

	for (let i = 0; i < data.length; i++) {
		const pos = positions[i];
		context.beginPath();
		context.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);

		if (i === highlightIndex) {
			// Yellow highlight.
			context.fillStyle = "#ff0";
		} else {
			// Default white fill.
			context.fillStyle = "#fff";
		}

		context.fill();
		context.strokeStyle = "#000";
		context.stroke();

		context.fillStyle = "#000";
		context.fillText(data[i], pos.x, pos.y);
	}
}

/*************** *
* TREE TRAVERSAL *
*****************/

// Pre order traversal.
function preOrder(index, order) {
	if (index >= data.length) {
		return;
	}

	order.push(index);
	preOrder(2 * index + 1, order);
	preOrder(2 * index + 2, order);
}

// In order traversal.
function inOrder(index, order) {
	if (index >= data.length) {
		return;
	}

	inOrder(2 * index + 1, order);
	order.push(index);
	inOrder(2 * index + 2, order);
}

// Post order traversal.
function postOrder(index, order) {
	if (index >= data.length) {
		return;
	}

	postOrder(2 * index + 1, order);
	postOrder(2 * index + 2, order);
	order.push(index);
}

// Level order traversal.
function levelOrder(order) {
	for (let i = 0; i < data.length; i++) {
		order.push(i);
	}
}

/************************
* BUTTON STATE BEHAVIOR *
************************/

function setTraversalButtonsState(enabled) {
	const buttons = document.querySelectorAll(".traversal-btn");

	for (let i = 0; i < buttons.length; i++) {
		buttons[i].disabled = !enabled;
	}
}

/**********************
* TRAVERSAL ANIMATION *
**********************/

function animateTraversal(order) {
	let i = 0;
	const interval = setInterval(function () {

		// Redraw the tree without any highlight.
		drawTree(-1);

		// Highlight the current node if available.
		if (i < order.length) {
			drawTree(order[i]);
			i = i + 1;
		} else {
			clearInterval(interval);
			// After a short pause, clear highlight and re-enable buttons.
			setTimeout(function () {
				drawTree(-1);
				traversalInProgress = false;
				setTraversalButtonsState(true);
			}, 500);
		}
	}, 1000);
}

/****************************
* START TRAVERSAL ANIMATION *
****************************/

function startTraversal(type) {
	if (data.length === 0) {
		alert("Please generate the tree first!");
		return;
	}

	// Prevent starting a new traversal if one is already in progress.
	if (traversalInProgress) {
		return;
	}

	traversalInProgress = true;
	// Disable traversal buttons.
	setTraversalButtonsState(false);

	let order = [];
	if (type === "preorder") {
		preOrder(0, order);
	} else if (type === "inorder") {
		inOrder(0, order);
	} else if (type === "postorder") {
		postOrder(0, order);
	} else if (type === "levelorder") {
		levelOrder(order);
	}

	animateTraversal(order);
}

/*****************
* INITIALIZATION *
*****************/

generateTree();
