/***************
* DOM ELEMENTS *
***************/

// Main controls.
const valuesInput = document.getElementById("value-input");
const generateButton = document.getElementById("generate-button");
const randomButton = document.getElementById("random-button");
const resetButton = document.getElementById("reset-button");
const pauseButton = document.getElementById("pause-button");

// Animation controls.
const speedRange = document.getElementById("speed-range");
const speedValue = document.getElementById("speed-value");

// Display options.
const indexesCheckbox = document.getElementById("indexes-checkbox");

// Traversal buttons.
const traversalButtons = document.querySelectorAll(".traversal-button");

// Output areas.
const visitedOutput = document.getElementById("visited-output");
const expectedOutput = document.getElementById("expected-output");
const treeInfo = document.getElementById("tree-info");

// Canvas.
const treeCanvas = document.getElementById("tree-canvas");
const treeContext = treeCanvas.getContext("2d");


/************
* CONSTANTS *
************/

// Maximum number of nodes supported by the visualizer.
const MAXIMUM_NODE_COUNT = 15;

// Maximum number of characters displayed inside one node.
const MAXIMUM_NODE_LABEL_LENGTH = 3;

// Initial tree values used on page load and reset.
const DEFAULT_TREE_VALUES = "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O";

// Visual dimensions.
const NODE_RADIUS = 22;
const LEVEL_VERTICAL_SPACING = 86;
const NODE_HORIZONTAL_SPACING = 82;


/********
* STATE *
********/

// Tree data.
let treeValues = [];
let treeNodePositions = [];

// Current animation state.
let currentHighlightedNodeIndex = -1;
let visitedNodeIndexes = [];

// Traversal state.
let currentTraversalOrder = [];
let currentTraversalStep = 0;
let traversalTimeoutId = null;
let selectedTraversalType = "";

// Animation flags.
let traversalIsRunning = false;
let traversalIsPaused = false;

// Canvas logical size.
let canvasLogicalWidth = 0;
let canvasLogicalHeight = 0;


/****************
* DATA BEHAVIOR *
****************/

// Converts the input string into clean node labels.
function parseTreeValues(inputValue) {
  const rawValues = inputValue.split(",");
  const parsedValues = [];

  for (let i = 0; i < rawValues.length; i++) {
    const trimmedValue = rawValues[i].trim();

    if (trimmedValue !== "") {
      const shortenedValue = trimmedValue.substring(0, MAXIMUM_NODE_LABEL_LENGTH);
      parsedValues.push(shortenedValue);
    }
  }

  if (parsedValues.length > MAXIMUM_NODE_COUNT) {
    return parsedValues.slice(0, MAXIMUM_NODE_COUNT);
  }

  return parsedValues;
}

// Creates a random list of node labels.
function generateRandomTreeValues() {
  const availableCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randomValues = [];
  const randomNodeCount = getRandomInteger(7, MAXIMUM_NODE_COUNT);

  for (let i = 0; i < randomNodeCount; i++) {
    const randomCharacterIndex = getRandomInteger(0, availableCharacters.length - 1);
    const randomCharacter = availableCharacters[randomCharacterIndex];

    randomValues.push(randomCharacter);
  }

  return randomValues;
}

// Returns a random integer between min and max, both included.
function getRandomInteger(minimumValue, maximumValue) {
  const range = maximumValue - minimumValue + 1;
  const randomValue = Math.floor(Math.random() * range) + minimumValue;

  return randomValue;
}


/***************************
* TREE GENERATION BEHAVIOR *
***************************/

// Generates a complete binary tree from the input field.
function generateTree() {
  stopTraversal();

  const parsedValues = parseTreeValues(valuesInput.value);

  if (parsedValues.length === 0) {
    alert("Please enter valid data.");
    return;
  }

  treeValues = parsedValues;
  treeNodePositions = [];

  currentHighlightedNodeIndex = -1;
  visitedNodeIndexes = [];

  currentTraversalOrder = [];
  currentTraversalStep = 0;
  selectedTraversalType = "";

  resizeTreeCanvas();
  calculateTreeNodePositions();
  drawTree();
  updateInterface();
}

