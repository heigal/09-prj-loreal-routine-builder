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
const BACKEND_URL =
  window.OPENAI_BACKEND_URL || "http://localhost:3000/api/chat";

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

/* Build a simple local routine when the backend is unavailable */
function buildLocalRoutine(products) {
  const orderedProducts = [...products].sort((firstProduct, secondProduct) => {
    const categoryOrder = {
      cleanser: 1,
      moisturizer: 2,
      suncare: 3,
      haircare: 4,
      "hair styling": 5,
      makeup: 6,
      fragrance: 7,
      "hair color": 8,
      "men's grooming": 9,
    };

    const firstRank = categoryOrder[firstProduct.category] || 99;
    const secondRank = categoryOrder[secondProduct.category] || 99;
    return firstRank - secondRank;
  });

  const morningSteps = [];
  const eveningSteps = [];

  orderedProducts.forEach((product) => {
    const category = product.category.toLowerCase();

    if (category === "cleanser") {
      morningSteps.push(`Cleanse with ${product.name}.`);
      eveningSteps.push(
        `Cleanse again with ${product.name} to remove buildup.`,
      );
      return;
    }

    if (category === "moisturizer") {
      morningSteps.push(`Apply ${product.name} to lock in hydration.`);
      eveningSteps.push(
        `Use ${product.name} after cleansing to support skin overnight.`,
      );
      return;
    }

    if (category === "suncare") {
      morningSteps.push(
        `Finish with ${product.name} as your final morning skincare step.`,
      );
      return;
    }

    if (category === "makeup") {
      morningSteps.push(
        `Apply ${product.name} after your skincare base is set.`,
      );
      return;
    }

    if (category === "haircare") {
      morningSteps.push(
        `Use ${product.name} if you are styling or refreshing hair today.`,
      );
      eveningSteps.push(
        `Use ${product.name} as part of your wash-day or treatment routine.`,
      );
      return;
    }

    if (category === "hair styling") {
      morningSteps.push(
        `Style with ${product.name} after hair is clean and dry.`,
      );
      return;
    }

    if (category === "fragrance") {
      morningSteps.push(`Add ${product.name} as the final finishing touch.`);
      eveningSteps.push(
        `Reapply ${product.name} lightly if you want a fresh evening finish.`,
      );
      return;
    }

    if (category === "hair color") {
      eveningSteps.push(
        `Follow the instructions for ${product.name} carefully before styling.`,
      );
      return;
    }

    if (category === "men's grooming") {
      morningSteps.push(
        `Use ${product.name} as part of your grooming routine.`,
      );
      eveningSteps.push(
        `Repeat ${product.name} if it is meant for daily maintenance.`,
      );
    }
  });

  const productList = orderedProducts
    .map((product) => `${product.name} (${product.brand})`)
    .join(", ");

  return [
    "Personalized Routine",
    "",
    `Selected products: ${productList}.`,
    "",
    "Morning:",
    ...(morningSteps.length
      ? morningSteps.map((step, index) => `${index + 1}. ${step}`)
      : [
          "1. Start with the products you selected in a simple cleanse, treat, and protect order.",
        ]),
    "",
    "Evening:",
    ...(eveningSteps.length
      ? eveningSteps.map((step, index) => `${index + 1}. ${step}`)
      : ["1. Focus on cleansing, treatment, and hydration before bed."]),
    "",
    "Practical tips:",
    "1. Use thinner textures before thicker ones.",
    "2. If a product includes special instructions, follow the label first.",
    "3. Patch test new skincare when needed.",
  ].join("\n");
}

/* Build a simple local answer for follow-up questions */
function buildLocalAssistantReply(message) {
  const selectedNames = selectedProducts
    .map((product) => product.name)
    .slice(0, 3);
  const productSummary =
    selectedNames.length > 0
      ? selectedNames.join(", ")
      : "your selected products";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("order") || lowerMessage.includes("step")) {
    return `Use ${productSummary} from lightest to heaviest, then finish with SPF in the morning and fragrance at the end.`;
  }

  if (lowerMessage.includes("morning")) {
    return "For the morning, start with cleansing, add treatment or moisturizer, then finish with protection and styling or makeup.";
  }

  if (lowerMessage.includes("evening")) {
    return "For the evening, remove buildup first, then use your treatment and moisturizer so the skin or hair can recover overnight.";
  }

  return `I could not reach the online AI, but based on ${productSummary}, keep the routine simple and follow the label instructions for any product that has special directions.`;
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

/* Helper: call OpenAI API through backend proxy */
async function callOpenAI(messages) {
  // Call our backend proxy instead of OpenAI directly (avoids CORS issues)
  const backendUrl = BACKEND_URL;

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Backend error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }

    throw new Error("Unable to get a valid response from OpenAI API.");
  } catch (error) {
    console.error("API Call Error:", error);
    throw error;
  }
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
    const routine = buildLocalRoutine(selectedProducts);

    chatWindow.innerHTML = `
      <div class="routine-response">
        ${routine.replace(/\n/g, "<br>")}
      </div>
      <p style="margin-top: 12px; color: #8b8b8b; font-size: 0.95rem;">
        The online AI was unavailable, so a local routine was generated instead.
      </p>
    `;

    conversationHistory = [
      systemMessage,
      userMessage,
      {
        role: "assistant",
        content: routine,
      },
    ];

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
    addMessageToChat("assistant", buildLocalAssistantReply(message));
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
