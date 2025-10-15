
const uid = sessionStorage.getItem("uid");
const idToken = sessionStorage.getItem("idToken");
const BASE_URL = "https://firestore.googleapis.com/v1/projects/shoppingcart-4b24e/databases/(default)/documents";
const role = sessionStorage.getItem("role");
const isAdmin = role === "admin";

if (!uid || !idToken) {
    alert("❌ You must log in first!");
    window.location.href = "auth.html";
}

const welcomeText = document.getElementById("welcomeText");
const adminSection = document.getElementById("adminSection");
const userSection = document.getElementById("userSection");
const cartSection = document.getElementById("cartSection"); 
const logoutBtn = document.getElementById("logoutBtn");

// Pay Now (checkout) elements
const modalCheckout = document.getElementById("checkoutModal");
const confirmOrderBtn = document.getElementById("confirmOrder");
const cancelOrderBtn = document.getElementById("cancelOrder");
const orderPlacedPopup = document.getElementById("orderPlacedPopup");

// Admin inputs
const productNameInput = document.getElementById("productName");
const productQtyInput = document.getElementById("productQty");
const productPriceInput = document.getElementById("productPrice");
const productImageInput = document.getElementById("productImage");
const addProductBtn = document.getElementById("addProductBtn");
const productListDiv = document.getElementById("productList");

// User containers
const userProductList = document.getElementById("userProductList");
const cartList = document.getElementById("cartList");

// Pagination tokens
let userPages = [];
let userCurrentPage = 0;
let adminPages = [];
let adminCurrentPage = 0;

function showCart() {
    const overlay = document.getElementById("cartOverlay");
    const modal = document.getElementById("cartModal");
    if (overlay) overlay.style.display = "block";
    if (modal) modal.style.display = "block";
    loadCart();
}

function hideCart() {
    const overlay = document.getElementById("cartOverlay");
    const modal = document.getElementById("cartModal");
    if (overlay) overlay.style.display = "none";
    if (modal) modal.style.display = "none";
}

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
            div.innerHTML = `
    <img src="${doc.fields.imageUrl?.stringValue}" alt="${name}" width="80" style="vertical-align:middle; margin-right:8px;" />
    <strong>${name}</strong> — Qty: ${qty} — $${price.toFixed(2)}
    <button class="btn-edit" onclick="editProductPrompt('${id}', '${name.replace(/'/g, "\\'")}', ${qty}, ${price})">Edit</button>
    <button class="btn-delete" onclick="deleteProduct('${id}')">Delete</button>
`;

            productListDiv.appendChild(div);
        });

        if (direction === "next" && resp.data.nextPageToken) {
            adminPages[adminCurrentPage] = resp.data.nextPageToken;
        }

        const prev = document.getElementById("prevPage");
        const next = document.getElementById("nextPage");
        adminCurrentPage = targetIndex;
        if (prev) prev.disabled = adminCurrentPage === 0;
        if (next) next.disabled = !resp.data.nextPageToken;
    } catch (err) {
        console.error("❌ Admin fetch error:", err);
        productListDiv.innerHTML = "<p>Failed to load products.</p>";
    }
}

const nextPageBtn = document.getElementById("nextPage");
const prevPageBtn = document.getElementById("prevPage");
if (nextPageBtn) nextPageBtn.onclick = () => loadAdminProductsPaginated("next");
if (prevPageBtn) prevPageBtn.onclick = () => loadAdminProductsPaginated("prev");