// Generates a tree from random values.
function generateRandomTree() {
  const randomValues = generateRandomTreeValues();

  valuesInput.value = randomValues.join(",");
  generateTree();
}

// Resets the visualizer to the initial default tree.
function resetVisualization() {
  stopTraversal();

  valuesInput.value = DEFAULT_TREE_VALUES;

  treeValues = parseTreeValues(DEFAULT_TREE_VALUES);
  treeNodePositions = [];

  currentHighlightedNodeIndex = -1;
  visitedNodeIndexes = [];

  currentTraversalOrder = [];
  currentTraversalStep = 0;
  selectedTraversalType = "";

  resizeTreeCanvas();
  calculateTreeNodePositions();
  drawTree();
  updateInterface();
}


/*************************
* TREE POSITION BEHAVIOR *
*************************/

// Calculates the x/y position of each node.
function calculateTreeNodePositions() {
  treeNodePositions = [];

  if (treeValues.length === 0) {
    return;
  }

  const deepestLevel = Math.floor(Math.log2(treeValues.length));
  const treeWidth = Math.pow(2, deepestLevel) * NODE_HORIZONTAL_SPACING;
  const treeHeight = deepestLevel * LEVEL_VERTICAL_SPACING + NODE_RADIUS * 2;

  const startX = (canvasLogicalWidth - treeWidth) / 2;
  const startY = (canvasLogicalHeight - treeHeight) / 2 + NODE_RADIUS;

  for (let nodeIndex = 0; nodeIndex < treeValues.length; nodeIndex++) {
    const nodeLevel = Math.floor(Math.log2(nodeIndex + 1));
    const firstNodeIndexInLevel = Math.pow(2, nodeLevel) - 1;
    const nodeIndexInLevel = nodeIndex - firstNodeIndexInLevel;
    const nodeCountInLevel = Math.pow(2, nodeLevel);
    const levelWidth = treeWidth / nodeCountInLevel;

    const nodeX = startX + levelWidth * nodeIndexInLevel + levelWidth / 2;
    const nodeY = startY + nodeLevel * LEVEL_VERTICAL_SPACING;

    treeNodePositions.push({
      x: nodeX,
      y: nodeY
    });
  }
}


/***********************
* CANVAS SIZE BEHAVIOR *
***********************/

// Resizes the canvas according to its parent container.
function resizeTreeCanvas() {
  const canvasWrapper = treeCanvas.parentElement;
  const pixelRatio = window.devicePixelRatio || 1;

  canvasLogicalWidth = canvasWrapper.clientWidth;
  canvasLogicalHeight = canvasWrapper.clientHeight;

  treeCanvas.width = Math.floor(canvasLogicalWidth * pixelRatio);
  treeCanvas.height = Math.floor(canvasLogicalHeight * pixelRatio);

  treeCanvas.style.width = canvasLogicalWidth + "px";
  treeCanvas.style.height = canvasLogicalHeight + "px";

  treeContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}


/*******************
* DRAWING BEHAVIOR *
*******************/

// Redraws the entire tree.
function drawTree() {
  treeContext.clearRect(0, 0, canvasLogicalWidth, canvasLogicalHeight);

  if (treeValues.length === 0) {
    drawEmptyTreeMessage();
    return;
  }

  drawTreeEdges();
  drawTreeNodes();
}

// Displays a message when no tree exists.
function drawEmptyTreeMessage() {
  treeContext.save();

  treeContext.fillStyle = "#64748b";
  treeContext.font = "600 16px sans-serif";
  treeContext.textAlign = "center";
  treeContext.textBaseline = "middle";
  treeContext.fillText("Generate a tree to start.", canvasLogicalWidth / 2, canvasLogicalHeight / 2);

  treeContext.restore();
}

