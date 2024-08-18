

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



initMultiStepForm();

function initMultiStepForm() {
    const progressNumber = document.querySelectorAll(".step").length;
    const slidePage = document.querySelector(".slide-page");
    const submitBtn = document.querySelector(".submit");
    const progressText = document.querySelectorAll(".step p");
    const progressCheck = document.querySelectorAll(".step .check");
    const bullet = document.querySelectorAll(".step .bullet");
    const pages = document.querySelectorAll(".page");
    const nextButtons = document.querySelectorAll(".next");
    const prevButtons = document.querySelectorAll(".prev");
    const stepsNumber = pages.length;

    if (progressNumber !== stepsNumber) {
        console.warn(
            "Error, number of steps in progress bar do not match number of pages"
        );
    }

    document.documentElement.style.setProperty("--stepNumber", stepsNumber);

    let current = 1;

    for (let i = 0; i < nextButtons.length; i++) {
        nextButtons[i].addEventListener("click", function (event) {
            event.preventDefault();

            inputsValid = validateInputs(this);
            // inputsValid = true;

            if (inputsValid) {
                slidePage.style.marginLeft = `-${
                    (100 / stepsNumber) * current
                }%`;
                bullet[current - 1].classList.add("active");
                progressCheck[current - 1].classList.add("active");
                progressText[current - 1].classList.add("active");
                current += 1;
            }
        });
    }

    for (let i = 0; i < prevButtons.length; i++) {
        prevButtons[i].addEventListener("click", function (event) {
            event.preventDefault();
            slidePage.style.marginLeft = `-${
                (100 / stepsNumber) * (current - 2)
            }%`;
            bullet[current - 2].classList.remove("active");
            progressCheck[current - 2].classList.remove("active");
            progressText[current - 2].classList.remove("active");
            current -= 1;
        });
    }
    submitBtn.addEventListener("click", function () {
        bullet[current - 1].classList.add("active");
        progressCheck[current - 1].classList.add("active");
        progressText[current - 1].classList.add("active");
        // current += 1;
        // setTimeout(function () {
        //     alert("Your Form Successfully Signed up");
        //     location.reload();
        // }, 800);
    });

    function validateInputs(ths) {
        let inputsValid = true;

        const inputs =
            ths.parentElement.parentElement.querySelectorAll("input");
        for (let i = 0; i < inputs.length; i++) {
            const valid = inputs[i].checkValidity();
            if (!valid) {
                inputsValid = false;
                inputs[i].classList.add("invalid-input");
            } else {
                inputs[i].classList.remove("invalid-input");
            }
        }
        return inputsValid;
    }
}



//reference how to connect to backend

function registerUser(event) {
    event.preventDefault(); // Prevent form submission
  
    var nameRe = document.getElementById("namere").value;
    var emailRe = document.getElementById("emailre").value;
    var passwordRe = document.getElementById("passwordre").value;
    var resultRe = document.getElementById("resultre");
    // console.log(nameRe, emailRe, passwordRe);

  
    const userUrl = "/api/user";
    fetch(userUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nameRe,
        email: emailRe,
        password: passwordRe,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.ok) {
          resultRe.innerText = "註冊成功！！";
        } else {
          resultRe.innerText = data.message;
        }
      })
      .catch((err) => {
        console.error("Error:", err); //this error handling isn't throwing my network error correctly
      });
  }


const submitBtn = document.querySelector(".submit");

submitBtn.addEventListener("click", function () {
const email = document.getElementById('email').value;
const password = document.getElementById('password').value;
const username = document.getElementById('username').value;
const gender = document.getElementById('gender').value;
const height = document.getElementById('height').value;
const grade = document.getElementById('grade').value;

if (!email || !password || !username || !gender || !height || !grade) {
    alert("All fields are required!");
    return;
  }

const userUrl = "/api/user";
fetch(userUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: email,
    password: password,
    username: username,
    gender: gender,
    height:  height,
    grade: grade,

  }),
})
  .then((response) => response.json())
  .then((data) => {
    if (data.ok) {
      alert("Register Succesfully. Please Sign in.")
    } else {
      alert(`${data.message}`)
    }
  })
  .catch((err) => {
    console.error("Error:", err); 
  });

// console.log("Email:", email);
// console.log("Password:", password);
// console.log("Username:", username);
// console.log("Gender:", gender);
// console.log("Height:", height);
// console.log("Grade:", grade);
})