if (addProductBtn) {
    
addProductBtn.onclick = async () => {
    const name = productNameInput.value.trim();
    const qty = parseInt(productQtyInput.value);
    const priceVal = parseFloat(productPriceInput.value);
    const imageUrl = productImageInput.value.trim();

    if (!name || isNaN(qty) || isNaN(priceVal) || !imageUrl) {
        alert("Enter product name, quantity, price, and image URL.");
        return;
    }

    const body = {
        fields: {
            name:  { stringValue: name },
            qty:   { integerValue: qty },
            price: { doubleValue: priceVal },
            imageUrl: { stringValue: imageUrl }
        }
    };

    try {
        const url = `${BASE_URL}/products?documentId=${encodeURIComponent(name)}`;
        await axios.post(url, body, { headers: { Authorization: `Bearer ${idToken}` } });

        
        productNameInput.value = "";
        productQtyInput.value = "";
        productPriceInput.value = "";
        productImageInput.value = "";

        adminPages = []; adminCurrentPage = 0;
        loadAdminProductsPaginated("next");
    } catch (err) {
        console.error("Add product failed:", err.response?.data || err);
        alert("Failed to add product.");
    }
};
}

async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    try {
        await axios.delete(`${BASE_URL}/products/${id}`, { headers: { Authorization: `Bearer ${idToken}` } });
        adminPages = []; adminCurrentPage = 0;
        loadAdminProductsPaginated("next");
    } catch (err) {
        console.error(err);
        alert("Failed to delete product.");
    }
}

async function editProductPrompt(id, oldName, oldQty, oldPrice) {
    const name = prompt("Enter new name:", oldName);
    const qty = parseInt(prompt("Enter new quantity:", oldQty));
    const price = parseFloat(prompt("Enter new price:", oldPrice));

    if (!name || isNaN(qty) || isNaN(price)) {
        alert("❌ Invalid input. Please check your values.");
        return;
    }

    const body = {
        fields: {
            name: { stringValue: name },
            qty: { integerValue: qty },
            price: { doubleValue: price }
        }
    };

    try {
        const patchURL = `${BASE_URL}/products/${id}?updateMask.fieldPaths=name&updateMask.fieldPaths=qty&updateMask.fieldPaths=price`;
        await axios.patch(patchURL, body, { headers: { Authorization: `Bearer ${idToken}` } });
        alert("Product updated successfully!");
        loadAdminProductsPaginated("next");
    } catch (err) {
        console.error("❌ Update product error:", err.response || err);
        alert("Failed to update product.");
    }
}

// ====== User & Cart Functions ======

async function loadUserProductsPaginated(direction = "next") {
    try {
        const listDiv = document.getElementById("userProductList");
        if (!listDiv) return;

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
        if (!products.length) {
            listDiv.innerHTML = "<p>No items in stock ⚡</p>";
        }

        products.forEach(doc => {
            const id = doc.name.split("/").pop();
            const name = doc.fields.name.stringValue;
            const qty = parseInt(doc.fields.qty?.integerValue ?? 0);
            const price = parseFloat(doc.fields.price?.doubleValue ?? doc.fields.price?.integerValue ?? 0);

            const div = document.createElement("div");
            div.className = "item";
           div.innerHTML = `
    <img src="${doc.fields.imageUrl?.stringValue}" alt="${name}" width="100" style="display:block; margin-bottom:4px;" />
    <strong>${name}</strong> — Qty: ${qty} — $${price.toFixed(2)}
    <button class="btn-primary" onclick="addToCart('${id}', '${name.replace(/'/g,"\\'")}', ${price})">Add to Cart</button>
`;

            listDiv.appendChild(div);
        });

        if (direction === "next" && resp.data.nextPageToken) {
            userPages[userCurrentPage] = resp.data.nextPageToken;
        }

        userCurrentPage = targetIndex;
        const prev = document.getElementById("prevUserPage");
        const next = document.getElementById("nextUserPage");
        if (prev) prev.disabled = userCurrentPage === 0;
        if (next) next.disabled = !resp.data.nextPageToken;

    } catch (err) {
        console.error("❌ User fetch error:", err);
        if (userProductList) userProductList.innerHTML = "<p>Failed to load products.</p>";
    }
}

const nextUserBtn = document.getElementById("nextUserPage");
const prevUserBtn = document.getElementById("prevUserPage");
if (nextUserBtn) nextUserBtn.onclick = () => loadUserProductsPaginated("next");
if (prevUserBtn) prevUserBtn.onclick = () => loadUserProductsPaginated("prev");

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