// Draws the lines between parents and children.
function drawTreeEdges() {
  treeContext.save();

  treeContext.strokeStyle = "#94a3b8";
  treeContext.lineWidth = 2;

  for (let nodeIndex = 1; nodeIndex < treeValues.length; nodeIndex++) {
    const parentNodeIndex = Math.floor((nodeIndex - 1) / 2);
    const parentPosition = treeNodePositions[parentNodeIndex];
    const childPosition = treeNodePositions[nodeIndex];

    treeContext.beginPath();
    treeContext.moveTo(parentPosition.x, parentPosition.y + NODE_RADIUS);
    treeContext.lineTo(childPosition.x, childPosition.y - NODE_RADIUS);
    treeContext.stroke();
  }

  treeContext.restore();
}

// Draws every node.
function drawTreeNodes() {
  for (let nodeIndex = 0; nodeIndex < treeValues.length; nodeIndex++) {
    drawTreeNode(nodeIndex);
  }
}

// Draws one node and applies its visual state.
function drawTreeNode(nodeIndex) {
  const nodePosition = treeNodePositions[nodeIndex];

  let nodeFillColor = "#ffffff";
  let nodeBorderColor = "#334155";
  let nodeTextColor = "#0f172a";

  if (visitedNodeIndexes.includes(nodeIndex)) {
    nodeFillColor = "#dbeafe";
    nodeBorderColor = "#2563eb";
    nodeTextColor = "#1e3a8a";
  }

  if (nodeIndex === currentHighlightedNodeIndex) {
    nodeFillColor = "#facc15";
    nodeBorderColor = "#ca8a04";
    nodeTextColor = "#713f12";
  }

  treeContext.save();

  treeContext.beginPath();
  treeContext.arc(nodePosition.x, nodePosition.y, NODE_RADIUS, 0, Math.PI * 2);
  treeContext.fillStyle = nodeFillColor;
  treeContext.fill();

  treeContext.lineWidth = 2;
  treeContext.strokeStyle = nodeBorderColor;
  treeContext.stroke();

  treeContext.fillStyle = nodeTextColor;
  treeContext.textAlign = "center";
  treeContext.textBaseline = "middle";

  if (indexesCheckbox.checked) {
    treeContext.font = "700 12px sans-serif";
    treeContext.fillText(treeValues[nodeIndex], nodePosition.x, nodePosition.y - 5);

    treeContext.font = "600 9px sans-serif";
    treeContext.fillText("[" + nodeIndex + "]", nodePosition.x, nodePosition.y + 9);
  } else {
    treeContext.font = "800 14px sans-serif";
    treeContext.fillText(treeValues[nodeIndex], nodePosition.x, nodePosition.y);
  }

  treeContext.restore();
}


/***********************
* TRAVERSAL ALGORITHMS *
***********************/

// Builds a preorder traversal: root, left, right.
function buildPreorderTraversal(nodeIndex, traversalOrder) {
  if (nodeIndex >= treeValues.length) {
    return;
  }

  traversalOrder.push(nodeIndex);
  buildPreorderTraversal(nodeIndex * 2 + 1, traversalOrder);
  buildPreorderTraversal(nodeIndex * 2 + 2, traversalOrder);
}

// Builds an inorder traversal: left, root, right.
function buildInorderTraversal(nodeIndex, traversalOrder) {
  if (nodeIndex >= treeValues.length) {
    return;
  }

  buildInorderTraversal(nodeIndex * 2 + 1, traversalOrder);
  traversalOrder.push(nodeIndex);
  buildInorderTraversal(nodeIndex * 2 + 2, traversalOrder);
}

// Builds a postorder traversal: left, right, root.
function buildPostorderTraversal(nodeIndex, traversalOrder) {
  if (nodeIndex >= treeValues.length) {
    return;
  }

  buildPostorderTraversal(nodeIndex * 2 + 1, traversalOrder);
  buildPostorderTraversal(nodeIndex * 2 + 2, traversalOrder);
  traversalOrder.push(nodeIndex);
}

// Builds a level-order traversal: nodes are visited by array order.
function buildLevelorderTraversal(traversalOrder) {
  for (let nodeIndex = 0; nodeIndex < treeValues.length; nodeIndex++) {
    traversalOrder.push(nodeIndex);
  }
}

