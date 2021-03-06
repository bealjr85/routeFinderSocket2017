"use strict"

window.curBikeLine = null;
window.marker = null;
window.elevator = null;
//to do - reset window.polylines when click a new rides
window.polylines = [];
var mapObj;

// window.routeExports = {};
// window.routeExports.geoCodeLatLong = function() {
// }
window.onload = function() {
  init();
}

function init(){
  var userInput = getQueryParams();
  addValuesToInput(userInput.location, userInput.milerange, userInput.maxdistance, userInput.mindistance, userInput.maxelevation, userInput.minelevation);

  var routesPromise = getMatchingRoutes(userInput.location, userInput.milerange, userInput.maxdistance, userInput.mindistance, userInput.maxelevation, userInput.minelevation);

  routesPromise.done(function(data){
    $.spin('false');
    var routeOptions = data.results;
    var friendlyRouteObjects = mapRoutesToFriendlyObjects(routeOptions);
  //  console.log(friendlyRouteObjects, 'friendlyRouteObjects')
    geoCodeLatLong(friendlyRouteObjects.routeContainerObj);

    var centerLat = friendlyRouteObjects.routeContainerObj[0].first_lat;
    var centerLong = friendlyRouteObjects.routeContainerObj[0].first_lng;

    var firstLatLongArrayForRides = latLongObject(friendlyRouteObjects.routeContainerObj)
    mapObj = initMap(centerLat, centerLong, firstLatLongArrayForRides);
  });
}

// ===========================GET QUERY PARAMS=================================
function getQueryParams(){
  let url = window.location.href;
  url = decodeURI(url)
  let vars = {};
  var hashes = url.split("?")[1].split('&');

  for (let i = 0; i < hashes.length; i++) {
    let params=hashes[i].split("=");
    vars[params[0]] = params[1];
    }
  //console.log(vars, 'here is vars')
  return sortRangeSliders(vars)
}

// ===========================GRAB VALUES FROM RANGE SLIDER (PREVIOUS PAGE)=================================
function sortRangeSliders(paramObj){
  //console.log(paramObj, 'paramObj')
  let distance = paramObj.distancerange;
  //console.log(distance)
  let keyValues = distance.split(' - ');
  paramObj.mindistance = keyValues[0];
  let keyValuesMax = keyValues[1].split('+');
  paramObj.maxdistance = keyValuesMax[0];

  let elevation = paramObj.elevationrange;
  let keyValuesElevation = elevation.split(' - ');
  paramObj.minelevation = keyValuesElevation[0];
  keyValuesMax = keyValuesElevation[1].split('+');
  paramObj.maxelevation = keyValuesMax[0];
  return paramObj
}

// ===========================update field bar w/ users preferences =================================
function addValuesToInput(location, mileRange, maxDistance, minDistance, elevGain, elevMin){
  var inputLocation = document.getElementsByClassName("route-options-location")[0];
  location = location.substring(0, location.length - 20)
  location = location.replace(/%2C/gi,",")
  location = location.replace(/[^\w\s]/gi," ")
  inputLocation.value = location;
  var inputMileRange = document.getElementsByClassName("route-options-mile-range")[0];
  inputMileRange.value = mileRange;
  var inputMaxDistance = document.getElementsByClassName("route-options-maxdistance")[0];
  inputMaxDistance.value = maxDistance;
  var inputMinDistance = document.getElementsByClassName("route-options-mindistance")[0];
  inputMinDistance.value = minDistance;
  var inputElevGain = document.getElementsByClassName("route-options-elev-gain")[0];
  inputElevGain.value = elevGain;
  var inputElevMin = document.getElementsByClassName("route-options-elev-min")[0];
  inputElevMin.value = elevMin;
}

