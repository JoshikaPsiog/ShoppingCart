// ================= Global Setup =================
const uid = sessionStorage.getItem("uid");
const idToken = sessionStorage.getItem("idToken");
const BASE_URL = "https://firestore.googleapis.com/v1/projects/shoppingcart-4b24e/databases/(default)/documents";
const role = sessionStorage.getItem("role");
const isAdmin = role === "admin";

if (!uid || !idToken) {
  alert("❌ You must log in first!");
  window.location.href = "auth.html"; // adjust login page path
}

// ================= DOM Elements =================
const welcomeText = document.getElementById("welcomeText");
const adminSection = document.getElementById("adminSection");
const userSection = document.getElementById("userSection");
const cartSection = document.getElementById("cartSection");
const logoutBtn = document.getElementById("logoutBtn");

// Admin inputs
const productNameInput = document.getElementById("productName");
const productQtyInput = document.getElementById("productQty");
const addProductBtn = document.getElementById("addProductBtn");
const productListDiv = document.getElementById("productList");

// Set welcome text

const username = sessionStorage.getItem("role") || uid;
welcomeText.textContent = `Welcome, ${username}!`;


// Show sections based on role
if (isAdmin) {
  adminSection.style.display = "block";
  userSection.style.display = "none";
  cartSection.style.display = "none";
} else {
  adminSection.style.display = "none";
  userSection.style.display = "block";
  cartSection.style.display = "block";
}

// Logout button
logoutBtn.onclick = () => {
  sessionStorage.clear();
  window.location.href = "auth.html";
};

// ================= Admin Functions =================

// Load all products for admin
async function loadAdminProducts() {
  try {
    const resp = await axios.get(`${BASE_URL}/products?pageSize=50`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    const products = resp.data.documents || [];
    productListDiv.innerHTML = "";

    if (products.length === 0) {
      productListDiv.innerHTML = "<p>No products found.</p>";
      return;
    }

    products.forEach(doc => {
      const id = doc.name.split("/").pop();
      const name = doc.fields.name.stringValue;
      const qty = doc.fields.qty.integerValue;

      const div = document.createElement("div");
      div.className = "admin-item";
      div.innerHTML = `
        <strong>${name}</strong> — Qty: ${qty}
        <button class="btn-delete" onclick="deleteProduct('${id}')">Delete</button>
      `;
      productListDiv.appendChild(div);
    });
  } catch (err) {
    console.error("❌ Admin product fetch error:", err);
    productListDiv.innerHTML = "<p>Failed to load products.</p>";
  }
}

// Add new product (admin)
addProductBtn.onclick = async () => {
  const name = productNameInput.value.trim();
  const qty = parseInt(productQtyInput.value);

  if (!name || isNaN(qty)) {
    alert("Please enter product name and quantity.");
    return;
  }

  try {
    await axios.post(
      `${BASE_URL}/products?documentId=${name}`,
      { fields: { name: { stringValue: name }, qty: { integerValue: qty } } },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
    alert(`✅ Product "${name}" added!`);
    productNameInput.value = "";
    productQtyInput.value = "";
    loadAdminProducts();
  } catch (err) {
    console.error("❌ Failed to add product:", err);
    alert("Failed to add product. Check Firestore rules or duplicate name.");
  }
};

// Delete product (admin)
async function deleteProduct(productId) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    await axios.delete(`${BASE_URL}/products/${productId}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    alert("🗑️ Product deleted!");
    loadAdminProducts();
  } catch (err) {
    console.error("❌ Failed to delete product:", err);
    alert("Failed to delete product. Check Firestore rules.");
  }
}

// ================= User Functions =================

// Ensure user document exists
async function ensureUserDoc() {
  try {
    await axios.get(`${BASE_URL}/users/${uid}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
  } catch {
    await axios.patch(
      `${BASE_URL}/users/${uid}`,
      { fields: { createdAt: { timestampValue: new Date().toISOString() } } },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
  }
}

// Load all products for user
async function loadUserProducts() {
  const listDiv = document.getElementById("userProductList");
  listDiv.innerHTML = "";

  try {
    const resp = await axios.get(`${BASE_URL}/products?pageSize=50`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    const products = resp.data.documents || [];

    if (products.length === 0) {
      listDiv.innerHTML = "<p>No items in stock ⚡</p>";
      return;
    }

    products.forEach(doc => {
      const id = doc.name.split("/").pop();
      const name = doc.fields?.name?.stringValue || "Unnamed item";
      const qty = parseInt(doc.fields?.qty?.integerValue || 0);

      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <strong>${name}</strong> — Qty: ${qty}
        <button class="btn-primary" onclick="addToCart('${id}', '${name}')">Add to Cart</button>
      `;
      listDiv.appendChild(div);
    });
  } catch (err) {
    console.error("❌ User product fetch error:", err);
    listDiv.innerHTML = "<p>Failed to load products. (Check collection path)</p>";
  }
}

// Add item to cart
async function addToCart(productId, name) {
  if (!uid || !idToken) {
    alert("Please log in first!");
    return;
  }

  const cartRef = `${BASE_URL}/users/${uid}/cart`;
  let cartItems = [];

  try {
    const resp = await axios.get(cartRef, { headers: { Authorization: `Bearer ${idToken}` } });
    cartItems = resp.data.documents || [];
  } catch (err) {
    if (err.response?.status !== 404) {
      console.error("⚠️ Fetch cart error:", err);
      return;
    }
  }

  const existing = cartItems.find(item => item.fields.productId.stringValue === productId);

  try {
    if (existing) {
      const existingQty = parseInt(existing.fields.quantity.integerValue);
      const patchURL = `https://firestore.googleapis.com/v1/${existing.name}?updateMask.fieldPaths=quantity`;
      await axios.patch(
        patchURL,
        { fields: { quantity: { integerValue: existingQty + 1 } } },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
    } else {
      await axios.post(
        cartRef,
        { fields: { productId: { stringValue: productId }, name: { stringValue: name }, quantity: { integerValue: 1 } } },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
    }
    alert(`${name} added to your cart!`);
    loadCart();
  } catch (err) {
    console.error("❌ Add to cart error:", err);
    alert("Failed to add to cart.");
  }
}

// Load user's cart
async function loadCart() {
  const cartDiv = document.getElementById("cartList");
  cartDiv.innerHTML = "";

  try {
    const resp = await axios.get(`${BASE_URL}/users/${uid}/cart`, { headers: { Authorization: `Bearer ${idToken}` } });
    const items = resp.data.documents || [];

    if (items.length === 0) {
      cartDiv.innerHTML = "<p>Your cart is empty.</p>";
      return;
    }

    items.forEach(item => {
      const name = item.fields.name.stringValue;
      const qty = item.fields.quantity.integerValue;
      const div = document.createElement("div");
      div.textContent = `${name} — Qty: ${qty}`;
      cartDiv.appendChild(div);
    });
  } catch (err) {
    console.error("⚠️ Cart fetch error:", err);
    cartDiv.innerHTML = "<p>Your cart is empty.</p>";
  }
}

// ================= Initial Load =================
window.onload = async () => {
  if (!isAdmin) {
    await ensureUserDoc();
    await loadUserProducts();
    await loadCart();
  } else {
    await loadAdminProducts();
  }
};
