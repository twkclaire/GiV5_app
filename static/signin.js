// register and sign in are sharing js. they share the same button as trigger. 

const submitBtn = document.querySelector(".submit");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

submitBtn.addEventListener("click", function(event) {
    event.preventDefault();

    // Check if both fields are filled
    if (emailInput.value.trim() === "" || passwordInput.value.trim() === "") {
        alert("Please fill in all fields.");
        return; 
    }

    // Validate the email format
    if (!isValidEmail(emailInput.value.trim())) {
        alert("Invalid email format.");
        return; 
    }

    var emailSign = emailInput.value.trim();
    var passwordSign = passwordInput.value.trim();

    const authUrl = "/api/user/auth";
    fetch(authUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: emailSign,
            password: passwordSign,
        }),
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.token) {
            let JWTtoken = data.token;
            console.log(JWTtoken);
            localStorage.setItem("token", JWTtoken);
            console.log("Login successful!");
            alert("Login succesfully!")
            // signInResult.innerText = "Login successful!";
            window.location.href = "/"
        } else {
            console.log(data.message);
            alert(data.message)
        }
    })
    .catch((err) => {
        console.error("Error:", err);
    });
});



window.onload = function checkSigninStatus() {
    const token = localStorage.getItem("token");
  
    if (token) {
      fetch("/api/user/auth", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((resp) => {
          if (!resp.ok) {
            return resp.json().then((data) => {
              throw new Error(`HTTP error! Status: ${resp.status}, Message: ${data.detail}`);
            });
          }
          return resp.json();
        })
        .then((data) => {
          console.log("Fetch successful:", data);
          // Dispatch the userSignedIn event only if the user is successfully authenticated
          document.dispatchEvent(new CustomEvent('userSignedIn', { detail: data.data.name }));
          window.location.href = "/"
        })
        .catch((err) => {
          console.error("Error:", err.message);
        });
    } else {
      console.error("Token not found");
    }
  };


function deleteToken() {
    let token = localStorage.removeItem("token");
    console.log("user signed out");
    window.location.reload();
    return token;
  }