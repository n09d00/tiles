import { style as style_default } from './style-default.js'
import { style as style_background } from './style-background.js'

let map = new mapboxgl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: [],
    },
    zoom: 14,
    center: [8.6671065, 49.8747541],
    maxBounds: [[-31, 35], [48, 62]], 	// [[west, south], [east, north]]
    bearing: 0,
    hash: "location",
    transformRequest: (url, resourceType) => {
        if (url.startsWith('/')) {
            return { url: `${window.location.origin}${url}` }
        }
    }
});

const styles = { style_default, style_background };
const style = (/[&|#]style=(.*?)(&|$)/g.exec(window.location.href) || [])[1] || "default";
//preambel of the name of the geojson files
const fname = 'http://localhost:8888/structure12/structure';
var stationRoutes = {};

map.on('load', () => {
    (styles["style_" + style] || style_default)(map);
});

map.on('style.load', function() {
    // add points
    map.addSource("points", {
    "type": "geojson",
    "data": fname + '_elements.geojson'
    });
    
    map.addLayer({
    'id': 'point-layer',
    'type': 'circle',
    'source': 'points',
    'minzoom': 15,
    'paint': {
        'circle-radius': 4,
        'circle-color': 'black',
    }
    });

    map.loadImage(
    'https://img.icons8.com/material-outlined/24/000000/railway-station.png',
    function (error, image) {
        if (error) throw error;
        map.addImage('custom-marker', image);
        map.addSource("names", {
        "type": "geojson",
        "data": fname + '_stations.geojson'
        });

        map.addLayer({
        'id': 'name-layer',
        'type': 'symbol',
        'source': 'names',
        // 'minzoom': 8,
        'layout': {
            'icon-image': 'custom-marker',
            'icon-size': 0.75   // factor of original icon size
        }
        });
    }
    );

    fetch(fname + "_station_routes.geojson")
        .then(response => response.json())
        .then(json => {stationRoutes = json; createSelectorStationRoutes()});

    // add station route points
    map.addSource("station-route-points", {
    "type": "geojson",
    "data": stationRoutes
    });
    
    map.addLayer({
    'id': 'station-route-point-layer',
    'type': 'circle',
    'source': 'station-route-points',
    'minzoom': 14,
    'layout': {
        'visibility': 'none'
    },
    'paint': {
        'circle-radius': 5,
        'circle-color': 'red',
    }
    });  
    
    map.addLayer({
    'id': 'station-route-way-layer',
    'type': 'line',
    'source': 'station-route-points',
    'minzoom': 10,
    'layout': {
        'line-join': 'round',
        'line-cap': 'round',
        'visibility': 'none'
    },
    'paint': {
        'line-color': 'red',
        'line-width': 3
    }
    }); 

    // show details when a point was clicked
    map.on('click', 'point-layer', (e) => {
    showInfo('point', e.features[0].properties);
    });

    // show details when a station was clicked
    map.on('click', 'name-layer', (e) => {
    showInfo('name', e.features[0].properties);
    });

    // Change the cursor to a pointer when the mouse is over the places layer.
    map.on('mouseenter', 'point-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
    });
    
    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'point-layer', () => {
    map.getCanvas().style.cursor = '';
    });
    
    // Change the cursor to a pointer when the mouse is over the places layer.
    map.on('mouseenter', 'name-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
    });
    
    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'name-layer', () => {
    map.getCanvas().style.cursor = '';
    });
});

/*
    info panel related code
*/
map.on('click', function(e) {
    closeNav();
});

function showInfo(type, properties) {
    document.getElementById("infoContent").style.padding = "0px 25px";
    var content = 'Default';
    if (type == 'name') {
    content = getStationContent(properties);
    document.getElementById("stationRouteSelector").style.visibility = "visible";
    } else {
    content = getElementContent(properties);
    document.getElementById("stationRouteSelector").style.visibility = "hidden";
    }
    document.getElementById("infoContent").innerHTML = content;
    openNav();
}

/* Set the width of the sidebar to 250px (show it) */
function openNav() {
    document.getElementById("mySidepanel").style.width = "20%";
}

/* Set the width of the sidebar to 0 (hide it) */
function closeNav() {
    document.getElementById("mySidepanel").style.width = "0";
}

document.getElementById("closeBtn").onclick = function() {
    closeNav()
};

/* creates a HTML content page for stations */
function getStationContent(properties) {
    var content = '<h1>' + properties.name + '</h1>\n';
    content += '<table>\n';
    for (const [key, value] of Object.entries(properties)) {
    if(key != 'name') {
        content += '<tr><td>' + key + '</td><td>' + value + '</td></tr>\n';
    }
    }
    content += '</table>';
    return content;
}

/* creates a HTML content page for elements */
function getElementContent(properties) {
    var content = '';
    content += '<table style="margin-top:50px">\n';
    for (const [key, value] of Object.entries(properties)) {
    content += '<tr><td>' + key + '</td><td>' + value + '</td></tr>\n';
    }
    content += '</table>';
    return content;
}

/*
    station route related code
*/

/* create selector for station routes */
function createSelectorStationRoutes() {
    var select = document.getElementById('stationRouteSelector');
    for(var feature of stationRoutes.features) {
    var name = feature.properties.name;
    var option = '<option value="' + name + '">' + name + '</option>';
    select.insertAdjacentHTML( 'beforeend', option );
    }
}

document.getElementById("stationRouteSelector").onchange = function() {
    selectStationRoute();
}
/* displays the currently selected station route */
function selectStationRoute() {
    var value = document.getElementById("stationRouteSelector").value;
    if(value == 'none') {
      //no route was selected
        map.setLayoutProperty('station-route-point-layer', 'visibility', 'none');
        map.setLayoutProperty('station-route-way-layer', 'visibility', 'none');
    } else {
        map.setFilter('station-route-point-layer', ['all', ['==', 'name', value]]);
        map.setLayoutProperty('station-route-point-layer', 'visibility', 'visible');
        map.setFilter('station-route-way-layer', ['all', ['==', 'name', value]]);
        map.setLayoutProperty('station-route-way-layer', 'visibility', 'visible');
    }
}