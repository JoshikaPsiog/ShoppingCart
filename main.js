const CLIENT_ID = "41311417043-t30ieu5fgspi7ca6rqi4p3eljqld8lcf.apps.googleusercontent.com";
const REDIRECT_URI = "http://localhost:5500/auth.html"; // include .html

document.addEventListener("DOMContentLoaded", () => {
  const googleBtn = document.getElementById("googleLoginBtn");

  if (googleBtn) {
    googleBtn.onclick = () => {
      const oauthURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=openid%20email%20profile`;
      window.location.href = oauthURL;
    };
  }

  if (window.location.hash.includes("access_token")) {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const googleAccessToken = params.get("access_token");
    console.log("Google Access Token:", googleAccessToken);

    exchangeTokenToFirebase(googleAccessToken);
  }
});

function exchangeTokenToFirebase(googleToken) {
  const FIREBASE_API_KEY = "AIzaSyC5kYvCD9088m14VuzEjJwGmYKLFI-79EA"; 
  const body = {
    postBody: `access_token=${googleToken}&providerId=google.com`,
    requestUri: REDIRECT_URI,
    returnSecureToken: true
  };

  fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })
    .then(res => res.json())
    .then(data => {
      console.log("Firebase ID Token:", data.idToken);
      sessionStorage.setItem("firebaseIdToken", data.idToken);
      alert("Login Successful! Firebase token saved.");
      window.location.href = "index.html";
    })
    .catch(err => console.error("Error exchanging token:", err));
}
