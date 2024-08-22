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



// fetching video

function getVideo(){
  fetch(videourl)
  .then(response => response.json())
  .then(data => {
    console.log("am I successful fetching video??",data)
      if (data.videos.length === 0) {
          // Display "add a video" image or message
          document.querySelector('.video-wrap').classList.remove('show');
          document.querySelector('.video-image-wrap').classList.add('show');
          console.log("Video wrap classes:", document.querySelector('.video-wrap').className);
          console.log("Image wrap classes:", document.querySelector('.video-image-wrap').className);
          console.log("we have no video found")

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
        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
            playVideo(url);
        } else {
            console.error('Browser not supported!');
        }
    }


async function playVideo(url) {
        const videoElement = document.getElementById('video');
        const player = new shaka.Player(videoElement);

        try {
            await player.load(url);
            console.log('The video has now been loaded and is playing!');
        } catch (error) {

            console.log(error);
        }
    }



getData()
getVideo()


// updated upload function using presigned url and trigger background process

document.getElementById("uploadButton").addEventListener("click", function() {
    document.getElementById("videoInput").click();
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
                    content_type: file.type
                })
            });

            const data = await response.json();
            const presignedUrl = data.presigned_url;
            const fileKey = data.file_key;

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
                    file_key: fileKey
                })
            });

            const processResult = await processResponse.json();
            console.log("Video processing initiated:", processResult);

            alert("Video uploaded and processing started successfully!");

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

