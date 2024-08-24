const path = window.location.pathname;
const memberId = path.split('/')[2];
const url = `api/achievement/${memberId}`;



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
            console.log("Fetch successful:", data);
            document.dispatchEvent(new CustomEvent('userSignedIn', { detail: data.data.name }));
            userId=data.data.id
            console.log("is this the user id:",userId)
            content +=`
                    <a href=/member/${userId}>My To do Routes</a>
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



async function fetchAchievements() {
    try {
        const response = await fetch(`/api/achievement/${memberId}`);
        const data = await response.json();
        console.log(data);
        if (data.error) {
            console.error(data.message);
            return;
        }
        
        renderAchievements(data.data);
    } catch (error) {
        console.error('Error fetching achievements:', error);
    }
}

function renderAchievements(achievements) {
    const container = document.getElementById('achievements-container');

    achievements.forEach(achievement => {
        const { routeId, name, grade, date, type } = achievement;

        // Convert type (0 or 1) to string
        const typeString = type === 0 ? 'Flash' : 'Done'; 

        const cardHTML = `
            <div class="achievement-card" data-route-id=${routeId} onclick="navigateToRoute(this)">
                <div class="achievement-grade">${grade}</div>
                <div class="achievement-info">
                    <div class="route-info">
                        <p class="route-name">${routeId} ${name}</p>
                    </div>
                    <div class="achievement-details">
                        <p class="achieve-date">Achieved on: ${new Date(date).toLocaleDateString()}</p>
                        <p class="achievement-type">${typeString}</p>
                    </div>
                </div>
                <div class="achievement-btn-wrap">
                    <button class="undo-btn" onclick="deleteAchi(event, '${routeId}', this)">Undo</button>
                </div>
            </div>
        `;

        container.innerHTML+=cardHTML;
    });
}

function navigateToRoute(element) {
    const routeId = element.getAttribute('data-route-id');
    window.location.href = `/route/${routeId}`;
}

//delete button

function deleteAchi(event, routeId, buttonElement) {
    event.stopPropagation(); // Prevent event bubbling
    const data = {
        memberId: memberId,
        routeId: routeId
    };

    fetch('/api/achievement/delete', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
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
        buttonElement.closest('.achievement-card').remove();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred: ' + error.message);
    });
}




document.addEventListener('DOMContentLoaded', () => {
    fetchAchievements(); 
});