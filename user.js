// 🔹 Ensure these are declared globally in dashboarding.js and loaded BEFORE this file
// const uid = sessionStorage.getItem("uid");
// const idToken = sessionStorage.getItem("idToken");

// const BASE_URL = "https://firestore.googleapis.com/v1/projects/shoppingcart-4b24e/databases/(default)/documents";

// 🔹 Check user & token
if (!uid || !idToken) {
  console.error("❌ UID or ID Token missing. Make sure you logged in and loaded dashboarding.js first.");
}

// ✅ Load all products for user
async function loadUserProducts() {
  const listDiv = document.getElementById("userProductList");
  listDiv.innerHTML = "";

  try {
    console.log("📦 Fetching product list...");
    const resp = await axios.get(`${BASE_URL}/products?pageSize=50`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });

    const products = resp.data.documents || [];
    console.log("✅ Products loaded:", products.length);

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
    console.error("❌ User product fetch error:", err.response?.data || err);
    listDiv.innerHTML = "<p>Failed to load products. (Check collection path)</p>";
  }
}

// ✅ Add to cart
async function addToCart(productId, name) {
  if (!uid || !idToken) {
    alert("Please log in first!");
    return;
  }

  const cartRef = `${BASE_URL}/users/${uid}/cart`;
  console.log(`🛒 Adding ${name} to cart for user ${uid}`);

  let cartItems = [];

  try {
    const resp = await axios.get(cartRef, { headers: { Authorization: `Bearer ${idToken}` } });
    cartItems = resp.data.documents || [];
  } catch (err) {
    if (err.response?.status !== 404) {
      console.error("⚠️ Fetch cart error:", err.response?.data || err);
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

      console.log(`🔁 Updated quantity for ${name}: ${existingQty + 1}`);
    } else {
      await axios.post(
        cartRef,
        {
          fields: {
            productId: { stringValue: productId },
            name: { stringValue: name },
            quantity: { integerValue: 1 }
          }
        },
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      console.log(`🆕 Added ${name} to cart.`);
    }

    alert(`${name} added to your cart!`);
    loadCart();

  } catch (err) {
    console.error("❌ Add to cart error:", err.response?.data || err);
    alert("Failed to add to cart. Please check Firestore rules or authentication.");
  }
}

// ✅ Load user’s cart
async function loadCart() {
  const cartDiv = document.getElementById("cartList");
  cartDiv.innerHTML = "";

  try {
    const resp = await axios.get(`${BASE_URL}/users/${uid}/cart`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });

    const items = resp.data.documents || [];
    console.log("🛍 Cart items:", items.length);

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
    console.error("⚠️ Cart fetch error:", err.response?.data || err);
    cartDiv.innerHTML = "<p>Your cart is empty.</p>";
  }
}

// ✅ Ensure user document exists before writing to cart
async function ensureUserDoc() {
  try {
    await axios.get(`${BASE_URL}/users/${uid}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
  } catch {
    await axios.patch(
      `${BASE_URL}/users/${uid}`,
      {
        fields: { createdAt: { timestampValue: new Date().toISOString() } }
      },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
  }
}

// ✅ Initial load
window.onload = async () => {
  await ensureUserDoc();
  await loadUserProducts();
  await loadCart();
};
