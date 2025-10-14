// firebase.js
const API_KEY = "AIzaSyC5kYvCD9088m14VuzEjJwGmYKLFI-79EA";
const PROJECT_ID = "shoppingcart-4b24e";

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const axiosInstance = axios.create({
    baseURL: BASE_URL
});

// Signup
async function signupREST(email, password, role) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
    const resp = await axios.post(url, { email, password, returnSecureToken: true });
    const uid = resp.data.localId;
    await axiosInstance.patch(`/users/${uid}?updateMask.fieldPaths=role`, { fields: { role: { stringValue: role } } });
    return resp.data;
}

// Login
async function loginREST(email, password) {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
    const resp = await axios.post(url, { email, password, returnSecureToken: true });
    return resp.data; // contains idToken, localId
}

// Get user role
async function getUserRole(uid) {
    const resp = await axiosInstance.get(`/users/${uid}`);
    return resp.data.fields.role.stringValue;
}

// CRUD for products (admin)
async function addProductREST(name, qty) {
    const data = { fields: { name: { stringValue: name }, qty: { integerValue: qty } } };
    await axiosInstance.post(`/products`, data);
}

async function getProductsREST() {
    const resp = await axiosInstance.get(`/products`);
    return resp.data.documents || [];
}

async function deleteProductREST(docId) {
    await axiosInstance.delete(`/products/${docId}`);
}

// User cart
async function addToCartREST(userId, product) {
    const data = { fields: { productId: { stringValue: product.id }, qty: { integerValue: product.qty } } };
    await axiosInstance.post(`/users/${userId}/cart`, data);
}
