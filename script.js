/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearSelectedProductsBtn = document.getElementById(
  "clearSelectedProducts",
);

const SELECTED_PRODUCTS_STORAGE_KEY = "selectedProductIds";
const DEFAULT_CLOUDFLARE_WORKER_URL =
  "https://long-boat-aeeb.hgalvan2025.workers.dev/";

/* Check configuration sources in order: runtime config, meta tag, then fallback */
function resolveConfiguredWorkerUrl() {
  const runtimeUrl = window.CLOUDFLARE_WORKER_URL;

  if (typeof runtimeUrl === "string" && runtimeUrl.trim()) {
    return runtimeUrl.trim();
  }

  const workerMeta = document.querySelector(
    'meta[name="cloudflare-worker-url"]',
  );
  const metaUrl = workerMeta?.content?.trim();

  if (metaUrl) {
    return metaUrl;
  }

  return DEFAULT_CLOUDFLARE_WORKER_URL;
}

/* Build a safe Worker URL (adds https:// if missing) */
function getWorkerUrl() {
  const configuredUrl = resolveConfiguredWorkerUrl();

  if (!configuredUrl) {
    return "";
  }

  if (
    configuredUrl.startsWith("http://") ||
    configuredUrl.startsWith("https://")
  ) {
    return configuredUrl;
  }

  return `https://${configuredUrl}`;
}

/* Keep selected product IDs and product details in memory while user browses categories */
const selectedProductIds = new Set();
const selectedProductsMap = new Map();
let allProducts = [];

/* Save chat history so follow-up questions include prior context */
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a beginner-friendly beauty advisor. Keep responses focused on the generated routine and beauty topics: skincare, haircare, makeup, fragrance, and related self-care. If a question is outside these topics, politely decline and guide the user back. Reference prior conversation for follow-up context.",
  },
];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found in this category
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${
      selectedProductIds.has(product.id) ? "selected" : ""
    }" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button
          type="button"
          class="description-toggle-btn"
          aria-expanded="false"
          aria-controls="product-description-${product.id}"
        >
          Show Description
        </button>
        <div
          id="product-description-${product.id}"
          class="product-description"
          hidden
        >
          ${product.description}
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

