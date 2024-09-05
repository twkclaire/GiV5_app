const path = window.location.pathname;
const memberId = path.split('/')[2];
const url = `/api/member/${memberId}`;
const savedUrl = `/api/save/${memberId}`;
const personalInfoWrap = document.querySelector(".personal-info-wrap");
const todoCardWrap = document.querySelector(".todo-card-wrap");

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
            userId=data.data.id
            if (userId==memberId){
            console.log("Fetch successful:", data);
            document.dispatchEvent(new CustomEvent('userSignedIn', { detail: data.data.name }));
            userId=data.data.id
            console.log("is this the user id:",userId)
            content +=`
                    <a id="myButton" onclick="openPopup()">User Guide</a>
                    <a href=/achievement/${userId}>Achievements</a>
                    <a href="#" onclick="deleteToken(); return false;">Log out</a>
            `  
            dropdownContent.innerHTML += content;
            }else{
                window.location.href=`/member/${userId}`
            }    
        })
        .catch((err) => {
          console.error("Error:", err.message);
        });
    } else {
      console.error("Token not found");
      window.location.href="/";
    //   content +=`
    //             <a href="/signin">Sign in</a>
    //             <a href="/register">Sign up</a>

    //       `  
    //       dropdownContent.innerHTML += content;
    }
  };

  function deleteToken() {
    let token = localStorage.removeItem("token");
    console.log("user signed out");
    window.location.href="/";
    return token;
  }

  const closePopup = document.getElementById('closePopup');
  const myPopup = document.getElementById('myPopup');  
  function openPopup(){
    myPopup.classList.add('show');
  }

  closePopup.addEventListener('click', function () {
    myPopup.classList.remove('show');
});



function getSavedRoute() {
    const token = localStorage.getItem("token");
    if(token){
        fetch(savedUrl,{
                method:"GET",
                headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.message);
                    });
                }
                return response.json();
            })
            .then(data => {
                let mainHTML = "";
                if (data.data.length === 0) {
                    mainHTML = "<div class='no-data'>You don't have anything saved yet!</div>";
                    todoCardWrap.innerHTML = mainHTML;
                    return;
                }

                data.data.forEach(route => {
                    mainHTML += `
                        <div class="card-wrap" data-route-id="${route.routeId}" onclick="navigateToRoute(this)">
                            <a href="/route/${route.routeId}" class="card-link"></a>
                            <div class="card-grade"><div class="grade-font">${route.routeGrade}</div></div>
                            <div class="card-name">
                                <p>${route.routeId}. ${route.routeName}</p>
                                <div class="card-detail">
                                    <p>${route.expiredDate}</p>
                                </div>  
                            </div>
                            <div class="card-btn-wrap">
                                <button onclick="handleButtonClick(event, 0, ${route.routeId})">Flash</button>
                                <button onclick="handleButtonClick(event, 1, ${route.routeId})">Done</button>
                                <button onclick="deleteRoute(event, '${route.routeId}', this)"><img src="/static/images/cross.svg"></button>
                            </div>  
                        </div>
                    `;
                });

                todoCardWrap.innerHTML = mainHTML;
            })
            .catch(error => {
                console.error('Error fetching saved routes:', error);
            });
        }else{
            alert("please sign in!")
            window.location.href="/";
        }        
}

function navigateToRoute(element) {
    const routeId = element.getAttribute('data-route-id');
    window.location.href = `/route/${routeId}`;
}

function deleteRoute(event, routeId, buttonElement) {
    event.stopPropagation(); // Prevent event bubbling
    const data = {
        memberId: memberId,
        routeId: routeId
    };

    fetch('/api/save', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            return response.json().then(errorData => {
                throw new Error(errorData.message || "Failed to delete the record.");
            });
        }
    })
    .then(() => {
        // Remove the card from the UI
        buttonElement.closest('.card-wrap').remove();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred: ' + error.message);
    });
}