// ===========================Map routes into an easy to use obj =================================
var mapRoutesToFriendlyObjects = function(routeOptions) {
  var routeIdArray = [];
  var routeContainerObj = [];
  //console.log(routeOptions)

  for (var i = 0; i < routeOptions.length; i++) {
    if(routeOptions[i].type === "trip"){
      routeIdArray.push(routeOptions[i].trip.route_id);

      routeContainerObj.push({
        'name': routeOptions[i].trip.name,
        "ids": routeOptions[i].trip.route_id,
        "cityAndState": undefined,
        "distance": routeOptions[i].trip.distance,
        "elevation_gain": routeOptions[i].trip.elevation_gain,
        "elevation_loss": routeOptions[i].trip.elevation_loss,
        "first_lat": routeOptions[i].trip.first_lat,
        "last_lat": routeOptions[i].trip.last_lat,
        "first_lng": routeOptions[i].trip.first_lng,
        "last_lng": routeOptions[i].trip.last_lng,
        "city": routeOptions[i].trip.locality,
        "duration": routeOptions[i].trip.duration,
        "state": routeOptions[i].trip.administrative_area,
        "postal_code": routeOptions[i].trip.postal_code
      });

    } if (routeOptions[i].type === "route"){
      routeIdArray.push(routeOptions[i].route.id);

      routeContainerObj.push({
        'name': routeOptions[i].route.name,
        "ids": routeOptions[i].route.id,
        "cityAndState": undefined,
        "distance": routeOptions[i].route.distance,
        "elevation_gain": routeOptions[i].route.elevation_gain,
        "elevation_loss": routeOptions[i].route.elevation_loss,
        "first_lat": routeOptions[i].route.first_lat,
        "last_lat": routeOptions[i].route.last_lat,
        "first_lng": routeOptions[i].route.first_lng,
        "last_lng": routeOptions[i].route.last_lng,
        "city": routeOptions[i].route.locality,
        "duration": routeOptions[i].route.duration,
        "state": routeOptions[i].route.administrative_area,
        "postal_code": routeOptions[i].route.postal_code
      });
    }
  }
  return {
    routeContainerObj,
    routeIdArray
  }
};

function geoCodeLatLong(routeContainerObj){
  var routeContainerObjLength = routeContainerObj.length;

  for (let i = 0; i < routeContainerObj.length - 1 ; i++) {
      let lat;
      let lng;
      lat = routeContainerObj[i].first_lat;
      lng = routeContainerObj[i].first_lng;
  grabFistLatLong(lat, lng, routeContainerObj, routeContainerObjLength, i);
  }
}
// ===========================Render Route Cards=================================
/* Render the route cards to the page. It will loop through the api data and create a card for each possible ride */
function renderRideOptions(route, routeContainerObjLength){
  var resultsContainer = document.getElementById('num-results-container');
  resultsContainer.className = "num-results-container"
  resultsContainer.innerHTML = routeContainerObjLength + " routes match";
  var rideDetails = document.getElementsByClassName('ride-details')[0];

  var col = document.createElement("div");
  col.className = "result-card-container";
  var card = document.createElement("div");
  card.className = "result-card";
  card.id = route.ids;
  var rideName = document.createElement("h3");
  rideName.className = "ride-name";
  var headline = document.createElement("h2");
  headline.className = "city-state";
  var cardMile = document.createElement("div");
  cardMile.className = "card-mile card-details";
  var cardElevGain = document.createElement("div");
  cardElevGain.className = "card-elev-gain card-details";
  var duration = document.createElement("div");
  duration.className = "card-duration card-details";

  var favorite = document.createElement("button");
  favorite.className = "favorite";
  favorite.setAttribute("ride_id", route.ids);

  rideDetails.appendChild(col);
  col.appendChild(card);

  favorite.innerHTML = 'Save to Favs';
  card.appendChild(favorite);

  rideName.innerHTML = route.name;
  card.appendChild(rideName);

  headline.innerHTML = route.cityAndState;
  card.appendChild(headline);

  cardMile.innerHTML = ((route.distance)*(0.000621)).toFixed(1) + " mi";
  card.appendChild(cardMile);

  var elevationGain = ((route.elevation_gain)*(3.2808399)).toFixed(1);
  elevationGain = commaSeparateNumber(elevationGain);
  cardElevGain.innerHTML = (elevationGain) + " ft";
  card.appendChild(cardElevGain);

  if(route.duration !== undefined && route.duration !== null){
    duration.innerHTML = route.duration + " estimated ride time";
    card.appendChild(duration);
  }

  createClickEventForEachCard('click', card);
  createClickEventForFavButton('click', favorite, route);
}

function commaSeparateNumber(val){
    while (/(\d+)(\d{3})/.test(val.toString())){
      val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
    }
    return val;
  }

  // ===========================click event for route card =================================
function createClickEventForEachCard(eventName, element){
  element.addEventListener(eventName, function(event) {
    var removeInnerShadow = document.getElementsByClassName('inner-shadow');

    if(removeInnerShadow.length > 0){
      removeInnerShadow[0].className = 'result-card-container';
    }
    var routeId = event.currentTarget.id;
    event.currentTarget.parentElement.className += ' inner-shadow';
    displayRouteOnMap(routeId);
  });
}