async function generateCustomerReport() {
    const from = document.getElementById("custFrom").value;
    const to = document.getElementById("custTo").value;
    const type = document.getElementById("custType").value;

    const container = document.getElementById("customerReport");
    container.innerHTML = "<p>Loading...</p>";

    try {
        let allOrders = [];

        if (isAdmin) {
            
            const usersResp = await axios.get(`${BASE_URL}/users?pageSize=1000`, {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            const users = usersResp.data.documents || [];

            
            for (const userDoc of users) {
                const userId = userDoc.name.split("/").pop();
                try {
                    const ordersResp = await axios.get(`${BASE_URL}/users/${userId}/orderhistory`, {
                        headers: { Authorization: `Bearer ${idToken}` }
                    });
                    const orders = ordersResp.data.documents || [];
                    allOrders.push(...orders.map(o => ({ ...o, userId })));
                } catch (err) {
                    
                    continue;
                }
            }
        } else {
            
            const ordersResp = await axios.get(`${BASE_URL}/users/${uid}/orderhistory`, {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            allOrders = ordersResp.data.documents || [];
        }

        
        const filtered = allOrders.filter(doc => {
            const f = doc.fields;
            const date = new Date(f.date.stringValue);
            return (!from || date >= new Date(from)) &&
                   (!to || date <= new Date(to)) &&
                   (type === "all" || f.paymentType.stringValue === type);
        });

       
        container.innerHTML = filtered.length
            ? filtered.map(o => {
                  const f = o.fields;
                  return `<p>
                      User: ${o.userId || uid} — 
                      ${f.customerName.stringValue} — 
                      ${f.date.stringValue} — 
                      $${f.totalAmount.doubleValue} — 
                      ${f.paymentType.stringValue}
                  </p>`;
              }).join("")
            : "<p>No orders found</p>";

    } catch (err) {
        console.error("Customer report error:", err);
        container.innerHTML = "<p>Failed to generate report</p>";
    }
}

document.getElementById("generateCustomer").onclick = generateCustomerReport;


async function addToCart(productId, name, price = 0) {
    if (!uid || !idToken) return alert("Please log in first!");
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
            const patchURL = `https://firestore.googleapis.com/v1/${existing.name}?updateMask.fieldPaths=quantity`;
            const existingQty = parseInt(existing.fields.quantity.integerValue);
            await axios.patch(
                patchURL,
                { fields: { quantity: { integerValue: existingQty + 1 } } },
                { headers: { Authorization: `Bearer ${idToken}` } }
            );
        } else {
            const docId = `cart_${productId}_${Date.now()}`;
            await axios.post(
                `${cartRef}?documentId=${docId}`,
                {
                    fields: {
                        productId: { stringValue: productId },
                        name: { stringValue: name },
                        quantity: { integerValue: 1 },
                        price: { doubleValue: parseFloat(price) || 0 }
                    }
                },
                { headers: { Authorization: `Bearer ${idToken}` } }
            );
        }
        alert(`${name} added to your cart!`);
        await loadCart();
    } catch (err) {
        console.error("❌ Add to cart error:", err);
        alert("Failed to add to cart.");
    }
}


async function loadCart() {
    if (isAdmin) return;
    cartList.innerHTML = "";
    try {
        const resp = await axios.get(`${BASE_URL}/users/${uid}/cart`, {
            headers: { Authorization: `Bearer ${idToken}` }
        });
        const items = resp.data.documents || [];

        if (!items.length) {
            cartList.innerHTML = "<p>Your cart is empty.</p>";
            return;
        }

        let total = 0;
        items.forEach(item => {
            const name = item.fields.name?.stringValue ?? "";
            const qty  = parseInt(item.fields.quantity?.integerValue ?? 0);
            const unit = parseFloat(item.fields.price?.doubleValue ?? item.fields.price?.integerValue ?? 0);
            const line = qty * unit;
            total += line;

            const row = document.createElement("div");
            row.className = "cart-item";
            row.innerHTML = `
                <div><strong>${name}</strong></div>
                <div>Qty: ${qty}</div>
                <div>Unit: $${unit.toFixed(2)}</div>
                <div>Line: $${line.toFixed(2)}</div>
            `;
            cartList.appendChild(row);
        });

        const totalDiv = document.createElement("div");
        totalDiv.className = "cart-total";
        totalDiv.textContent = `🧙‍♂️ Cart Total: $${total.toFixed(2)}`;
        cartList.appendChild(totalDiv);

        // Pay Now button
        const payBtn = document.createElement("button");
        payBtn.textContent = "💳 Pay Now";
        payBtn.className = "pay-btn";
        payBtn.onclick = openCheckoutPopup;
        cartList.appendChild(payBtn);

    } catch (err) {
        console.error("❌ Load cart error:", err);
        cartList.innerHTML = "<p>Failed to load cart.</p>";
    }
}

function openCheckoutPopup() {
    if (modalCheckout) modalCheckout.style.display = "flex";
}
if (cancelOrderBtn) {
    cancelOrderBtn.onclick = () => { if (modalCheckout) modalCheckout.style.display = "none"; };
}
if (confirmOrderBtn) {
    confirmOrderBtn.onclick = async () => {
        const name = document.getElementById("custName").value.trim();
        const address = document.getElementById("custAddress").value.trim();
        const phone = document.getElementById("custPhone").value.trim();

        if (!name || !address || !phone) {
            alert("Please fill in all details!");
            return;
        }

        try {
            
            const resp = await axios.get(`${BASE_URL}/users/${uid}/cart`, {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            const items = resp.data.documents || [];

            if (!items.length) {
                alert("Your cart is empty!");
                return;
            }

            
            let total = 0;
            const orderItems = items.map(doc => {
                const f = doc.fields;
                const qty = parseInt(f.quantity?.integerValue ?? 0);
                const price = parseFloat(f.price?.doubleValue ?? f.price?.integerValue ?? 0);
                total += qty * price;

                return {
                    mapValue: {
                        fields: {
                            productId: { stringValue: f.productId?.stringValue ?? "" },
                            name: { stringValue: f.name?.stringValue ?? "" },
                            quantity: { integerValue: qty },
                            price: { doubleValue: price }
                        }
                    }
                };
            });

            const nowIso = new Date().toISOString();
            const orderBody = {
                fields: {
                    customerName: { stringValue: name },
                    address: { stringValue: address },
                    phone: { stringValue: phone },
                    date: { stringValue: nowIso },
                    totalAmount: { doubleValue: total },
                    paymentType: { stringValue: "cash" },
                    items: { arrayValue: { values: orderItems } }
                }
            };

            
            const orderDocId = `order_${Date.now()}`;
            await axios.post(
                `${BASE_URL}/users/${uid}/orderhistory?documentId=${orderDocId}`,
                orderBody,
                { headers: { Authorization: `Bearer ${idToken}` } }
            );

            
            for (const doc of items) {
                const productId = doc.fields.productId.stringValue;
                const orderedQty = parseInt(doc.fields.quantity.integerValue);

                
                const productDoc = await axios.get(`${BASE_URL}/products/${productId}`, {
                    headers: { Authorization: `Bearer ${idToken}` }
                });

                const currentQty = parseInt(productDoc.data.fields.qty.integerValue || 0);
                const newQty = Math.max(currentQty - orderedQty, 0); // avoid negative stock

                
                await axios.patch(
                    `${BASE_URL}/products/${productId}?updateMask.fieldPaths=qty`,
                    { fields: { qty: { integerValue: newQty } } },
                    { headers: { Authorization: `Bearer ${idToken}` } }
                );
            }

            
            for (const doc of items) {
                await axios.delete(`https://firestore.googleapis.com/v1/${doc.name}`, {
                    headers: { Authorization: `Bearer ${idToken}` }
                });
            }

            
            if (modalCheckout) modalCheckout.style.display = "none";
            if (orderPlacedPopup) {
                orderPlacedPopup.style.display = "block";
                setTimeout(() => { orderPlacedPopup.style.display = "none"; }, 2000);
                console.log("✅ Order placed successfully, showing popup...");
            }

            
await loadCart();
await loadUserProductsPaginated("next");

        } catch (err) {
            console.error("❌ Place order error:", err.response?.data || err);
            alert(`Failed to place order. ${err.response?.status ? "Status: " + err.response.status : ""}`);
        }
    };
}

// ===== Customer Report =====
const tabButtons = document.querySelectorAll(".tabBtn");
const tabContents = document.querySelectorAll(".tabContent");

tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;

       
        tabContents.forEach(tc => tc.style.display = "none");

        const target = document.getElementById(tab);
        if (target) target.style.display = "block";
    });
});

