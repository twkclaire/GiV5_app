const path = window.location.pathname;
const routeId=path.split('/')[2];
const videourl=`/api/route/${routeId}/video`;
const routeCardWrap = document.querySelector(".route-card-wrap");
const videoWrap = document.querySelector(".video-wrap");  



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

document.addEventListener("DOMContentLoaded", function() {
    const videoElement = document.getElementById('video'); 
    if (!videoElement) {
        console.error('Video element not found!');
        return;
    }

    let videos = [];
    let currentVideoIndex = 0;

    // Initialize Shaka Player
    async function initApp(url) {
        shaka.polyfill.installAll();

        if (shaka.Player.isBrowserSupported()) {
            const player = new shaka.Player(videoElement);
            window.player = player; // Make the player accessible for debugging
            // player.addEventListener('error', onErrorEvent);

            try {
                await player.load(url);
                // console.log('The video has now been loaded and is playing!');
            } catch (error) {
                console.error('Error loading video:', error);
            }
        } else {
            console.error('Browser not supported!');
        }
    }

    // function onErrorEvent(event) {
    //     console.error('Error code', event.detail.code, 'object', event.detail);
        
    // }

    function loadVideo(index) {
        if (index >= 0 && index < videos.length) {
            const url = videos[index].mpd_url;
            console.log(`Attempting to play: ${url}`);
            initApp(url);
            updateVideoStatus();
        }
    }

    fetch(videourl) 
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            videos = data.videos;
            console.log("Videos fetched successfully:", videos);
            if (videos.length > 0) loadVideo(currentVideoIndex);
            else console.log('No videos available.');
        })
        .catch(error => {
            console.error('Failed to fetch videos:', error);
        });

    document.getElementById('prevVideo')?.addEventListener('click', () => {
        console.log('Prev button clicked');
        if (currentVideoIndex > 0) {
            currentVideoIndex--;
            loadVideo(currentVideoIndex);
        }
    });

    document.getElementById('nextVideo')?.addEventListener('click', () => {
        console.log('Next button clicked');
        if (currentVideoIndex < videos.length - 1) {
            currentVideoIndex++;
            loadVideo(currentVideoIndex);
        }
    });

    function updateVideoStatus() {
        console.log(`Playing video ${currentVideoIndex + 1} of ${videos.length}`);
    }
});




// this is my coddddd// this is my coddddd// this is my coddddd// this is my coddddd
// fetching video

// function getVideo(){
//   fetch(videourl)
//   .then(response => response.json())
//   .then(data => {
//     console.log("am I successful fetching video??",data)
//       if (data.videos.length === 0) {
//           // Display "add a video" image or message
//           document.querySelector('.video-wrap').classList.remove('show');
//           document.querySelector('.video-image-wrap').classList.add('show');
//           console.log("Video wrap classes:", document.querySelector('.video-wrap').className);
//           console.log("Image wrap classes:", document.querySelector('.video-image-wrap').className);
//           console.log("we have no video found")

//       } else {
//           // Display the videos
//           document.querySelector('.video-wrap').classList.add('show');
//           document.querySelector('.video-image-wrap').classList.remove('show');
//           let Url=data.videos[0].mpd_url
//           initApp(Url)
//           console.log("we found some videos")

//       }
//   })
//   .catch(error => {
//       console.error('Error fetching videos:', error);
//   });
// }
// getVideo()


// initialising player
// async function initApp(url) {
//         shaka.polyfill.installAll();
//         if (shaka.Player.isBrowserSupported()) {
//             playVideo(url);
//         } else {
//             console.error('Browser not supported!');
//         }
//     }


// async function playVideo(url) {
//         const videoElement = document.getElementById('video');
//         const player = new shaka.Player(videoElement);

//         try {
//             await player.load(url);
//             console.log('The video has now been loaded and is playing!');
//         } catch (error) {

//             console.log(error);
//         }
//     }



getData()



// updated upload function using presigned url and trigger background process

document.getElementById("uploadButton").addEventListener("click", function() {
    const token = localStorage.getItem("token");
    if(token){
        document.getElementById("videoInput").click();
    }else{
        alert("please log in first!")
    }    
});

