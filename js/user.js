const PROJECT_ID = "shoppingcart-4b24e";
const PRODUCTS_API = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/watches`;
const CARTS_API = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/carts`;

const uid = sessionStorage.getItem("uid");
const idToken = sessionStorage.getItem("idToken");
const role = sessionStorage.getItem("role");

// Redirect if not logged in
if (!uid || !idToken) window.location = "auth.html";

// Redirect admin to admin.html
if (role === "admin") window.location = "admin.html";

// Logout
function logout() {
    sessionStorage.clear();
    window.location = "auth.html";
}

// Load products safely
async function loadProducts() {
    try {
        const resp = await axios.get(PRODUCTS_API, {
            headers: { Authorization: `Bearer ${idToken}` }
        });

        const listDiv = document.getElementById("productList");
        listDiv.innerHTML = "";

        const products = resp.data.documents || [];
        if (products.length === 0) {
            listDiv.innerHTML = "<p>No products available.</p>";
            return;
        }

        products.forEach(doc => {
            const id = doc.name.split("/").pop();
            const name = doc.fields?.name?.stringValue || "No name";
            const qty = doc.fields?.quantity?.integerValue || 0;

            const productDiv = document.createElement("div");
            productDiv.innerHTML = `
                <strong>${name}</strong> (Qty: ${qty})
                <button onclick="addToCart('${id}', '${name}', ${qty})">Add to Cart</button>
            `;
            listDiv.appendChild(productDiv);
        });

    } catch (err) {
        console.error("Failed to load products:", err);
        alert("Failed to load products");
    }
}

// Load cart safely
async function loadCart() {
    try {
        const resp = await axios.get(`${CARTS_API}/${uid}`, {
            headers: { Authorization: `Bearer ${idToken}` }
        });

        const cartDiv = document.getElementById("cartList");
        cartDiv.innerHTML = "";

        const items = resp.data.fields?.items?.arrayValue?.values || [];
        if (items.length === 0) {
            cartDiv.innerHTML = "<p>Your cart is empty.</p>";
            return;
        }

        items.forEach(item => {
            const name = item.mapValue.fields?.name?.stringValue || "No name";
            const qty = item.mapValue.fields?.quantity?.integerValue || 0;
            const div = document.createElement("div");
            div.textContent = `${name} - Qty: ${qty}`;
            cartDiv.appendChild(div);
        });

    } catch (err) {
        if (err.response?.status === 404) {
            document.getElementById("cartList").innerHTML = "<p>Your cart is empty.</p>";
        } else {
            console.error("Failed to load cart:", err);
        }
    }
}

// Add to cart safely
async function addToCart(productId, name, quantity) {
    try {
        let cartItems = [];

        // Try to fetch existing cart
        let cartExists = false;
        try {
            const resp = await axios.get(`${CARTS_API}/${uid}`, {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            cartItems = resp.data.fields?.items?.arrayValue?.values || [];
            cartExists = true;
        } catch (err) {
            if (!(err.response?.status === 404)) throw err;
        }

        // Check if product already exists in cart
        let found = false;
        cartItems = cartItems.map(item => {
            const fields = item.mapValue.fields;
            if (fields.productId.stringValue === productId) {
                fields.quantity.integerValue = (parseInt(fields.quantity.integerValue) || 0) + 1;
                found = true;
            }
            return item;
        });

        // If product not in cart, add it
        if (!found) {
            cartItems.push({
                mapValue: {
                    fields: {
                        productId: { stringValue: productId },
                        name: { stringValue: name },
                        quantity: { integerValue: 1 }
                    }
                }
            });
        }

        // Save cart (PATCH will update existing or create if new)
        await axios.patch(`${CARTS_API}/${uid}`, {
            fields: { items: { arrayValue: { values: cartItems } } }
        }, {
            headers: { Authorization: `Bearer ${idToken}` }
        });

        alert("Added to cart!");
        loadCart();

    } catch (err) {
        console.error("Failed to add to cart:", err);
        alert("Failed to add to cart");
    }
}


// Initial load
window.onload = () => {
    loadProducts();
    loadCart();
};
