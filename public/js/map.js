var flightPath;
var map;

function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 10,
    center: {lat: 16.853836, lng: 96.166065},
    mapTypeId: 'terrain'
  });
  var flightPlanCoordinates = [];
  var flightPath = new google.maps.Polyline({
    path: flightPlanCoordinates,
    geodesic: true,
    strokeColor: 'skyblue',
    strokeOpacity: 1.0,
    strokeWeight: 2
  });
}
fetch('/get/geodata?access_token=my_S3cr37&rangeStart=&rangeEnd=')