document.getElementById("videoInput").addEventListener("change", async function() {
    const file = this.files[0];

    if (file) {
        console.log(file.name, file.type, "this is the routeId:", routeId)
        try {
            document.getElementById("spinner").style.display = "block";

            // Step 1: Request a presigned URL from the backend
            const response = await fetch("/api/route/presigned-url", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    file_name: file.name,
                    content_type: file.type,
                    route_id:routeId
                })
            });

            const data = await response.json();
            const presignedUrl = data.presigned_url;
            const fileKey = data.file_key;
            const videoId =data.video_id;

            // Step 2: Upload the video file to S3 using the presigned URL
            await fetch(presignedUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type
                }
            });

            // Step 3: Notify the backend to start processing the video
            const processResponse = await fetch("/api/route/process-video", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    route_id: routeId,  
                    file_key: fileKey,
                    video_id: videoId
                })
            });

            const processResult = await processResponse.json();
            console.log("Video processing initiated:", processResult);
            displayStatus(processResult);

            displayNotification("Video uploaded. Stay on the page to process the video!");

            // alert("Video uploaded and processing started successfully!");

            // Step 4: Polling to check video process status 
            const statusCheckInterval = setInterval(async () => {
                if (!videoId){
                    console.error("videoId is not defined");
                    return; // Exit if videoId is not valid                
                }
                try {
                    const statusResponse = await fetch(`/api/route/video-status/${videoId}`);
                    if (!statusResponse.ok) {
                        throw new Error("Failed to get video status");
                    }
                    const statusData = await statusResponse.json();
                    console.log("Status Data:", statusData);
                    displayStatus(statusData.status)

                    if (statusData.status === "completed") {
                        clearInterval(statusCheckInterval);
                        displayNotification("Video process completed! Showing you in a second...");
                        console.log(`Video processing completed! You can watch it here: ${statusData.mpd_url}`)
                        // alert(`Video processing completed! You can watch it here: ${statusData.mpd_url}`);
                        getVideo()
                    }else if(statusData.status === "failed"){
                        clearInterval(statusCheckInterval);
                        alert("Video processing failed!");

                    }
                } catch (error) {
                    console.error("Status check failed:", error);
                    clearInterval(statusCheckInterval); // Ensure interval is cleared on error
                    alert("An error occurred while checking video status.");
                }
            }, 10000); // Check every 10 seconds


        } catch (error) {
            console.error("Upload or processing failed:", error);
            alert("Video upload or processing failed!");
        } finally {
            document.getElementById("spinner").style.display = "none";
        }
    }
});





const routeSaveBtn = document.getElementById("route-save-btn");
const routeDoneBtn = document.getElementById("route-done-btn");
const routeFlashBtn = document.getElementById("route-flash-btn");

routeSaveBtn.addEventListener("click",handleSave)
routeDoneBtn.addEventListener("click", () => handleButtonClick(1));
routeFlashBtn.addEventListener("click", () => handleButtonClick(0));


function handleSave() {
            console.log("savebutton check userId:",userId);
            const token = localStorage.getItem("token");
            if(token){
                console.log("Save button clicked");
                fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        memberId: userId,  
                        routeId: routeId, 

                    }),
                })
                .then(response => response.json())
                .then(data => {
                    result=data.ok
                    if (result == true){
                    console.log("Saved Successfuly!")
                    displayNotification("Route saved successfully!");
                    } else {
                    console.log("This is saved already!")
                    displayNotification("This route is saved. Check all saved route at My Page.");
                    }

                })
                .catch((error) => {
                    console.error('Save Error:', error);
                });
            }else{
                alert("please log in first!")
            }
        }   


function displayNotification(message) {
    const notification = document.getElementById("notification");
    notification.innerText = message;
    notification.style.display = "block";
    setTimeout(() => {
        notification.style.display = "none";
    }, 3000); // Hide notification after 3 seconds
}

// function displayStatus(message) {
//     const statusUpdate = document.getElementById("status-update");
//     statusUpdate.innerText = `Video processing status: ${message} `;
//     statusUpdate.style.display = "block";
// }

function displayStatus(message) {
    const statusUpdate = document.getElementById("status-update");
    const loaderContainer = document.getElementById("loader-container");

    if (message === "processing") {
        statusUpdate.style.display = "block";
        statusUpdate.classList.add("processing");
        statusUpdate.classList.remove("completed");
        statusUpdate.innerHTML = 'Video processing status: Processing';
        loaderContainer.style.display = "block"; // Show loader
    } else if (message === "completed") {
        statusUpdate.style.display = "block";
        statusUpdate.classList.add("completed");
        statusUpdate.classList.remove("processing");
        statusUpdate.innerHTML = 'Video processing status: Completed';
        loaderContainer.style.display = "none"; // Hide loader
    }
}


async function handleButtonClick(type) {
    console.log("flashdone check userId:",userId)
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
                        // console.log("flash/done")
                        displayNotification("Congrats!");
                    }else{
                        console.log("double click, change record")
                        displayNotification("Your record is changed");
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



// Done list that shows people who has finished the route

document.addEventListener('DOMContentLoaded', () => {
    const doneListWrap = document.getElementById('done-list-wrap');


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

    fetch(`/api/done/${routeId}`) 
        .then(response => response.json())
        .then(responseData => {
            const dataArray = responseData.data || []; // Default to empty array if data is undefined
            displayData(dataArray);
        })
        .catch(handleError);
});

