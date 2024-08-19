const path = window.location.pathname;
const routeId=path.split('/')[2];
const videourl=`/api/route/${routeId}/video`;
console.log("check this out my video url:", videourl)  

const routeCardWrap = document.querySelector(".route-card-wrap");
const videoWrap = document.querySelector(".video-wrap");  
var userId="";


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
          userId=data.data.id;
          console.log("This is your id:",userId);
          // Dispatch the userSignedIn event only if the user is successfully authenticated
          document.dispatchEvent(new CustomEvent('userSignedIn', { detail: data.data.name }));

        })
        .catch((err) => {
          console.error("Error:", err.message);
        });
    } else {
      console.error("Token not found");
    }
  };



//getting route data
function getData(){

  const url ="/api/route/"+routeId
  let main="";
  

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
      console.log(data)
      let grade=data.grade;
      let routeID=data.routeID;
      let name=data.name;
    //   let deadline=data.expired;
      const expiredDate = new Date(`${data.expired}`); // Example date
      const today = new Date();
      const timeDiff = expiredDate - today;
      const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      main +=`
          <div class="route-card-grade" id="route_grade">${grade}</div>
            <div>
              <div class="route-card-title">
                <p id="route_name">${routeID} ${name}</p>
              </div>
              <div class="route-card-detail">
                <p id="route_sent">${data.flash} Flash</p>
                <p id="route_done">${data.done} Done</p>
                <p id="route_delete"><img src="/static/images/trash.svg">  ${daysLeft} days left</p>
              </div>
            </div> 
      `

      routeCardWrap.innerHTML += main; 
      
    })

}  



// fetching video

function getVideo(){
  fetch(videourl)
  .then(response => response.json())
  .then(data => {
    console.log("am I successful fetching video??",data)
      if (data.videos.length === 0) {
          // Display "add a video" image or message
          console.log("no video yet brother")
          document.querySelector('.video-wrap').classList.remove('show');
          document.querySelector('.video-image-wrap').classList.add('show');
          console.log("Video wrap classes:", document.querySelector('.video-wrap').className);
          console.log("Image wrap classes:", document.querySelector('.video-image-wrap').className);
          console.log("we have no video found")
          // displayAddVideoMessage();
      } else {
          // Display the videos
          document.querySelector('.video-wrap').classList.add('show');
          document.querySelector('.video-image-wrap').classList.remove('show');
          let Url=data.videos[0].mpd_url
          initApp(Url)
          console.log("we found some videos")

          
      }
  })
  .catch(error => {
      console.error('Error fetching videos:', error);
  });
}



// initialising player
async function initApp(url) {
    // Install built-in polyfills to patch browser compatibility issues.
    shaka.polyfill.installAll();

    // Check if the browser supports the features we need.
    if (shaka.Player.isBrowserSupported()) {
        // Call getVideo to fetch and play the video
        playVideo(url);
    } else {
        console.error('Browser not supported!');
    }
    }



async function playVideo(url) {
const videoElement = document.getElementById('video');
const player = new shaka.Player(videoElement);


try {
    // Load and play the video from the provided URL
    await player.load(url);
    console.log('The video has now been loaded and is playing!');
} catch (error) {
    // Handle any errors that occur during loading
    console.log(error);
}
}



getData()
getVideo()

//upload function 

document.getElementById("uploadButton").addEventListener("click", function() {
document.getElementById("videoInput").click();
});

document.getElementById("videoInput").addEventListener("change", function() {
const file = this.files[0];

if (file) {

    document.getElementById("spinner").style.display = "block";

    const formData = new FormData();
    formData.append("video", file);
    formData.append("route_id", routeId);

    // Send the file to the server
    fetch("/api/route", {
        method: "POST",
        body: formData
    }).then(response => response.json())
    .then(data => {
        console.log("Upload successful:", data);
        alert("Video uploaded successfully!");

        document.getElementById("spinner").style.display = "none";


    })
    .catch(error => {
        console.error("Upload failed:", error);
        alert("Video upload failed!");

        document.getElementById("spinner").style.display = "none";

    });

}
});


const routeSaveBtn = document.getElementById("route-save-btn");
const routeDoneBtn = document.getElementById("route-done-btn");
const routeFlashBtn = document.getElementById("route-flash-btn");

routeSaveBtn.addEventListener("click",handleSave)
routeDoneBtn.addEventListener("click", () => handleButtonClick(1));
routeFlashBtn.addEventListener("click", () => handleButtonClick(0));


function handleSave() {
            const token = localStorage.getItem("token");
            if(token){
                console.log("Save button clicked");
                fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        memberId: userId,  // Replace with actual data
                        routeId: routeId, // Replace with actual data

                    }),
                })
                .then(response => response.json())
                .then(data => {
                    result=data.ok
                    if (result == true){
                    console.log("Saved Successfuly!")
                    } else {
                    console.log("This is saved already!")
                    }

                })
                .catch((error) => {
                    console.error('Save Error:', error);
                });
            }else{
                alert("please log in first!")
            }
        }   

async function handleButtonClick(type) {
    const token = localStorage.getItem("token");
    console.log("clicke button is flash 0 or done 1:",type)

        if (token){
            try {
                const response = await fetch('/api/done', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        memberId: userId,
                        routeId: routeId,
                        type: type,
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    if (data.ok){
                        console.log("Record created succesfully")
                    }else{
                        console.log("Record already exists!")
                    }
                }
            } catch (error) {
                console.error('Fetch error:', error);
            }
        }else{
            alert("please log in first!")
        }        
    }    


// Function to calculate days ago
function daysAgo(dateString) {
    const inputDate = new Date(dateString);
    const currentDate = new Date();
    const timeDifference = currentDate - inputDate;
    const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    
    return daysDifference;
}

// Example usage
const dateString = "2024-08-17T08:51:21";
const daysAgoCount = daysAgo(dateString);

console.log(`The date was ${daysAgoCount} days ago.`);

// Done list that shows people who has finished the route

document.addEventListener('DOMContentLoaded', () => {
    const doneListWrap = document.getElementById('done-list-wrap');

    // const routeId = 1; // Example routeId

    function createUserCard(user) {
        const userCardWrap = document.createElement('div');
        userCardWrap.className = 'user-card-wrap';

        userCardWrap.innerHTML = `
            <div class="user-card-grade">
                <div class="user-image">${user.name[0]}</div>
            </div>
            <div class="user-card-name">
                <div class="user-card-info">
                    <p class="user-name">${user.name}</p>
                    <p class="user-grade">${user.grade}</p>
                </div>
                <div class="user-personal-data">
                    <p class="user-height">${user.height}</p>
                    <p class="user gender">${user.gender}</p>
                </div>
                <div class="user-card-detail">
                    <p class="user-date">${daysAgo(user.date)} days ago</p>
                </div>
            </div>
        `;

        return userCardWrap;
    }

    function displayData(data) {
        doneListWrap.innerHTML = '<h3 class="done-list-title">Who has done it: </h3>';

            data.forEach(user => {
                const userCard = createUserCard(user);
                doneListWrap.appendChild(userCard);
            });

            if (data.length === 0) {
                doneListWrap.innerHTML += '<p>Be the first one to climb this route!</p>';
            }

    }

    function handleError(error) {
        console.error('Error fetching data:', error);
        doneListWrap.innerHTML = '<p>Sorry, there was an error loading the data.</p>';
    }

    fetch(`/api/done/${routeId}`) // Replace with your API endpoint
        .then(response => response.json())
        .then(responseData => {
            const dataArray = responseData.data || []; // Default to empty array if data is undefined
            displayData(dataArray);
        })
        .catch(handleError);
});

