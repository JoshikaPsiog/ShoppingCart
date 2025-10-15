// products.js
const PROJECT_ID = "shoppingcart-4b24e";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const PRODUCTS_API = `${BASE_URL}/products`;

const axiosInstance = axios.create({ baseURL: BASE_URL });

/* ✅ Fetch all products */
async function fetchAllProducts() {
  try {
    const resp = await axiosInstance.get("/products");
    return resp.data.documents.map(doc => ({
      id: doc.name.split("/").pop(),
      name: doc.fields.name.stringValue,
      qty: doc.fields.qty.integerValue
    }));
  } catch (err) {
    console.error("Error fetching products:", err);
    return [];
  }
}

/* ✅ Add new product (Admin only) */
async function addProductREST(name, qty, idToken) {
  try {
    await axios.post(
      `${PRODUCTS_API}/${name}?currentDocument.exists=false`,
      { fields: { name: { stringValue: name }, qty: { integerValue: qty } } },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
    alert("✅ Product added!");
  } catch (err) {
    console.error("Failed to add product:", err);
    alert("❌ Could not add product (maybe already exists?)");
  }
}

/* ✅ Delete product (Admin only) */
async function deleteProductREST(name, idToken) {
  try {
    await axios.delete(`${PRODUCTS_API}/${name}`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    alert("🗑️ Product deleted!");
  } catch (err) {
    console.error("Failed to delete:", err);
  }
}