function displayRouteOnMap(routeId){
  var routeDetailsPromise = getRouteDetails(routeId);
//  console.log(routeId, 'routeId')
//  console.log(routeDetailsPromise, 'routeDetailsPromise')

  routeDetailsPromise.done(function(data){
    createPathsObject(data.track_points)
    $('#graph').remove(); // this is my <canvas> element
    window.track_points = (data.track_points)
    //console.log(window.track_points)
    parseDataCanvas(data.track_points);
  });
}


// ===========================create Paths object for Google PolyLine =================================
function createPathsObject(trackPoints){
  var paths = [];
  var firstLatLongMaker = {lat:trackPoints[3].y,  lng: trackPoints[3].x}
  var lastLatLongMaker = {lat:trackPoints[trackPoints.length-1].y,  lng: trackPoints[trackPoints.length-1].x};

  window.polylines = []

  for (var i = 3; i < trackPoints.length-4; i++) {
    if (trackPoints[i].y !== undefined && trackPoints[i].x !== undefined){
      paths.push({
          lat:trackPoints[i].y,
          lng: trackPoints[i].x
        });
      // paths.push( new google.maps.LatLng(trackPoints[i].y, trackPoints[i].x))
      }
      window.polylines.push([trackPoints[i].y, trackPoints[i].x])
  }
  createAndAppendSubRoute(firstLatLongMaker, lastLatLongMaker, paths);
  }


// ===========================APPEND POLYLINES AND MARKERS=================================
function createAndAppendSubRoute(firstLatLongMaker, lastLatLongMaker, paths){
  // Load the Visualization API and the columnchart package.
  google.load('visualization', '1', {callback: 'console.log("working")', packages: ['columnchart']});

  if(window.curBikeLine !== null){
    window.curBikeLine.setMap(null);
    window.marker.setMap(null);
    window.lastMarker.setMap(null);
  }
  addLine(paths);
  addMarkers(firstLatLongMaker, lastLatLongMaker);
  return window.curBikeLine;
}

function latLongObject(routeObject){
  var locations = [];
  for (var route of routeObject) {
    locations.push(
    {
      "lat": route.first_lat,
      "lng": route.first_lng
    });
  }
  return locations;
}



// ===========================SAVE FAVORITE RIDE =================================
function createClickEventForFavButton(eventName, element, route){
  element.addEventListener(eventName, function(event) {
    var elementId = event.currentTarget;
    elementId = element.getAttribute('ride_id');
    // console.log(window.polylines, 'here')
    // Update the text field to display the polyline encodings
    var encodeString = encodeLatLngPolygon(window.polylines)
    console.log(encodeString, 'here is after the lines are encoded')
    var rideObj = {
      ride: route,
      polylines: encodeString
    }
    const options = {
    contentType: 'application/json',
    data: JSON.stringify(rideObj),
    dataType: 'json',
    type: 'POST',
    url: '/rides'
  };

  $.ajax(options)
    .done((results) => {
      console.log(results, 'return after calling rides/ post')

      const options = {
      contentType: 'application/json',
      data: JSON.stringify(results),
      dataType: 'json',
      type: 'POST',
      url: '/favorites'
      };

      $.ajax(options)
        .done((results) => {
          console.log(results, 'return after calling favorites/ post');

          $('.favorites').text('Saved');
          //post ride to favorites
        })
        .fail(() => {
          console.log('did not save ride to favorites');
        });
    })
    .fail(() => {
      console.log('did not work')
    });


  });
}


// ===========================ENCODE POLYLINES=================================
function encodeLatLngPolygon(array) {
  var path = [];
  var lat;
  var long;

  for(var i=0; i < array.length; i++) {
    // console.log((array[i][0]), (array[i][1]))
    lat = parseFloat(array[i][0])
    long = parseFloat(array[i][1])

    var xyz = new google.maps.LatLng(lat, long);
    // var xyz = {lat: lat, lng: long}
    // console.log(xyz, 'xyz,m,m,m,m,,m,m,m,m,m,')
    path.push(xyz);

  }
  var polyOptions = {
    strokeColor: '#000000',
    strokeOpacity: 1.0,
    strokeWeight: 3,
    path: path
  }
  var poly = new google.maps.Polyline(polyOptions);

  var polyPath = poly.getPath()

    console.log(path, 'path')
    console.log(polyPath, 'polyPath')
  var code = google.maps.geometry.encoding.encodePath(polyPath);
  // console.log(code, 'code')
  return code;
}
