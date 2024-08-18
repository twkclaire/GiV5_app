const path = window.location.pathname;
const routeId=path.split('/')[2];
const videourl=`/api/route/${routeId}/video`;
console.log("check this out my video url:", videourl)  

const routeCardWrap = document.querySelector(".route-card-wrap");
const videoWrap = document.querySelector(".video-wrap");  
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
      let deadline=data.expired;
      
      main +=`
          <div class="route-card-grade" id="route_grade">${grade}</div>
            <div>
              <div class="route-card-title">
                <p id="route_name">${routeID} ${name}</p>
              </div>
              <div class="route-card-detail">
                <p id="route_sent">22 Sent</p>
                <p id="route_done">40 Done</p>
                <p id="route_delete">${deadline}</p>
              </div>
            </div> 
      `

      routeCardWrap.innerHTML += main; 
      
    })

}  



// video
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
            console.log("Save button clicked");
            fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    memberId: 1,  // Replace with actual data
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
        }

async function handleButtonClick(type) {
// Replace these values with your actual memberId and routeId
console.log("clicke button is flash 0 or done 1:",type)

try {
    const response = await fetch('/api/done', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            memberId: 1,
            routeId: routeId,
            type: type,
        }),
    });

    const data = await response.json();

    if (response.ok) {
        console.log(data);
    } else {
        console.error('Request failed:', data);
    }
} catch (error) {
    console.error('Fetch error:', error);
}
}        




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
                    <p class="user-date">${user.date}</p>
                </div>
            </div>
        `;

        return userCardWrap;
    }

    function displayData(data) {
        doneListWrap.innerHTML = '<h3>Who has done it: </h3>';

            data.forEach(user => {
                const userCard = createUserCard(user);
                doneListWrap.appendChild(userCard);
            });

            if (data.length === 0) {
                doneListWrap.innerHTML += '<p>No users found.</p>';
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

