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
        console.log("Data fetched:", data); // Debugging
        let mainHTML = "";
        if (data.data.length === 0) {
            console.log("no saved data")
            mainHTML = "<div class='no-data'>You don't have anything saved yet!</div>";
            todoCardWrap.innerHTML = mainHTML;
            return;
        }

        
        data.data.forEach(route => {
            mainHTML += `

                <div class="card-wrap">
                    <div class="card-grade"><div>${route.routeGrade}</div></div>
                    <div class="card-name">
                        <p>${route.routeId}. ${route.routeName}</p>
                        <div class="card-detail">
                            <p>${route.expiredDate}</p>
                        </div>  
                    </div>
                    <div class="card-btn-wrap">
                        <button>Flash</button>
                        <button>Done</button>
                        <button><img src="/static/images/cross.svg"></button>
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



// function getSavedRoute(){
//     let main =""
//     fetch(savedUrl)
//     .then((response) => {
//         if(!response.ok){
//             return response.json().then((error) => {
//                 throw new Error(error.message);
//             });
            
//         }
//         return response.json();

//     })
//     .then((data)=>{
//         console.log("this is saved routes:",data)

//         data.forEach(route =>{
//             main +=`
//             <div class="card-wrap">
//                 <div class="card-grade"><div>${route.routeGrade}</div></div>
//                 <div class="card-name">
//                     <p>${route.routeId}. ${route.routeName} </p>
//                     <div class="card-detail">
//                         <p>${expiredDate}</p>
//                     </div>  
//                 </div>
//                  <div class="card-btn-wrap">
//                     <button>Flash</button>
//                     <button>Done</button>
//                     <button><img src="/static/images/cross.svg"></button>
//                 </div>  
//             </div>
            
//             `
//         })

  
//         todoCardWrap.innerHTML += main; 
        
//       })
//     .catch(error => {
//         console.error('Error fetching videos:', error);
//     });  
  
//   }








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
    getMemberData();  // Ensures DOM is fully loaded
    getSavedRoute();
});
