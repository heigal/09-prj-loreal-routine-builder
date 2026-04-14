/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearchInput = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearAllBtn = document.getElementById("clearAllBtn");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

/* App state */
let selectedProducts = [];
let conversationHistory = [];
let allProducts = [];

/* Storage key for localStorage */
const SELECTED_PRODUCTS_KEY = "loreal_selected_products";

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load selected products from localStorage on page load */
function loadSelectedProductsFromStorage() {
  const stored = localStorage.getItem(SELECTED_PRODUCTS_KEY);
  if (!stored) {
    return;
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      selectedProducts = parsed;
      updateSelectedProductsList();
    }
  } catch (error) {
    console.error("Could not parse stored selected products:", error);
  }
}

/* Save selected products to localStorage */
function saveSelectedProductsToStorage() {
  localStorage.setItem(SELECTED_PRODUCTS_KEY, JSON.stringify(selectedProducts));
}

/* Clear all selected products */
function clearAllSelectedProducts() {
  selectedProducts = [];
  updateSelectedProductsList();
  saveSelectedProductsToStorage();

  const allCards = productsContainer.querySelectorAll(".product-card.selected");
  allCards.forEach((card) => {
    card.classList.remove("selected");
  });
}

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Apply category + keyword filters together */
function applyProductFilters() {
  const selectedCategory = categoryFilter.value;
  const keyword = productSearchInput.value.trim().toLowerCase();

  const filteredProducts = allProducts.filter((product) => {
    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;

    const searchableText =
      `${product.name} ${product.brand} ${product.category} ${product.description}`.toLowerCase();
    const matchesKeyword = !keyword || searchableText.includes(keyword);

    return matchesCategory && matchesKeyword;
  });

  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No matching products found.
      </div>
    `;
    return;
  }

  displayProducts(filteredProducts);
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some(
        (p) => String(p.id) === String(product.id),
      );
      const selectedClass = isSelected ? " selected" : "";

      return `
        <div
          class="product-card${selectedClass}"
          data-product-id="${product.id}"
          data-product-name="${product.name}"
          data-product-brand="${product.brand}"
          data-product-category="${product.category}"
          data-product-description="${product.description.replace(/"/g, "&quot;")}"
        >
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
            <button class="description-btn" type="button" aria-label="Show product description">
              <i class="fa-solid fa-circle-info"></i> Details
            </button>
          </div>
          <div class="product-description" hidden>
            <p>${product.description}</p>
          </div>
        </div>
      `;
    })
    .join("");

  const productCards = productsContainer.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", handleProductClick);
  });

  const descriptionButtons =
    productsContainer.querySelectorAll(".description-btn");
  descriptionButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = button.closest(".product-card");
      const description = card.querySelector(".product-description");
      const isHidden = description.hasAttribute("hidden");

      if (isHidden) {
        description.removeAttribute("hidden");
        button.classList.add("active");
      } else {
        description.setAttribute("hidden", "");
        button.classList.remove("active");
      }
    });
  });
}

/* Handle product card clicks for selection */
function handleProductClick(e) {
  const card = e.currentTarget;

  const product = {
    id: card.getAttribute("data-product-id"),
    name: card.getAttribute("data-product-name"),
    brand: card.getAttribute("data-product-brand"),
    category: card.getAttribute("data-product-category"),
    description: card.getAttribute("data-product-description"),
  };

  const isSelected = selectedProducts.some(
    (p) => String(p.id) === String(product.id),
  );

  if (isSelected) {
    selectedProducts = selectedProducts.filter(
      (p) => String(p.id) !== String(product.id),
    );
    card.classList.remove("selected");
  } else {
    selectedProducts.push(product);
    card.classList.add("selected");
  }

  updateSelectedProductsList();
  saveSelectedProductsToStorage();
}

/* Update the visual list of selected products */
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p style="color: #999;">No products selected yet</p>';
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product-tag">
          <span>${product.name}</span>
          <button type="button" class="remove-btn" data-product-id="${product.id}" aria-label="Remove ${product.name}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `,
    )
    .join("");

  const removeButtons = selectedProductsList.querySelectorAll(".remove-btn");
  removeButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const productId = button.getAttribute("data-product-id");
      selectedProducts = selectedProducts.filter(
        (p) => String(p.id) !== String(productId),
      );

      const card = productsContainer.querySelector(
        `.product-card[data-product-id="${productId}"]`,
      );
      if (card) {
        card.classList.remove("selected");
      }

      updateSelectedProductsList();
      saveSelectedProductsToStorage();
    });
  });
}

/* Helper: call OpenAI API with a messages array */
async function callOpenAI(messages) {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
    }),
  });

  const data = await response.json();

  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }

  throw new Error("Unable to get a valid response from OpenAI API.");
}

/* Generate personalized routine using selected products */
async function generateRoutine() {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "Please select products first before generating a routine.";
    return;
  }

  chatWindow.innerHTML = "Generating your personalized routine...";
  conversationHistory = [];

  const selectedProductsJson = JSON.stringify(
    selectedProducts.map((product) => ({
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
    })),
    null,
    2,
  );

  const systemMessage = {
    role: "system",
    content:
      "You are a beauty advisor. Stay focused on skincare, haircare, makeup, fragrance, and the generated routine.",
  };

  const userMessage = {
    role: "user",
    content: `Create a personalized routine based on these selected products JSON:\n\n${selectedProductsJson}\n\nInclude morning and evening steps, usage order, and practical tips.`,
  };

  try {
    const routine = await callOpenAI([systemMessage, userMessage]);

    chatWindow.innerHTML = `<div class="routine-response">${routine.replace(/\n/g, "<br>")}</div>`;

    conversationHistory = [
      systemMessage,
      userMessage,
      {
        role: "assistant",
        content: routine,
      },
    ];
  } catch (error) {
    chatWindow.innerHTML = `Error generating routine: ${error.message}`;
    console.error("API Error:", error);
  }
}

/* Display messages in the chat window */
function addMessageToChat(role, content) {
  const messageClass = role === "user" ? "user-message" : "assistant-message";
  const sender = role === "user" ? "You" : "Assistant";
  const messageHtml = `<div class="${messageClass}"><strong>${sender}:</strong> ${content.replace(/\n/g, "<br>")}</div>`;

  chatWindow.innerHTML += messageHtml;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Filter products when category changes */
categoryFilter.addEventListener("change", applyProductFilters);

/* Live search as the user types */
productSearchInput.addEventListener("input", applyProductFilters);

/* Click handlers */
generateRoutineBtn.addEventListener("click", generateRoutine);
clearAllBtn.addEventListener("click", clearAllSelectedProducts);

/* Handle chat form submission for follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  userInput.value = "";
  addMessageToChat("user", message);

  if (conversationHistory.length === 0) {
    conversationHistory.push({
      role: "system",
      content:
        "You are a beauty advisor. Stay focused on skincare, haircare, makeup, fragrance, and the generated routine.",
    });
  }

  conversationHistory.push({
    role: "user",
    content: message,
  });

  try {
    const assistantMessage = await callOpenAI(conversationHistory);
    addMessageToChat("assistant", assistantMessage);

    conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });
  } catch (error) {
    addMessageToChat("assistant", `Error: ${error.message}`);
    console.error("API Error:", error);
  }
});

/* Initialize app state */
loadSelectedProductsFromStorage();
updateSelectedProductsList();

/* Initialize products once, then filter in-memory for smooth UX */
async function initializeProducts() {
  allProducts = await loadProducts();
  applyProductFilters();
}

initializeProducts();
