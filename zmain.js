// const CLIENT_ID = "41311417043-t30ieu5fgspi7ca6rqi4p3eljqld8lcf.apps.googleusercontent.com";
// const REDIRECT_URI = "http://localhost:5500/auth.html"; 
// const FIREBASE_API_KEY = "AIzaSyC5kYvCD9088m14VuzEjJwGmYKLFI-79EA";

// document.addEventListener("DOMContentLoaded", () => {
//   const googleBtn = document.getElementById("googleLoginBtn");

//   //  Login with Google
//   if (googleBtn) {
//     googleBtn.onclick = () => {
//       const oauthURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=openid%20email%20profile`;
//       window.location.href = oauthURL;
//     };
//   }

//   // Extract access_token from URL
//   if (window.location.hash.includes("access_token")) {
//     const params = new URLSearchParams(window.location.hash.substring(1));
//     const googleAccessToken = params.get("access_token");
//     console.log("Google Access Token:", googleAccessToken);

//     if (googleAccessToken) {
//       exchangeTokenToFirebase(googleAccessToken);
//     } else {
//       console.error("No access token found in URL!");
//     }
//   }
// });

// // Exchange Google token -> Firebase token using Axios
// async function exchangeTokenToFirebase(googleToken) {
//   const body = {
//     postBody: `access_token=${googleToken}&providerId=google.com`,
//     requestUri: REDIRECT_URI,
//     returnSecureToken: true
//   };

//   try {
//     const response = await axios.post(
//       `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
//       body,
//       { headers: { "Content-Type": "application/json" } }
//     );

//     console.log("Firebase Response:", response.data);
//     const firebaseIdToken = response.data.idToken;

//     if (firebaseIdToken) {
//       sessionStorage.setItem("firebaseIdToken", firebaseIdToken);
//       console.log("Firebase ID Token stored!");
//       alert("Login Successful!");
//       window.location.href = "index.html";
//     } else {
//       console.error("No Firebase ID token received!");
//     }

//   } catch (error) {
//     console.error("❌ Error exchanging token:", error.response?.data || error);
//     alert("Login failed. Check console for details.");
//   }
// }
