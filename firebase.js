const FIREBASE_PROJECT_ID = "YOUR_PROJECT_ID";

function getIdToken() {
  return localStorage.getItem("firebaseIdToken");
}

// ✅ READ all documents
function getAllSoaps() {
  const idToken = getIdToken();
  fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/soaps`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${idToken}`,
      "Content-Type": "application/json"
    }
  })
  .then(res => res.json())
  .then(data => console.log("All Soaps:", data))
  .catch(err => console.error(err));
}

function createSoap(name, color) {
  const idToken = getIdToken();
  fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/soaps`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fields: {
        Name: { stringValue: name },
        color: { stringValue: color }
      }
    })
  })
  .then(res => res.json())
  .then(data => console.log("Created Soap:", data))
  .catch(err => console.error(err));
}

// Similarly, you can create PATCH and DELETE functions
