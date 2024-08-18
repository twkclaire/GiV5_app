var src="";
var keyword=""
var page=0;
var isFetching = false;
const cardsWrap=document.querySelector(".cards-wrap") 

function getKeyword() {
    keyword=document.querySelector(".route-search").value;
    console.log(keyword)
    return keyword
}

const routeSubmitBtn=document.querySelector(".route-submit-btn")

routeSubmitBtn.addEventListener("click",() => {
    keyword = getKeyword();
    page = 0;
    document.querySelector(".cards-wrap").innerHTML = ""; //erase all cards
    // console.log("Search button clicked, fetching cards for keyword:", keyword);
    getRoute();

});


//get route cards 

async function getRoute() {
    isFetching =true;
    if (page == null) { //stop loading if nextPage is null
        console.log(page)
        return;
    } else if (page != null && keyword === "") {
        src = `/api/routes?page=${page}`;
    } else {
        src = `/api/routes?page=${page}&keyword=${keyword}`;
    }
    try{
        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const nextPage = data.nextPage
        let result = data.data;
        console.log(result);
        
        for (let i = 0; i < Math.min(8, result.length); i++) {
            const routeCard = createRouteCard(result[i]);
            cardsWrap.appendChild(routeCard);
        }
        page = nextPage;


    }
     catch (error) {
        console.error('Error fetching cards:', error);
    } finally {
        isFetching = false; //Set to false to prevent fast scrolling
 
    }}




let isLoading = false;

getRoute().then(() => {
    const observer = new IntersectionObserver(
        function (entries, observer) {
        if (page==0) { //for keyword search, prevent double fetching
            console.log("when page is 0",page);
            return; 
        }else if (entries[0].isIntersecting && page!=null){
            if (isLoading){
                
                console.log("loding is still in progress")
                return;
            }else{
                isLoading= true; 
                console.log("Now load new cards");
                getRoute().then(()=>{
                isLoading= false; 
                })
            }
        }else{
            return;
        }
       
        },
        {
            threshold: 0.2,
        }
    );
    observer.observe(document.querySelector(".footer"));
    console.log("set up new observation here");
})



function createRouteCard(data) {
    const routeCardLink = document.createElement('a');
    routeCardLink.className = 'route-card-link';
    routeCardLink.href = `/route/${data.routeID}`;

    const cardWrap = document.createElement('div');
    cardWrap.className = 'card-wrap';

    const cardGrade = document.createElement('div');
    cardGrade.className = 'card-grade';
    cardGrade.innerHTML = `<div>${data.grade}</div>`;

    const cardName = document.createElement('div');
    cardName.className = 'card-name';
    cardName.innerHTML = `<p>${data.routeID}. ${data.name}</p>`;

    const cardDetail = document.createElement('div');
    cardDetail.className = 'card-detail';
    cardDetail.innerHTML = `<p>${data.expired}</p><p><img src="/static/images/tick.svg">20</p>`;

    cardName.appendChild(cardDetail);
    cardWrap.appendChild(cardGrade);
    cardWrap.appendChild(cardName);
    routeCardLink.appendChild(cardWrap);

    return routeCardLink;
}

 
fetch("/api/route/count")
    .then(response=>response.json())
    .then(data=>{
        console.log(data)
        renderChart(data);
    })
    .catch(error=>console.error('Error fetching data', error)); 

function processData(routeData){
    const labels=routeData.map(item => item.grade);
    const values=routeData.map(item => item.count);
    return {labels, values};
}    

function renderChart(routeData){
    const {labels, values} =processData(routeData);
    console.log(labels, values)
    const ctx = document.getElementById('myChart').getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '',
                data: values,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRation:false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}




   