// Returns the traversal order matching the selected traversal type.
function buildTraversalOrder(traversalType) {
  const traversalOrder = [];

  if (traversalType === "preorder") {
    buildPreorderTraversal(0, traversalOrder);
  }

  if (traversalType === "inorder") {
    buildInorderTraversal(0, traversalOrder);
  }

  if (traversalType === "postorder") {
    buildPostorderTraversal(0, traversalOrder);
  }

  if (traversalType === "levelorder") {
    buildLevelorderTraversal(traversalOrder);
  }

  return traversalOrder;
}


/*********************
* ANIMATION BEHAVIOR *
*********************/

// Starts a traversal animation.
function startTraversal(traversalType) {
  if (treeValues.length === 0) {
    alert("Please generate a tree first.");
    return;
  }

  stopTraversal();

  selectedTraversalType = traversalType;
  currentTraversalOrder = buildTraversalOrder(traversalType);
  currentTraversalStep = 0;

  visitedNodeIndexes = [];
  currentHighlightedNodeIndex = -1;

  traversalIsRunning = true;
  traversalIsPaused = false;

  setControlsEnabledDuringTraversal(false);
  setActiveTraversalButton(traversalType);

  pauseButton.disabled = false;
  pauseButton.textContent = "Pause";

  updateInterface();
  runNextTraversalStep();
}

// Runs one animation step, then schedules the next one.
function runNextTraversalStep() {
  if (!traversalIsRunning) {
    return;
  }

  if (traversalIsPaused) {
    return;
  }

  if (currentTraversalStep >= currentTraversalOrder.length) {
    finishTraversal();
    return;
  }

  const nodeIndex = currentTraversalOrder[currentTraversalStep];

  currentHighlightedNodeIndex = nodeIndex;

  if (!visitedNodeIndexes.includes(nodeIndex)) {
    visitedNodeIndexes.push(nodeIndex);
  }

  currentTraversalStep = currentTraversalStep + 1;

  drawTree();
  updateInterface();

  traversalTimeoutId = setTimeout(function () {
    runNextTraversalStep();
  }, Number(speedRange.value));
}

// Ends the traversal and clears the current highlight.
function finishTraversal() {
  currentHighlightedNodeIndex = -1;

  traversalIsRunning = false;
  traversalIsPaused = false;

  setControlsEnabledDuringTraversal(true);

  pauseButton.disabled = true;
  pauseButton.textContent = "Pause";

  drawTree();
  updateInterface();
}

// Toggles between pause and resume during traversal.
function toggleTraversalPause() {
  if (!traversalIsRunning) {
    return;
  }

  if (traversalIsPaused) {
    traversalIsPaused = false;
    pauseButton.textContent = "Pause";

    updateInterface();
    runNextTraversalStep();
    return;
  }

  traversalIsPaused = true;
  pauseButton.textContent = "Resume";

  if (traversalTimeoutId !== null) {
    clearTimeout(traversalTimeoutId);
    traversalTimeoutId = null;
  }

  updateInterface();
}

// Stops any current traversal and resets animation controls.
function stopTraversal() {
  if (traversalTimeoutId !== null) {
    clearTimeout(traversalTimeoutId);
    traversalTimeoutId = null;
  }

  traversalIsRunning = false;
  traversalIsPaused = false;

  setControlsEnabledDuringTraversal(true);
  clearActiveTraversalButtons();

  pauseButton.disabled = true;
  pauseButton.textContent = "Pause";
}


/*********************
* INTERFACE BEHAVIOR *
*********************/

// Updates every text output in the interface.
function updateInterface() {
  updateSpeedLabel();
  updateVisitedOutput();
  updateExpectedOutput();
  updateTreeInfo();
}

// Updates the visible animation speed label.
function updateSpeedLabel() {
  speedValue.textContent = speedRange.value + " ms";
}

// Updates the tree information text.
function updateTreeInfo() {
  const nodeCount = treeValues.length;

  if (nodeCount <= 1) {
    treeInfo.textContent = nodeCount + " node";
    return;
  }

  treeInfo.textContent = nodeCount + " nodes";
}

