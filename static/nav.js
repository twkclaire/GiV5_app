var userId=""
window.onload = function checkSigninStatus() {
    const token = localStorage.getItem("token");
    let content="";
    const dropdownContent=document.querySelector(".dropdown-content");
  
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
          document.dispatchEvent(new CustomEvent('userSignedIn', { detail: data.data.name }));
          userId=data.data.id
          console.log("is this the user id:",userId)
          content +=`
                <a href="/member/${userId}">My Page</a>
                <a href="/achievement/${userId}">My Achievements</a>
                <a href="#" onclick="deleteToken(); return false;">Log out</a>
          `  
          dropdownContent.innerHTML += content;
        })
        .catch((err) => {
          console.error("Error:", err.message);
        });
    } else {
      console.error("Token not found");
      content +=`
                <a href="/signin">Sign in</a>
                <a href="/register">Sign up</a>

          `  
          dropdownContent.innerHTML += content;
    }
  };

  function deleteToken() {
    let token = localStorage.removeItem("token");
    console.log("user signed out");
    window.location.reload();
    return token;
  }