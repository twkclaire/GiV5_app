const path = window.location.pathname;
const memberId=path.split('/')[2];
console.log(memberId)
const url=`/api/member/${memberId}`;
const savedUrl=`/api/save/${memberId}`;
console.log("check this out my video url:", url)  
const personalInfoWrap = document.querySelector(".personal-info-wrap");
const todoCardWrap= document.querySelector(".todo-card-wrap");



function getSavedRoute() {
    fetch(savedUrl)
    .then(response => {
        if (!response.ok) {
            return response.json().then(error => {
                throw new Error(error.message);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Data fetched:", data); 
        let mainHTML = "";
        if (data.data.length === 0) {
            console.log("no saved data");
            mainHTML = "<div class='no-data'>You don't have anything saved yet!</div>";
            todoCardWrap.innerHTML = mainHTML;
            return;
        }

        data.data.forEach(route => {
            mainHTML += `
                <div class="card-wrap data-route-id="${route.routeId}" onclick="navigateToRoute(this)">
                    <a href="/route/${route.routeId}" class="card-link"></a>
                    <div class="card-grade"><div>${route.routeGrade}</div></div>
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

        todoCardWrap.innerHTML += mainHTML;
    })
    .catch(error => {
        console.error('Error fetching saved routes:', error);
    });
}

// make to do card clickable
function navigateToRoute(element) {
    const routeId = element.getAttribute('data-route-id');
    window.location.href = `/route/${routeId}`;
}



function deleteRoute(event,routeId, buttonElement) {
    event.stopPropagation() //prevent event bubbling
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
    .then(data => {
        // alert('Record deleted successfully!');
        buttonElement.closest('.card-wrap').remove(); // Remove the card from the UI
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred: ' + error.message);
    });
}



async function handleButtonClick(event, type, routeId) {
    event.stopPropagation() //prevent event bubbling
    const token = localStorage.getItem("token");
    console.log("Clicked button is flash 0 or done 1:", type, "for route ID:", routeId, "member id is:", memberId);

    if (token) {
        try {
            const response = await fetch('/api/done', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
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
                    getMemberData();
                } else {
                    console.log("Record already exists!");
                }
            } else {
                console.error('Response error:', data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        }
    } else {
        alert("Please log in first!");
    }
}
  



// member info
function getMemberData(){
    let main =""
    fetch(url)
    .then((response) => {
        if(!response.ok){
            return response.json().then((error) => {
                throw new Error(error.message);
            });
            
        }
        return response.json();

    })
    .then((data)=>{
        // console.log(data)
        let initial=data.username[0];
        let username=data.username;
        let height=data.height;
        let gender=data.gender;
        let grade=data.grade;
        let done=data.done;
        let flash=data.flash;
        
        main +=`     
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
        `
  
        personalInfoWrap.innerHTML += main; 
        
      })
    .catch(error => {
        console.error('Error fetching videos:', error);
    });  
  
  } 

//   getMemberData(); 

  document.addEventListener('DOMContentLoaded', function() {
    getMemberData();  
    getSavedRoute();
});




document.addEventListener('DOMContentLoaded', function () {
    fetch(`/api/data/${memberId}`)
        .then(response => response.json())
        .then(data => {
            // Monthly achievement chart
            const flash = data.data.monthly_achievement.flash;
            const done = data.data.monthly_achievement.done;

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
                            position: 'top'
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
            });

            // All-time achievement chart
             // Define the expected order
             const expectedOrder = ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9"];
            
             // Extract keys from data
             const allTimeAchievement = data.data.all_time_achievement;
 
             // Sort the keys based on the expected order
             const labels = expectedOrder.filter(grade => allTimeAchievement.hasOwnProperty(grade));
             const flashData = labels.map(grade => allTimeAchievement[grade].flash);
             const doneData = labels.map(grade => allTimeAchievement[grade].done);
 
             // Create the chart
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
                     scales: {
                         x: {
                             stacked: true
                         },
                         y: {
                             stacked: true
                         }
                     }
                 }
             });
         })
         .catch(error => {
             console.error('Error fetching data:', error);
         });
 });



//  var userId=""
//  window.onload = function checkSigninStatus() {
//      const token = localStorage.getItem("token");
//      let content="";
//      const dropdownContent=document.querySelector(".dropdown-content");
 
//      if (token) {
//      fetch("/api/user/auth", {
//          method: "GET",
//          headers: { Authorization: `Bearer ${token}` },
//      })
//          .then((resp) => {
//          if (!resp.ok) {
//              return resp.json().then((data) => {
//              throw new Error(`HTTP error! Status: ${resp.status}, Message: ${data.detail}`);
//              });
//          }
//          return resp.json();
//          })
//          .then((data) => {
//          console.log("Fetch successful:", data);
//          document.dispatchEvent(new CustomEvent('userSignedIn', { detail: data.data.name }));
//          userId=data.id
//          })
//          .catch((err) => {
//          console.error("Error:", err.message);
//          });
//      } else {
//      console.error("Token not found");

//      }
//  };
