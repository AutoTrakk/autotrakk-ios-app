(function () {
    angular.module('autotrakk')
        .controller('freeOilChangeMapCtrl', freeOilChangeMapCtrl);
    freeOilChangeMapCtrl.$inject = ['$scope', '$state', 'handlingErrors', '$ionicLoading', 'freeOilChangeService', 'userLocation'];
    function freeOilChangeMapCtrl($scope, $state, handlingErrors, $ionicLoading, freeOilChangeService, userLocation) {
        var options = { timeout: 10000, enableHighAccuracy: true };
        $ionicLoading.show();
        userLocation.getUserLocation().then(function (response) {
            if (response.error == false) {
                $ionicLoading.hide();
                var myLocation = {
                    'lat': response.location.lat,
                    'long': response.location.long
                }
                // var myLocation = {
                //     'lat': '41.259328',
                //     'long': '-76.949801'
                // }
                var radius = 100;
                var opt = {
                    'lat': myLocation.lat,
                    'long': myLocation.long,
                    'radius': radius
                };

                var myLocationImage = 'img/my_location.png';
                var latLng = new google.maps.LatLng(myLocation.lat, myLocation.long);
                var mapOptions = {
                    center: latLng,
                    zoom: 10,
                    disableDefaultUI: true,
                    zoomControl: true,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    minZoom: 5,
                    maxZoom: 15
                };

                // create map
                $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);
                // set pin for user location
                var myLocationMarker = new google.maps.Marker({
                    position: new google.maps.LatLng(myLocation.lat, myLocation.long),
                    icon: myLocationImage,
                    map: $scope.map,

                });
                // set text for user location popup
                myLocationMarker.info = new google.maps.InfoWindow({
                    content: 'Your Location'
                });

                freeOilChangeService.getServicesList(myLocation.lat, myLocation.long, radius).then(function (response) {
                    $ionicLoading.hide();
                    if (response.error == false && response.data.StatusCode == 100) {
                        var serviceLocations = response.data.Results;
                        var markers = [];
                        if (serviceLocations == null) {
                            // no services in area
                            handlingErrors.showError('There is no service in your area');
                        }
                        else {
                            var serviceMarkers = []; // all service markers/pin are stored in this array
                            drawMarkers(serviceLocations, serviceMarkers);

                        }
                        google.maps.event.addListener(myLocationMarker, 'click', function () {
                            if (serviceLocations != null) {
                                for (var i in serviceMarkers) {
                                    serviceMarkers[i].info.close();
                                }
                            }
                            myLocationMarker.info.open($scope.map, this);
                        });
                        var radiusStep = 1;  // after map idle state we will multiple radius with this step if distance is bigger
                        google.maps.event.addListener($scope.map, 'idle', function () {
                            var newCenter = $scope.map.getCenter();
                            var distanceFromMyLocation = google.maps.geometry.spherical.computeDistanceBetween(newCenter, myLocationMarker.getPosition());
                            var isMapCenterInRange = freeOilChangeService.isMapCenterInRange(distanceFromMyLocation, radius * radiusStep);
                            if (isMapCenterInRange == false) {
                                $ionicLoading.show();
                                ++radiusStep;
                                freeOilChangeService.getServicesList(myLocation.lat, myLocation.long, radius * radiusStep).then(function (response) {
                                    $ionicLoading.hide();
                                    if (response.error == false && response.data.StatusCode == 100) {
                                        var serviceLocations = response.data.Results;
                                        if (serviceLocations == null) {
                                            handlingErrors.showError('There is no service in this area');
                                        } else {
                                            // create array of services
                                            var newServiceLocations = freeOilChangeService.checkForNewLocations(serviceMarkers, serviceLocations);
                                            drawMarkers(serviceLocations, serviceMarkers);
                                        }
                                    } else {
                                        handlingErrors.errorInRespone(response);
                                    }
                                });
                            }
                        });
                    }
                    else {
                        handlingErrors.errorInRespone(response);
                    }
                });
                function drawMarkers(serviceLocations, serviceMarkers) {
                    var serviceMarkersLength = parseInt(serviceMarkers.length);
                    for (var prop in serviceLocations) {
                        var mark = {
                            "title": serviceLocations[prop].brand + ',' + serviceLocations[prop].address,
                            "lat": parseFloat(serviceLocations[prop].lat).toFixed(5),
                            "lng": parseFloat(serviceLocations[prop].long).toFixed(5)
                        }
                        var markPos = new google.maps.LatLng(mark.lat, mark.lng);
                        var serviceMarkersProp = serviceMarkersLength + parseInt(prop);
                        serviceMarkers[serviceMarkersProp] = new google.maps.Marker({
                            map: $scope.map,
                            position: markPos
                        });
                        serviceMarkers[serviceMarkersProp].info = new google.maps.InfoWindow({
                            content: mark.title+'<br/><a class="btn button-block btnCancel text-center" href="http://maps.google.com/maps?saddr='+myLocation.lat+','+myLocation.long+'&daddr='+mark.lat+','+mark.lng+'" >Open in Maps</a>'
                        });

                        google.maps.event.addListener(serviceMarkers[serviceMarkersProp], 'click', function () {
                            for (var i in serviceMarkers) {
                                serviceMarkers[i].info.close();
                            }
                            myLocationMarker.info.close();
                            this.info.open($scope.map, this);
                        });
                    }
                }
            } else {
                $ionicLoading.hide();
                handlingErrors.errorInRespone(response);
                $state.go('freeOilChangeOne');
            }

        });

    }
})();