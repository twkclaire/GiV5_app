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
    submitBtn.addEventListener("click", function (event) {
      event.preventDefault();
        bullet[current - 1].classList.add("active");
        progressCheck[current - 1].classList.add("active");
        progressText[current - 1].classList.add("active");
        registerUser ();
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





//register 

// const submitBtn = document.querySelector(".submit");

function registerUser () {  
const email = document.getElementById('email').value;
const password = document.getElementById('password').value;
const username = document.getElementById('username').value;
const gender = document.getElementById('gender').value;
const height = document.getElementById('height').value;
const grade = document.getElementById('grade').value;
const footerResult =document.querySelector('.footer-result')
const form = document.querySelector('form');

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
      footerResult.innerHTML=`
            <p>Registered Succesfully</p>
            <p>Sign in <a href="/signin">here</a></p>
      `;
      console.log("footerResult:", footerResult);
      form.reset();

    } else {
      alert(`${data.message}`)
      form.reset();
    }
  })
  .catch((err) => {
    console.error("Error:", err); 
  });

}