// Updates the list of already visited nodes.
function updateVisitedOutput() {
  visitedOutput.innerHTML = "";

  if (visitedNodeIndexes.length === 0) {
    const emptyMessage = document.createElement("span");
    emptyMessage.className = "text-sm text-slate-500";
    emptyMessage.textContent = "No node visited yet.";

    visitedOutput.appendChild(emptyMessage);
    return;
  }

  for (let i = 0; i < visitedNodeIndexes.length; i++) {
    const nodeIndex = visitedNodeIndexes[i];
    const nodeChip = createNodeChip(nodeIndex);

    if (nodeIndex === currentHighlightedNodeIndex) {
      nodeChip.classList.add("border-yellow-500", "bg-yellow-100", "text-yellow-900");
    }

    visitedOutput.appendChild(nodeChip);
  }
}

// Updates the expected traversal order.
function updateExpectedOutput() {
  expectedOutput.innerHTML = "";

  if (currentTraversalOrder.length === 0) {
    const emptyMessage = document.createElement("span");
    emptyMessage.className = "text-sm text-slate-500";
    emptyMessage.textContent = "No traversal selected.";

    expectedOutput.appendChild(emptyMessage);
    return;
  }

  for (let i = 0; i < currentTraversalOrder.length; i++) {
    const nodeIndex = currentTraversalOrder[i];
    const nodeChip = createNodeChip(nodeIndex);

    expectedOutput.appendChild(nodeChip);
  }
}

// Creates a small visual chip for a node label.
function createNodeChip(nodeIndex) {
  const nodeChip = document.createElement("span");

  nodeChip.className = "inline-flex min-h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700";
  nodeChip.textContent = getNodeDisplayLabel(nodeIndex);

  return nodeChip;
}

// Returns the displayed label for one node.
function getNodeDisplayLabel(nodeIndex) {
  if (indexesCheckbox.checked) {
    return treeValues[nodeIndex] + "[" + nodeIndex + "]";
  }

  return treeValues[nodeIndex];
}


/********************
* CONTROLS BEHAVIOR *
********************/

// Enables or disables controls while a traversal is running.
function setControlsEnabledDuringTraversal(enabled) {
  generateButton.disabled = !enabled;
  randomButton.disabled = !enabled;

  for (let i = 0; i < traversalButtons.length; i++) {
    traversalButtons[i].disabled = !enabled;
  }
}

// Visually marks the selected traversal button.
function setActiveTraversalButton(traversalType) {
  for (let i = 0; i < traversalButtons.length; i++) {
    const traversalButton = traversalButtons[i];

    if (traversalButton.dataset.traversal === traversalType) {
      traversalButton.classList.add("active");
    } else {
      traversalButton.classList.remove("active");
    }
  }
}

// Removes the active state from all traversal buttons.
function clearActiveTraversalButtons() {
  for (let i = 0; i < traversalButtons.length; i++) {
    traversalButtons[i].classList.remove("active");
  }
}


/******************
* EVENTS BEHAVIOR *
******************/

// Regenerates the tree from the input field.
generateButton.addEventListener("click", function () {
  generateTree();
});

// Generates a random tree.
randomButton.addEventListener("click", function () {
  generateRandomTree();
});

// Restores the default tree.
resetButton.addEventListener("click", function () {
  resetVisualization();
});

// Pauses or resumes the current traversal animation.
pauseButton.addEventListener("click", function () {
  toggleTraversalPause();
});

// Updates the speed label when the range input changes.
speedRange.addEventListener("input", function () {
  updateSpeedLabel();
});

// Redraws the tree and labels when indexes are shown or hidden.
indexesCheckbox.addEventListener("change", function () {
  drawTree();
  updateInterface();
});

// Starts the selected traversal.
for (let i = 0; i < traversalButtons.length; i++) {
  traversalButtons[i].addEventListener("click", function () {
    const traversalType = traversalButtons[i].dataset.traversal;
    startTraversal(traversalType);
  });
}

// Keeps the canvas aligned with the layout when the window size changes.
window.addEventListener("resize", function () {
  resizeTreeCanvas();
  calculateTreeNodePositions();
  drawTree();
});


/*****************
* INITIALIZATION *
*****************/

generateTree();