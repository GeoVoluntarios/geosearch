require([
  "esri/config",
  "esri/widgets/Search",
  "esri/layers/GeoJSONLayer",
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
], function (
  esriConfig,
  Search,
  GeoJSONLayer,
  Map,
  MapView,
  GraphicsLayer,
  Graphic
) {
  esriConfig.apiKey = apiKey;

  const template = {
    title: "FEATURE INFO TITLE",
    content: "<p>bla bla bla bla bla bla bla bla bla bla bla bla</p>",
  };

  var renderer = {
    type: "simple", // autocasts as new SimpleRenderer()
    symbol: {
      type: "simple-fill", // autocasts as new SimpleFillSymbol()
      color: [255, 128, 0, 0.5],
      outline: {
        // autocasts as new SimpleLineSymbol()
        width: 1,
        color: "black",
      },
    },
  };

  const geojsonLayer = new GeoJSONLayer({
    url: "data/data.json",
    popupTemplate: template,
    renderer: renderer, //optional
  });

  const FirstMap = new Map({
    basemap: "gray-vector",
    layers: [geojsonLayer],
  });

  const FirstView = new MapView({
    container: "first-map",
    center: [-3.703339, 40.416729],
    zoom: 4,
    map: FirstMap,
  });

  // Search widget which includes the locator. We will get the location from the results.
  const search = new Search({
    container: document.getElementById("search-box"),
  });

  const watcher = search.watch("activeSource", (source) => {
    source.placeholder = "Introduce tu dirección";
    watcher.remove();
  });

  const database = new GeoJSONLayer({
    url: "data/data.json",
  });

  const resultsBoxEl = document.getElementById("results-box");

  search.on("select-result", function (event) {
    // move searchbox to the top
    const searchPanel = document.getElementById("search-panel");
    searchPanel.classList.remove("h-screen");
    searchPanel.classList.add("mt-10");

    database
      .queryFeatures({
        geometry: event.result.feature.geometry,
        spatialRelationship: "intersects",
        outFields: ["*"],
      })
      .then((res) => {
        const locationLatitude = event.result.feature.geometry.latitude;
        const locationLongitude = event.result.feature.geometry.longitude;

        if (res.features.length > 0) {
          resultsBoxEl.innerHTML = "";
          //Add map
          showMap(locationLongitude, locationLatitude);
          //Get info list
          getList(res);
        } else {
          resultsBoxEl.innerHTML = "<p>No hay resultados</p>";
        }
      })
      .catch(function (e) {
        resultsBoxEl.innerHTML =
          "<p>No se ha podido consultar la base de datos, por favor inténtelo más tarde</p>";
        console.error("query failed: ", e);
      });
  });

  //Get list of results
  getList = (res) => {
    console.log("Getting list...");
    res.features.forEach((el) => {
      const listEl = document.createElement("div");
      listEl.className = "md:flex md:gap-8";
      const noLogo = "geosearch.png";
      listEl.innerHTML = `
        <div class="w-24 h-auto">
          <img src=${el.attributes.logo ? el.attributes.logo : noLogo}></img>
        </div>
        <div>
          <a class="text-sm" href="${el.attributes.url}" target="_blank">${
        el.attributes.url
      }</a>
          <a class="text-xl text-blue-800 font-bold hover:underline" href="${
            el.attributes.url
          }" target="_blank"><h2>${el.attributes.name}</h2></a>
          <ul class="mt-2">
            <li><strong>Riesgo: </strong>${
              el.attributes.hazardType ? el.attributes.hazardType : ""
            }</li>
            <li><strong>Información: </strong>${
              el.attributes.infoCategory ? el.attributes.infoCategory : ""
            }</li>
            <li><strong>Ámbito territorial: </strong>${
              el.attributes.territorialScope
                ? el.attributes.territorialScope
                : ""
            }</li>
            <li><strong>Idiomas: </strong>${
              el.attributes.languages ? el.attributes.languages : ""
            }</li>
            <li><strong>Descripción: </strong>${
              el.attributes.description ? el.attributes.description : ""
            }</li>
          </ul>
        </div>
      `;

      resultsBoxEl.appendChild(listEl);
    });
  };

  //Add Map using the result of the search
  showMap = (locationLongitude, locationLatitude) => {
    //Create map
    const map = new Map({
      basemap: "arcgis-navigation",
    });

    //Create view in the map div centered on the latitude and longitude from the search
    const view = new MapView({
      map: map,
      container: "map",
      center: [locationLongitude, locationLatitude],
      zoom: 16,
    });

    //Create a new graphics layer and add it to the map
    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    //Create a point using the latitude and longitude from the search
    const point = {
      type: "point",
      longitude: locationLongitude,
      latitude: locationLatitude,
    };

    //Create a simple marker style
    const simpleMarkerSymbol = {
      type: "simple-marker",
      color: [226, 119, 40],
      outline: {
        color: [255, 255, 255],
        width: 1,
      },
    };

    //Create a pointGraphic for the point with the created style and add it to the graphic layer
    const pointGraphic = new Graphic({
      geometry: point,
      symbol: simpleMarkerSymbol,
    });
    graphicsLayer.add(pointGraphic);
    const buttonsDiv = document.getElementById("buttons-box");
    //Add a button to show change the location on the map
    const buttonChangeLocation = document.createElement("button");
    buttonChangeLocation.innerHTML = "Cambiar localización";
    buttonsDiv.appendChild(buttonChangeLocation);
    //If we click on 'Cambiar localización', the text changes giving the instructions: click on the map to change the location.
    buttonChangeLocation.onclick = function () {
      changeLocation(
        graphicsLayer,
        pointGraphic,
        buttonChangeLocation,
        view,
        simpleMarkerSymbol
      );
    };
  };

  changeLocation = (
    graphicsLayer,
    pointGraphic,
    buttonChangeLocation,
    view,
    simpleMarkerSymbol
  ) => {
    console.log("ChangeLocation");
    graphicsLayer.remove(pointGraphic);
    buttonChangeLocation.innerHTML =
      "Haz click en el mapa para cambiar la localización.";
    //If we click on the map, we capture the coordinates and do the reserve geocoding.
    view.on("click", function (event) {
      // Get the coordinates of the click on the view
      //Create a new point using the new coordinates
      const point = {
        type: "point",
        longitude: event.mapPoint.longitude,
        latitude: event.mapPoint.latitude,
      };

      const newLocationLongitude = event.mapPoint.longitude;
      const newLocationLatitude = event.mapPoint.latitude;
      //Create the graphic for the point
      const pointGraphic = new Graphic({
        geometry: point,
        symbol: simpleMarkerSymbol,
      });
      //Add new graphic to the map
      graphicsLayer.add(pointGraphic);
      buttonChangeLocation.innerHTML = "Cambiar localización";
      view.goTo({ center: [newLocationLongitude, newLocationLatitude] });
      view.zoom = 16;
    });
  };
});