const generateCustomerBtn = document.getElementById("generateCustomer");
const customerReportDiv = document.getElementById("customerReport");

if (generateCustomerBtn) {
    generateCustomerBtn.onclick = async () => {
        const from = document.getElementById("custFrom").value;
        const to = document.getElementById("custTo").value;
        const type = document.getElementById("custType").value;

        if (!from || !to) return alert("Select a date range.");

        try {
            const resp = await axios.get(`${BASE_URL}/users/${uid}/orderhistory`, {
                headers: { Authorization: `Bearer ${idToken}` }
            });

            const orders = resp.data.documents || [];
            const filtered = orders.filter(o => {
                const date = o.fields.date.stringValue;
                const payment = o.fields.paymentType.stringValue;
                return date >= from && date <= to && (type === "all" || type === payment);
            });

            if (!filtered.length) customerReportDiv.innerHTML = "<p>No orders found.</p>";
            else {
                customerReportDiv.innerHTML = filtered.map(o => {
                    const name = o.fields.customerName.stringValue;
                    const total = o.fields.totalAmount.doubleValue;
                    const payment = o.fields.paymentType.stringValue;
                    const date = o.fields.date.stringValue;
                    return `<p><strong>${name}</strong> — $${total} — ${payment} — ${date}</p>`;
                }).join("");
            }
        } catch (err) {
            console.error(err);
            customerReportDiv.innerHTML = "<p>Error generating report.</p>";
        }
    };
}


