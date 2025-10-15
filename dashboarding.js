// ================= Global Setup =================
const uid = sessionStorage.getItem("uid");
const idToken = sessionStorage.getItem("idToken");
const BASE_URL = "https://firestore.googleapis.com/v1/projects/shoppingcart-4b24e/databases/(default)/documents";
const role = sessionStorage.getItem("role");
const isAdmin = role === "admin";

if (!uid || !idToken) {
  alert("❌ You must log in first!");
  window.location.href = "auth.html";
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

// User products container
const userProductList = document.getElementById("userProductList");
const cartList = document.getElementById("cartList");

// Pagination tokens
let userPages = [];
let userCurrentPage = 0;
let adminPages = [];
let adminCurrentPage = 0;

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

// Logout
logoutBtn.onclick = () => {
  sessionStorage.clear();
  window.location.href = "auth.html";
};

// ================= Admin Functions =================
async function loadAdminProductsPaginated(direction = "next") {
  try {
    let url = `${BASE_URL}/products?pageSize=4`;
    let targetIndex = adminCurrentPage;
    if (direction === "next") targetIndex++;
    else if (direction === "prev" && adminCurrentPage > 0) targetIndex--;

    if (targetIndex > 0 && adminPages[targetIndex - 1]) {
      url += `&pageToken=${adminPages[targetIndex - 1]}`;
    }

    const resp = await axios.get(url, { headers: { Authorization: `Bearer ${idToken}` } });
    const products = resp.data.documents || [];

    productListDiv.innerHTML = "";
    if (!products.length) productListDiv.innerHTML = "<p>No products found.</p>";

    products.forEach(doc => {
      const id = doc.name.split("/").pop();
      const name = doc.fields.name.stringValue;
      const qty = parseInt(doc.fields.qty?.integerValue ?? 0);
      const price = parseFloat(doc.fields.price?.doubleValue ?? doc.fields.price?.integerValue ?? 0);

      const div = document.createElement("div");
      div.className = "admin-item";
      div.innerHTML = `<strong>${name}</strong> — Qty: ${qty} — $${price.toFixed(2)}
        <button class="btn-delete" onclick="deleteProduct('${id}')">Delete</button>`;
      productListDiv.appendChild(div);
    });

    if (direction === "next" && resp.data.nextPageToken) {
      adminPages[adminCurrentPage] = resp.data.nextPageToken;
    }

    adminCurrentPage = targetIndex;
    document.getElementById("prevPage").disabled = adminCurrentPage === 0;
    document.getElementById("nextPage").disabled = !resp.data.nextPageToken;

  } catch (err) {
    console.error("❌ Admin fetch error:", err);
    productListDiv.innerHTML = "<p>Failed to load products.</p>";
  }
}

// Admin buttons
document.getElementById("nextPage").onclick = () => loadAdminProductsPaginated("next");
document.getElementById("prevPage").onclick = () => loadAdminProductsPaginated("prev");

addProductBtn.onclick = async () => {
  const name = productNameInput.value.trim();
  const qty = parseInt(productQtyInput.value);
  if (!name || isNaN(qty)) return alert("Enter product name & qty");

  try {
    await axios.post(`${BASE_URL}/products?documentId=${name}`,
      { fields: { name: { stringValue: name }, qty: { integerValue: qty } } },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
    productNameInput.value = "";
    productQtyInput.value = "";
    adminPages = [];
    adminCurrentPage = 0;
    loadAdminProductsPaginated();
  } catch (err) {
    console.error(err);
    alert("Failed to add product.");
  }
};

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;
  try {
    await axios.delete(`${BASE_URL}/products/${id}`, { headers: { Authorization: `Bearer ${idToken}` } });
    adminPages = [];
    adminCurrentPage = 0;
    loadAdminProductsPaginated();
  } catch (err) {
    console.error(err);
    alert("Failed to delete product.");
  }
}

// ================= User Functions =================
async function ensureUserDoc() {
  try {
    await axios.get(`${BASE_URL}/users/${uid}`, { headers: { Authorization: `Bearer ${idToken}` } });
  } catch {
    await axios.patch(`${BASE_URL}/users/${uid}`,
      { fields: { createdAt: { timestampValue: new Date().toISOString() } } },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
  }
}

async function loadUserProductsPaginated(direction = "next") {
  try {
    const listDiv = document.getElementById("userProductList");
    let url = `${BASE_URL}/products?pageSize=4`;

    let targetIndex = userCurrentPage;
    if (direction === "next") targetIndex++;
    else if (direction === "prev" && userCurrentPage > 0) targetIndex--;

    if (targetIndex > 0 && userPages[targetIndex - 1]) {
      url += `&pageToken=${userPages[targetIndex - 1]}`;
    }

    const resp = await axios.get(url, { headers: { Authorization: `Bearer ${idToken}` } });
    const products = resp.data.documents || [];

    listDiv.innerHTML = "";
    if (!products.length) listDiv.innerHTML = "<p>No items in stock ⚡</p>";

    products.forEach(doc => {
      const id = doc.name.split("/").pop();
      const name = doc.fields.name.stringValue;
      const qty = parseInt(doc.fields.qty?.integerValue ?? 0);
      const price = parseFloat(doc.fields.price?.doubleValue ?? doc.fields.price?.integerValue ?? 0);

      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<strong>${name}</strong> — Qty: ${qty} — $${price.toFixed(2)}
        <button class="btn-primary" onclick="addToCart('${id}', '${name}', ${price})">Add to Cart</button>`;
      listDiv.appendChild(div);
    });

    if (direction === "next" && resp.data.nextPageToken) {
      userPages[userCurrentPage] = resp.data.nextPageToken;
    }

    userCurrentPage = targetIndex;
    document.getElementById("prevUserPage").disabled = userCurrentPage === 0;
    document.getElementById("nextUserPage").disabled = !resp.data.nextPageToken;

  } catch (err) {
    console.error("❌ User fetch error:", err);
    userProductList.innerHTML = "<p>Failed to load products.</p>";
  }
}

document.getElementById("nextUserPage").onclick = () => loadUserProductsPaginated("next");
document.getElementById("prevUserPage").onclick = () => loadUserProductsPaginated("prev");

// ================= Cart Functions =================
async function addToCart(productId, name, price) {
  const cartRef = `${BASE_URL}/users/${uid}/cart?documentId=${productId}`;
  let existingQty = 0;

  try {
    const resp = await axios.get(`${BASE_URL}/users/${uid}/cart/${productId}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    existingQty = parseInt(resp.data.fields.quantity.integerValue || 0);
  } catch (err) {
    if (err.response?.status !== 404) return console.error(err);
  }

  try {
    if (existingQty) {
      // Update quantity only
      await axios.patch(
        `${BASE_URL}/users/${uid}/cart/${productId}?updateMask.fieldPaths=quantity`,
        { fields: { quantity: { integerValue: existingQty + 1 } } },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
    } else {
      // Add new cart item with price
      await axios.post(
        cartRef,
        {
          fields: {
            productId: { stringValue: productId },
            name: { stringValue: name },
            quantity: { integerValue: 1 },
            price: { doubleValue: price }   // ✅ Save price here
          }
        },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
    }

    loadCart();
  } catch (err) {
    console.error("❌ Add to cart error:", err);
  }
}


async function loadCart() {
  const cartDiv = document.getElementById("cartList");
  cartDiv.innerHTML = "";

  try {
    const resp = await axios.get(`${BASE_URL}/users/${uid}/cart?pageSize=50`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });

    const items = resp.data.documents || [];
    if (!items.length) {
      cartDiv.innerHTML = "<p>Your cart is empty.</p>";
      return;
    }

    let total = 0;

    items.forEach(doc => {
  const id = doc.name.split("/").pop();
  const name = doc.fields.name.stringValue;
  const quantity = parseInt(doc.fields.quantity?.integerValue ?? 0);
  const price = parseFloat(doc.fields.price?.doubleValue ?? doc.fields.price?.integerValue ?? 0);
  const lineTotal = quantity * price;
  total += lineTotal;

  const div = document.createElement("div");
  div.className = "cart-item";
  div.innerHTML = `
    <strong>${name}</strong> — Qty: ${quantity} — $${lineTotal.toFixed(2)}
    <button onclick="updateCartItem('${id}', ${quantity + 1})">+</button>
    <button onclick="updateCartItem('${id}', ${quantity - 1})">-</button>
    <button onclick="removeCartItem('${id}')">Remove</button>
  `;
  cartDiv.appendChild(div);
});


    const totalDiv = document.createElement("div");
    totalDiv.style.fontWeight = "bold";
    totalDiv.style.marginTop = "10px";
    totalDiv.textContent = `🧙‍♂️ Cart Total: $${total.toFixed(2)}`;
    cartDiv.appendChild(totalDiv);

  } catch (err) {
    console.error("❌ Failed to load cart:", err);
    cartDiv.innerHTML = "<p>Failed to load cart.</p>";
  }
}
async function updateCartItem(productId, newQty) {
  if (newQty < 1) return removeCartItem(productId); // auto-remove if quantity < 1

  try {
    await axios.patch(
      `${BASE_URL}/users/${uid}/cart/${productId}?updateMask.fieldPaths=quantity`,
      { fields: { quantity: { integerValue: newQty } } },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
    loadCart();
  } catch (err) {
    console.error("❌ Failed to update cart item:", err);
  }
}
async function removeCartItem(productId) {
  try {
    await axios.delete(`${BASE_URL}/users/${uid}/cart/${productId}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    loadCart();
  } catch (err) {
    console.error("❌ Failed to remove cart item:", err);
  }
}



// ================= Initial Load =================
window.onload = async () => {
  if (!isAdmin) {
    await ensureUserDoc();
    await loadUserProductsPaginated("next");
    await loadCart();
  } else {
    await loadAdminProductsPaginated("next");
  }
};