async function handleButtonClick(event, type, routeId) {
    
    event.stopPropagation(); // Prevent event bubbling
    const token = localStorage.getItem("token");

    if (token) {
        try {
            const response = await fetch('/api/done', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    memberId: memberId,
                    routeId: routeId,
                    type: type,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.ok) {
                    console.log("Record created successfully");
                    displayNotification("Congrats!")
                    // Update counts after successful record creation
                    const memberData = await getMemberData();
                    if (memberData) {
                        updateCounts(memberData.flash, memberData.done);
                    }
                } else {
                    console.log("Record already exists!");
                    displayNotification("Your record is changed");
                }
            } else {
                console.error('Response error:', data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        }
    } 
    // else {
    //     alert("Please log in first!");
    // }
}

function displayNotification(message) {
    const notification = document.getElementById("notification");
    notification.innerText = message;
    notification.style.display = "block";
    setTimeout(() => {
        notification.style.display = "none";
    }, 3000); // Hide notification after 3 seconds
}

function getMemberData() {
    const token = localStorage.getItem("token");
    if(token){
        return fetch(url,{
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(error => {
                        throw new Error(error.message);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Prepare the HTML for personal-info-wrap
                const initial = data.username[0];
                const username = data.username;
                const height = data.height;
                const gender = data.gender;
                const grade = data.grade;
                const done = data.done;
                const flash = data.flash;
                
                const personalInfoHTML = `
                    <div class="personal-image-wrap">
                        <div class="personal-image">${initial}</div>
                    </div>
                    <div class="personal-info">
                        <div class="personal-name"><h2>${username}</h2></div>
                        <div class="personal-data">
                            <p>${height} cm</p>
                            <p>${grade}</p>
                            <p>${gender}</p>
                        </div>
                        <div class="personal-number">
                            <p>Flash: ${flash}</p>
                            <p>Done: ${done}</p>
                        </div>
                    </div>
                `;
    
                personalInfoWrap.innerHTML = personalInfoHTML;
            })
            .catch(error => {
                console.error('Error fetching member data:', error);
            });
    }
    // else{
    //     alert("please sign in!")
    // }    
}

function updateCounts(flash, done) {
    const flashElement = document.querySelector('.personal-number p:first-of-type');
    const doneElement = document.querySelector('.personal-number p:nth-of-type(2)');
    if (flashElement && doneElement) {
        flashElement.textContent = `Flash: ${flash}`;
        doneElement.textContent = `Done: ${done}`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    getMemberData(); 
    getSavedRoute(); 
});


document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem("token");
    if(token){
        fetch(`/api/data/${memberId}`,{
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
        })
            .then(response => response.json())
            .then(data => {
                // Monthly achievement chart
                console.log("monthly achievement:",data)
                const flash = data.data.monthly_achievement.flash;
                const done = data.data.monthly_achievement.done;
                const noDataMessage = document.querySelector('.no-data-message');

                if(flash == null && done==null){
                    noDataMessage.style.display = 'block';
                }else{
                    noDataMessage.style.display = 'none';
                    const ctxMonth = document.getElementById('monthChart').getContext('2d');
                    new Chart(ctxMonth, {
                        type: 'doughnut',
                        data: {
                            labels: ['Flash', 'Done'],
                            datasets: [{
                                data: [flash, done],
                                backgroundColor: ['rgba(193,28,132, 1)', 'rgba(34,34,34, 1)'],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 10,
                                    bottom:20
                                },
                                font:{
                                    size:16,
                                    weight:'bold'
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(tooltipItem) {
                                            return tooltipItem.label + ': ' + tooltipItem.raw;
                                        }
                                    }
                                },
                                datalabels: {
                                    color: '#fff',
                                    display: true,
                                    anchor: 'end',
                                    align: 'top',
                                    formatter: (value) => value,
                                    font: {
                                        weight: 'bold',
                                        size: 14
                                    }
                                },
                                title: {
                                    display: true,
                                    text: 'Your achievement this month',
                                    font: {
                                        size: 16,
                                        weight: 'bold'
                                    },
                                    color: '#333',
                                    padding: {
                                        bottom: 10
                                    }
                                }
                            }
                        }
                    })};

                

                // All-time achievement chart
                const expectedOrder = ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9"];

                const allTimeAchievement = data.data.all_time_achievement;
    
                // Sort the keys based on the expected order
                const labels = expectedOrder.filter(grade => allTimeAchievement.hasOwnProperty(grade));
                const flashData = labels.map(grade => allTimeAchievement[grade].flash);
                const doneData = labels.map(grade => allTimeAchievement[grade].done);
    
                const ctxThreeMonth = document.getElementById('threeMonthChart').getContext('2d');
                new Chart(ctxThreeMonth, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Flash',
                                data: flashData,
                                backgroundColor: 'rgba(193,28,132, 1)',
                            },
                            {
                                label: 'Done',
                                data: doneData,
                                backgroundColor: 'rgba(34,34,34, 1)',
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'All Time Achievement',
                                padding: {
                                    top: 10,
                                    bottom: 20
                                },
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            }
                        },
                        scales: {
                            x: {
                                stacked: true
                            },
                            y: {
                                stacked: true,
                                ticks: {
                                    // Configure y-axis ticks to display only integers
                                    stepSize: 1,
                                    callback: function(value) {
                                        // Format the tick value to be an integer
                                        return Number.isInteger(value) ? value : '';
                                    }
                                }
                

                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    }
    // else{
    //     alert("please log in first!")
    // }     
 });