// ================= Init after DOM Ready =================
document.addEventListener("DOMContentLoaded", () => {
  
    const username = sessionStorage.getItem("role") || uid;
    if (welcomeText) welcomeText.textContent = `Welcome, ${username}!`;

    const toggleBtn = document.getElementById("toggleCartBtn");
    const overlay = document.getElementById("cartOverlay");
    const modal = document.getElementById("cartModal");
    const closeBtn = document.getElementById("closeCartModal");

    if (isAdmin) {
        if (adminSection) adminSection.style.display = "block";
        if (userSection) userSection.style.display = "none";
        if (toggleBtn) toggleBtn.style.display = "none";
        if (overlay) overlay.style.display = "none";
        if (modal) modal.style.display = "none";
    } else {
        if (adminSection) adminSection.style.display = "none";
        if (userSection) userSection.style.display = "block";
        if (toggleBtn) toggleBtn.addEventListener("click", showCart);
        if (closeBtn) closeBtn.addEventListener("click", hideCart);
        if (overlay) overlay.addEventListener("click", hideCart);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            sessionStorage.clear();
            window.location.href = "auth.html";
        });
    }

   
    // Customer Report
    const generateCustomerBtn = document.getElementById("generateCustomer");
    if (generateCustomerBtn) {
        generateCustomerBtn.onclick = async () => {
            const from = document.getElementById("custFrom").value;
            const to = document.getElementById("custTo").value;
            const type = document.getElementById("custType").value;

            try {
                const resp = await axios.get(`${BASE_URL}/users/${uid}/orderhistory`, {
                    headers: { Authorization: `Bearer ${idToken}` }
                });

                const orders = resp.data.documents || [];

                const filtered = orders.filter(doc => {
                    const f = doc.fields;
                    const date = new Date(f.date.stringValue);
                    return (!from || date >= new Date(from)) &&
                           (!to || date <= new Date(to)) &&
                           (type === "all" || f.paymentType.stringValue === type);
                });

                const container = document.getElementById("customerReport");
                container.innerHTML = filtered.map(o => {
                    const f = o.fields;
                    return `<p>${f.customerName.stringValue} — ${f.date.stringValue} — $${f.totalAmount.doubleValue} — ${f.paymentType.stringValue}</p>`;
                }).join("") || "<p>No orders found</p>";

            } catch (err) {
                console.error("Customer report error:", err);
            }
        };
    }

    // Inventory Report
    const generateInventoryBtn = document.getElementById("generateInventory");
    if (generateInventoryBtn) {
        generateInventoryBtn.onclick = async () => {
            const category = document.getElementById("invCategory").value;
            const stockFilter = document.getElementById("invStock").value;

            try {
                const resp = await axios.get(`${BASE_URL}/products?pageSize=1000`, {
                    headers: { Authorization: `Bearer ${idToken}` }
                });
                const products = resp.data.documents || [];

                const filtered = products.filter(doc => {
                    const f = doc.fields;
                    const qty = parseInt(f.qty?.integerValue ?? 0);

                    const catMatch = category === "all" || (f.category?.stringValue === category);
                    const stockMatch = stockFilter === "all" ||
                                       (stockFilter === "high" && qty > 100) ||
                                       (stockFilter === "low" && qty < 15);
                    return catMatch && stockMatch;
                });

                const container = document.getElementById("inventoryReport");
                container.innerHTML = filtered.map(p => {
                    const f = p.fields;
                    return `<p>${f.name.stringValue} — Qty: ${f.qty.integerValue} — $${f.price.doubleValue ?? f.price.integerValue}</p>`;
                }).join("") || "<p>No products found</p>";

            } catch (err) {
                console.error("Inventory report error:", err);
            }
        };
    }

    // Sales Report
    const generateSalesBtn = document.getElementById("generateSales");
    if (generateSalesBtn) {
        generateSalesBtn.onclick = async () => {
            const from = document.getElementById("salesFrom").value;
            const to = document.getElementById("salesTo").value;
            const type = document.getElementById("salesType").value;

            try {
                const usersResp = await axios.get(`${BASE_URL}/users`, {
                    headers: { Authorization: `Bearer ${idToken}` }
                });
                const users = usersResp.data.documents || [];

                let allOrders = [];
                for (const user of users) {
                    const uid = user.name.split("/").pop();
                    try {
                        const ordersResp = await axios.get(`${BASE_URL}/users/${uid}/orderhistory`, {
                            headers: { Authorization: `Bearer ${idToken}` }
                        });
                        allOrders.push(...(ordersResp.data.documents || []));
                    } catch {}
                }

                const filtered = allOrders.filter(doc => {
                    const f = doc.fields;
                    const date = new Date(f.date.stringValue);
                    return (!from || date >= new Date(from)) &&
                           (!to || date <= new Date(to)) &&
                           (type === "all" || f.paymentType.stringValue === type);
                });

                const container = document.getElementById("salesReport");
                container.innerHTML = filtered.map(o => {
                    const f = o.fields;
                    return `<p>${f.customerName.stringValue} — ${f.date.stringValue} — $${f.totalAmount.doubleValue} — ${f.paymentType.stringValue}</p>`;
                }).join("") || "<p>No sales found</p>";

            } catch (err) {
                console.error("Sales report error:", err);
            }
        };
    }

});

