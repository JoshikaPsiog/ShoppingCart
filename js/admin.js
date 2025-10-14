(() => {
  const PROJECT_ID = "shoppingcart-4b24e";
  const PRODUCTS_API = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/watches`;

  const uid = sessionStorage.getItem("uid");
  const idToken = sessionStorage.getItem("idToken");
  const role = sessionStorage.getItem("role");

  if (!uid || !idToken) {
    window.location = "auth.html";
    return;
  }

  const adminSection = document.getElementById("adminSection");
  const userSection = document.getElementById("userSection");
  const welcomeText = document.getElementById("welcomeText");

  welcomeText.textContent = `Welcome, ${role.toUpperCase()}`;

  // 👑 Show correct section based on role
  if (role === "admin") {
    adminSection.style.display = "block";
    loadProducts();
  } else {
    userSection.style.display = "block";
    loadUserProducts();
  }

  // ✅ Define logout globally
  window.logout = function() {
    sessionStorage.clear();
    window.location = "auth.html";
  };

  // ✅ Admin functions
  window.addProduct = async function() {
    const name = document.getElementById("productName").value.trim();
    const qty = parseInt(document.getElementById("productQty").value) || 0;
    if (!name) return alert("Enter product name");

    try {
      await axios.patch(`${PRODUCTS_API}/${name}?currentDocument.exists=false`, {
        fields: { name: { stringValue: name }, quantity: { integerValue: qty } }
      }, { headers: { Authorization: `Bearer ${idToken}` } });

      alert("Product added!");
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Failed to add product (maybe it exists already?)");
    }
  };

  window.loadProducts = async function() {
    const listDiv = document.getElementById("productList");
    listDiv.innerHTML = "";

    try {
      const resp = await axios.get(PRODUCTS_API, { headers: { Authorization: `Bearer ${idToken}` } });
      const products = resp.data.documents || [];

      if (products.length === 0) {
        listDiv.innerHTML = "<p>No products available.</p>";
        return;
      }

      products.forEach(doc => {
        const id = doc.name.split("/").pop();
        const name = doc.fields?.name?.stringValue || "No name";
        const qty = doc.fields?.quantity?.integerValue || 0;

        const div = document.createElement("div");
        div.innerHTML = `
          <strong>${name}</strong> (Qty: ${qty})
          <button onclick="updateProduct('${id}')">Update</button>
          <button onclick="deleteProduct('${id}')">Delete</button>
        `;
        listDiv.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      listDiv.innerHTML = "<p>Failed to load products.</p>";
    }
  };

  window.updateProduct = async function(productId) {
    try {
      const resp = await axios.get(`${PRODUCTS_API}/${productId}`, { headers: { Authorization: `Bearer ${idToken}` } });
      const qty = (parseInt(resp.data.fields.quantity.integerValue) || 0) + 1;
      await axios.patch(`${PRODUCTS_API}/${productId}`, { fields: { quantity: { integerValue: qty } } }, { headers: { Authorization: `Bearer ${idToken}` } });
      loadProducts();
    } catch (err) {
      console.error(err);
    }
  };

  window.deleteProduct = async function(productId) {
    try {
      await axios.delete(`${PRODUCTS_API}/${productId}`, { headers: { Authorization: `Bearer ${idToken}` } });
      loadProducts();
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ User view (readonly)
  window.loadUserProducts = async function() {
    const listDiv = document.getElementById("userProductList");
    listDiv.innerHTML = "";

    try {
      const resp = await axios.get(PRODUCTS_API, { headers: { Authorization: `Bearer ${idToken}` } });
      const products = resp.data.documents || [];
      if (products.length === 0) {
        listDiv.innerHTML = "<p>No products yet.</p>";
        return;
      }

      products.forEach(doc => {
        const name = doc.fields?.name?.stringValue || "No name";
        const qty = doc.fields?.quantity?.integerValue || 0;
        const div = document.createElement("div");
        div.textContent = `${name} (Available: ${qty})`;
        listDiv.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      listDiv.innerHTML = "<p>Failed to load user products.</p>";
    }
  };

})();