/* Show selected products above the Generate Routine button */
function renderSelectedProductsList() {
  const selectedProducts = Array.from(selectedProductsMap.values());

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="selected-placeholder">No products selected yet.</p>';
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-pill" data-selected-id="${product.id}">
        <span>${product.name}</span>
        <button type="button" class="remove-selected-btn" data-remove-id="${product.id}" aria-label="Remove ${product.name}">
          &times;
        </button>
      </div>
    `,
    )
    .join("");
}

function saveSelectedProductsToStorage() {
  const selectedIds = Array.from(selectedProductIds);
  localStorage.setItem(
    SELECTED_PRODUCTS_STORAGE_KEY,
    JSON.stringify(selectedIds),
  );
}

function removeSelectedProductById(productId) {
  selectedProductIds.delete(productId);
  selectedProductsMap.delete(productId);

  const card = productsContainer.querySelector(
    `[data-product-id="${productId}"]`,
  );
  if (card) {
    card.classList.remove("selected");
  }

  saveSelectedProductsToStorage();
  renderSelectedProductsList();
}

function clearAllSelectedProducts() {
  selectedProductIds.clear();
  selectedProductsMap.clear();
  saveSelectedProductsToStorage();
  renderSelectedProductsList();

  document.querySelectorAll(".product-card.selected").forEach((card) => {
    card.classList.remove("selected");
  });
}

function restoreSelectedProductsFromStorage() {
  const savedRaw = localStorage.getItem(SELECTED_PRODUCTS_STORAGE_KEY);

  if (!savedRaw) {
    return;
  }

  try {
    const savedIds = JSON.parse(savedRaw);

    if (!Array.isArray(savedIds)) {
      return;
    }

    savedIds.forEach((idValue) => {
      const productId = Number(idValue);
      const product = allProducts.find((item) => item.id === productId);

      if (!product) {
        return;
      }

      selectedProductIds.add(productId);
      selectedProductsMap.set(productId, product);
    });
  } catch {
    localStorage.removeItem(SELECTED_PRODUCTS_STORAGE_KEY);
  }
}

/* Add one message bubble to the chat window */
function addChatMessage(role, message) {
  const messageBox = document.createElement("div");
  messageBox.className = `chat-message ${role}`;
  messageBox.textContent = message;
  chatWindow.appendChild(messageBox);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Reusable helper to call OpenAI with a messages array */
async function requestOpenAI(messages) {
  const workerUrl = getWorkerUrl();

  if (!workerUrl) {
    throw new Error(
      "Missing Worker URL. Add window.CLOUDFLARE_WORKER_URL in secrets.js or update DEFAULT_CLOUDFLARE_WORKER_URL in script.js.",
    );
  }

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
    }),
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Worker returned invalid JSON. Check your Worker code.");
  }

  if (!response.ok) {
    const apiError = data.error?.message || "OpenAI API request failed.";
    throw new Error(apiError);
  }

  const content =
    data.choices?.[0]?.message?.content ??
    data.output_text ??
    data.message?.content;

  if (!content) {
    const unexpectedMessage =
      data.error?.message || "Unexpected response from the AI service.";
    throw new Error(unexpectedMessage);
  }

  return content;
}

/* Handle card click: select if not selected, unselect if already selected */
productsContainer.addEventListener("click", (event) => {
  const descriptionToggleBtn = event.target.closest(".description-toggle-btn");

  if (descriptionToggleBtn) {
    const isExpanded =
      descriptionToggleBtn.getAttribute("aria-expanded") === "true";
    const descriptionId = descriptionToggleBtn.getAttribute("aria-controls");
    const descriptionPanel = descriptionId
      ? document.getElementById(descriptionId)
      : null;

    if (!descriptionPanel) {
      return;
    }

    descriptionToggleBtn.setAttribute("aria-expanded", String(!isExpanded));
    descriptionToggleBtn.textContent = isExpanded
      ? "Show Description"
      : "Hide Description";
    descriptionPanel.hidden = isExpanded;
    return;
  }

  const clickedCard = event.target.closest(".product-card");

  if (!clickedCard) {
    return;
  }

  const productId = Number(clickedCard.dataset.productId);
  const product = allProducts.find((item) => item.id === productId);

  if (!product) {
    return;
  }

  if (selectedProductIds.has(productId)) {
    removeSelectedProductById(productId);
  } else {
    selectedProductIds.add(productId);
    selectedProductsMap.set(productId, product);
    clickedCard.classList.add("selected");
    saveSelectedProductsToStorage();
    renderSelectedProductsList();
  }
});

/* Remove one selected product from the selected list */
selectedProductsList.addEventListener("click", (event) => {
  const removeBtn = event.target.closest(".remove-selected-btn");

  if (!removeBtn) {
    return;
  }

  const productId = Number(removeBtn.dataset.removeId);
  removeSelectedProductById(productId);
});

/* Clear all selected products */
clearSelectedProductsBtn.addEventListener("click", () => {
  clearAllSelectedProducts();
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }

  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

/* Build prompt with selected products and request a routine from OpenAI */
generateRoutineBtn.addEventListener("click", async () => {
  const selectedProducts = Array.from(selectedProductsMap.values());

  if (selectedProducts.length === 0) {
    addChatMessage("assistant", "Please select at least one product first.");
    return;
  }

  const selectedProductsPayload = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  const routinePrompt = `Create a personalized skincare or beauty routine using only the products in this JSON array:\n${JSON.stringify(
    selectedProductsPayload,
    null,
    2,
  )}\n\nFormat the answer as:\n1) Morning\n2) Evening\n3) Tips`;

  /* Reset chat context each time a new routine is generated */
  conversationHistory = [conversationHistory[0]];
  conversationHistory.push({
    role: "user",
    content: routinePrompt,
  });

  addChatMessage(
    "user",
    "Generate a personalized routine from my selected products.",
  );
  addChatMessage("assistant", "Building your routine...");

  try {
    const routineText = await requestOpenAI(conversationHistory);
    conversationHistory.push({ role: "assistant", content: routineText });

    chatWindow.innerHTML = "";
    addChatMessage("assistant", routineText);
  } catch (error) {
    addChatMessage("assistant", `Error: ${error.message}`);
  }
});

/* Handle follow-up questions by sending full prior conversation history */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userInput = document.getElementById("userInput");
  const userMessage = userInput.value.trim();

  if (!userMessage) {
    return;
  }

  addChatMessage("user", userMessage);
  userInput.value = "";

  conversationHistory.push({ role: "user", content: userMessage });

  try {
    const assistantMessage = await requestOpenAI(conversationHistory);
    conversationHistory.push({ role: "assistant", content: assistantMessage });
    addChatMessage("assistant", assistantMessage);
  } catch (error) {
    addChatMessage("assistant", `Error: ${error.message}`);
  }
});

/* Load products once so selection can work across category changes */
(async function initializeApp() {
  try {
    allProducts = await loadProducts();
    restoreSelectedProductsFromStorage();
    renderSelectedProductsList();
  } catch (error) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Could not load products. Please refresh and try again.
      </div>
    `;
    addChatMessage("assistant", `Error: ${error.message}`);
  }
})();
