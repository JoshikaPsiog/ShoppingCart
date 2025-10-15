(async () => {
//   const idToken = sessionStorage.getItem("idToken");
  const role = sessionStorage.getItem("role");
  const BASE_URL = "https://firestore.googleapis.com/v1/projects/shoppingcart-4b24e/databases/(default)/documents";

  if (role !== "admin") return;

  const productList = document.getElementById("productList");

  async function loadProducts() {
    const listDiv = document.getElementById("productList");
    listDiv.innerHTML = "";
    try {
      const resp = await axios.get(`${BASE_URL}/products?pageSize=50`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });

      const products = resp.data.documents || [];
      if (products.length === 0) {
        listDiv.innerHTML = "<p>No magical items yet 🧙‍♂️</p>";
        return;
      }

      products.forEach(doc => {
        const id = doc.name.split("/").pop();
        const name = doc.fields?.name?.stringValue || "Unnamed item";
        const qty = parseInt(doc.fields?.qty?.integerValue) || 0;

        const div = document.createElement("div");
        div.className = "item";
        div.innerHTML = `<strong>${name}</strong> — Qty: ${qty}
          <button class="btn-danger" onclick="deleteProduct('${id}')">Delete</button>`;
        listDiv.appendChild(div);
      });
    } catch (err) {
      console.error("Product fetch error:", err.response?.data || err);
      listDiv.innerHTML = "<p>Failed to load products. (Check collection path)</p>";
    }
  }

  window.addProduct = async function() {
    const name = document.getElementById("productName").value.trim();
    const qtyVal = parseInt(document.getElementById("productQty").value);
    const qty = isNaN(qtyVal) ? 0 : qtyVal;
    if (!name) return alert("Enter product name & quantity");

    try {
      await axios.post(`${BASE_URL}/products`, {
        fields: {
          name: { stringValue: name },
          qty: { integerValue: qty }
        }
      }, { headers: { Authorization: `Bearer ${idToken}` } });
      alert("Product added!");
      loadProducts();
    } catch (err) {
      console.error("Add error:", err);
      alert("Failed to add product.");
    }
  };

  window.deleteProduct = async function(id) {
    try {
      await axios.delete(`${BASE_URL}/products/${id}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      loadProducts();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  loadProducts();
})();
