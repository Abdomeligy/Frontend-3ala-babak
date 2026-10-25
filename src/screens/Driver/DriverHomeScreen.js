// src/screens/Driver/DriverHomeScreen.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';

import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

import { Ionicons } from '@expo/vector-icons';

import { driverApi } from '../../api/driverApi';
import vendorApi from '../../api/vendorApi';

import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';


// ============================================================
// CONSTANTS
// ============================================================

const SKY_BLUE = '#03A9F4';
const SKY_BLUE_DARK = '#0288D1';
const SKY_BLUE_LIGHT = '#E1F5FE';
const SKY_BLUE_SOFT = '#F0FAFF';

const BERKET_ELSAB_CENTER = {
  latitude: 30.636226,
  longitude: 31.09569,
};

const LOCATION_DISTANCE_INTERVAL = 10;

const REST_LOCATION_UPDATE_INTERVAL = 30000;

// ============================================================
// IMPORTANT:
// Backend driver:online:{id} has a TTL of about 120 seconds.
// We send a heartbeat every 45 seconds so the driver remains
// online even when standing still and distanceInterval does
// not produce another GPS event.
// ============================================================

const DRIVER_HEARTBEAT_INTERVAL = 45000;


// ============================================================
// HELPERS
// ============================================================

const toNumber = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};


const isValidCoordinate = (
  latitude,
  longitude
) => {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (
    lat === null ||
    lng === null
  ) {
    return false;
  }

  if (
    lat < -90 ||
    lat > 90
  ) {
    return false;
  }

  if (
    lng < -180 ||
    lng > 180
  ) {
    return false;
  }

  if (
    lat === 0 &&
    lng === 0
  ) {
    return false;
  }

  return true;
};


const getRestaurantLatitude = (
  restaurant
) => {
  if (!restaurant) {
    return null;
  }

  return (
    restaurant.latitude ??
    restaurant.lat ??
    restaurant.Latitude ??
    restaurant.restaurant_lat ??
    restaurant.restaurantLatitude ??
    restaurant.location?.latitude ??
    restaurant.location?.lat ??
    restaurant.coordinates?.latitude ??
    restaurant.coordinates?.lat ??
    null
  );
};


const getRestaurantLongitude = (
  restaurant
) => {
  if (!restaurant) {
    return null;
  }

  return (
    restaurant.longitude ??
    restaurant.lng ??
    restaurant.Longitude ??
    restaurant.restaurant_lng ??
    restaurant.restaurantLongitude ??
    restaurant.location?.longitude ??
    restaurant.location?.lng ??
    restaurant.coordinates?.longitude ??
    restaurant.coordinates?.lng ??
    null
  );
};


const getRestaurantId = (
  restaurant,
  index
) => {
  return (
    restaurant?.id ??
    restaurant?.restaurant_id ??
    restaurant?.restaurantId ??
    restaurant?.RestaurantId ??
    `restaurant-${index}`
  );
};


const getRestaurantName = (
  restaurant,
  index
) => {
  return (
    restaurant?.name ??
    restaurant?.restaurant_name ??
    restaurant?.restaurantName ??
    restaurant?.title ??
    restaurant?.RestaurantName ??
    `مطعم ${index + 1}`
  );
};


// ============================================================
// DOCUMENT LABELS
// ============================================================

const DOCUMENT_LABELS = {
  national_id: 'بطاقة الرقم القومي',
  driving_license: 'رخصة القيادة',
  vehicle_license: 'رخصة المركبة',
  insurance: 'التأمين',
  profile_photo: 'الصورة الشخصية',
};


// ============================================================
// OPEN STREET MAP HTML
// ============================================================

const MAP_HTML = `
<!DOCTYPE html>

<html lang="ar">

<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
/>

<title>Driver Map</title>

<style>

* {
  box-sizing: border-box;
}

html,
body {

  margin: 0;
  padding: 0;

  width: 100%;
  height: 100%;

  overflow: hidden;

  background: #f1f1f1;

  font-family:
    Arial,
    sans-serif;

  touch-action: none;
}

#map {

  position: relative;

  width: 100%;
  height: 100%;

  overflow: hidden;

  background: #e9e9e9;
}

#tiles {

  position: absolute;

  left: 0;
  top: 0;

  width: 100%;
  height: 100%;

  overflow: hidden;
}

.tile {

  position: absolute;

  width: 256px;
  height: 256px;

  user-select: none;

  -webkit-user-drag: none;

  pointer-events: none;
}

.marker {

  position: absolute;

  transform:
    translate(-50%, -100%);

  z-index: 100;

  pointer-events: auto;

  user-select: none;

  cursor: pointer;
}

.marker.driver {

  z-index: 100;

}

.marker.restaurant {

  z-index: 150;

}


/* ============================================================
    DRIVER MARKER
============================================================ */

.driver-marker {

  width: 52px;
  height: 52px;

  border-radius: 50%;

  background: #03A9F4;

  border: 4px solid white;

  box-shadow:
    0 3px 10px rgba(0,0,0,0.35);

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 26px;

  position: relative;
}

.driver-marker::after {

  content: "";

  position: absolute;

  bottom: -12px;

  left: 50%;

  transform:
    translateX(-50%);

  width: 0;
  height: 0;

  border-left:
    8px solid transparent;

  border-right:
    8px solid transparent;

  border-top:
    14px solid #03A9F4;
}


/* ============================================================
    RESTAURANT MARKER
============================================================ */

.restaurant-marker {

  width: 46px;
  height: 46px;

  border-radius: 50%;

  background: #0288D1;

  border: 3px solid white;

  box-shadow:
    0 3px 10px rgba(0,0,0,0.35);

  display: flex;

  align-items: center;
  justify-content: center;

  position: relative;

  overflow: visible;
}

.restaurant-marker svg {

  width: 25px;
  height: 25px;

  display: block;

  overflow: visible;
}

.restaurant-marker::after {

  content: "";

  position: absolute;

  bottom: -11px;

  left: 50%;

  transform:
    translateX(-50%);

  width: 0;
  height: 0;

  border-left:
    7px solid transparent;

  border-right:
    7px solid transparent;

  border-top:
    11px solid #0288D1;
}


/* ============================================================
    POPUP
============================================================ */

.popup {

  position: absolute;

  min-width: 160px;

  max-width: 230px;

  padding: 10px 13px;

  background: white;

  border-radius: 12px;

  box-shadow:
    0 4px 15px rgba(0,0,0,0.25);

  transform:
    translate(-50%, -125%);

  z-index: 300;

  direction: rtl;

  text-align: center;

  font-size: 14px;

  color: #222;
}

.popup-title {

  font-weight: bold;

  margin-bottom: 4px;
}

.popup-subtitle {

  font-size: 11px;

  color: #777;
}


/* ============================================================
    CONTROLS
============================================================ */

.controls {

  position: absolute;

  right: 14px;

  top: 75px;

  z-index: 500;

  display: flex;

  flex-direction: column;

  gap: 8px;
}

.control {

  width: 44px;
  height: 44px;

  background: white;

  border-radius: 12px;

  box-shadow:
    0 3px 10px rgba(0,0,0,0.22);

  display: flex;

  align-items: center;
  justify-content: center;

  font-size: 24px;

  font-weight: bold;

  color: #0288D1;
}


/* ============================================================
    STATUS
============================================================ */

.map-status {

  position: absolute;

  left: 50%;

  bottom: 14px;

  transform:
    translateX(-50%);

  z-index: 500;

  background: rgba(255,255,255,0.95);

  padding: 8px 14px;

  border-radius: 20px;

  box-shadow:
    0 2px 8px rgba(0,0,0,0.18);

  font-size: 12px;

  color: #333;

  direction: rtl;

  white-space: nowrap;
}

</style>

</head>


<body>

<div id="map">

  <div id="tiles"></div>

  <div id="markers"></div>

  <div class="controls">

    <div
      class="control"
      id="zoomIn"
    >
      +
    </div>

    <div
      class="control"
      id="zoomOut"
    >
      −
    </div>

    <div
      class="control"
      id="myLocation"
    >
      ⌖
    </div>

  </div>

  <div
    id="mapStatus"
    class="map-status"
  >
    جاري تحميل الخريطة...
  </div>

</div>


<script>

(function() {

  // ==========================================================
  // STATE
  // ==========================================================

  const TILE_SIZE = 256;

  const MIN_ZOOM = 3;

  const MAX_ZOOM = 19;

  let zoom = 14;

  let center = {
    latitude: 30.636226,
    longitude: 31.09569
  };

  let driver = null;

  let restaurants = [];

  let mapWidth = window.innerWidth;

  let mapHeight = window.innerHeight;

  let dragging = false;

  let dragStartX = 0;

  let dragStartY = 0;

  let dragCenterX = 0;

  let dragCenterY = 0;

  let popup = null;


  // ==========================================================
  // ELEMENTS
  // ==========================================================

  const mapElement =
    document.getElementById('map');

  const tilesElement =
    document.getElementById('tiles');

  const markersElement =
    document.getElementById('markers');

  const statusElement =
    document.getElementById('mapStatus');


  // ==========================================================
  // HELPERS
  // ==========================================================

  function toFiniteNumber(value) {

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : null;

  }


  function isValidCoordinate(
    latitude,
    longitude
  ) {

    const lat =
      toFiniteNumber(
        latitude
      );

    const lng =
      toFiniteNumber(
        longitude
      );

    if (
      lat === null ||
      lng === null
    ) {

      return false;

    }

    if (
      lat < -90 ||
      lat > 90
    ) {

      return false;

    }

    if (
      lng < -180 ||
      lng > 180
    ) {

      return false;

    }

    if (
      lat === 0 &&
      lng === 0
    ) {

      return false;

    }

    return true;

  }


  function escapeHtml(value) {

    return String(value ?? '')
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );

  }


  // ==========================================================
  // RESTAURANT ICON
  // ==========================================================

  function getRestaurantIcon() {

    return \`
      <div class="restaurant-marker">

        <svg
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="restaurant"
        >

          <path
            d="M7 2v7M10 2v7M13 2v7"
            fill="none"
            stroke="#ffffff"
            stroke-width="2"
            stroke-linecap="round"
          />

          <path
            d="M10 9v13"
            fill="none"
            stroke="#ffffff"
            stroke-width="2"
            stroke-linecap="round"
          />

          <path
            d="M7 9c0 1.7 1.3 3 3 3s3-1.3 3-3"
            fill="none"
            stroke="#ffffff"
            stroke-width="2"
            stroke-linecap="round"
          />

          <path
            d="M17 2c-1.7 2.1-2.5 4.4-2.5 7.2V22"
            fill="none"
            stroke="#ffffff"
            stroke-width="2"
            stroke-linecap="round"
          />

          <path
            d="M17 2v20"
            fill="none"
            stroke="#ffffff"
            stroke-width="2"
            stroke-linecap="round"
          />

        </svg>

      </div>
    \`;

  }


  // ==========================================================
  // MAP PROJECTION
  // ==========================================================

  function clamp(
    value,
    min,
    max
  ) {

    return Math.max(
      min,
      Math.min(max, value)
    );

  }


  function latLngToWorld(
    latitude,
    longitude,
    currentZoom
  ) {

    const scale =
      TILE_SIZE *
      Math.pow(
        2,
        currentZoom
      );

    const safeLatitude =
      clamp(
        latitude,
        -85,
        85
      );

    const x =
      (longitude + 180) /
      360 *
      scale;

    const sinLatitude =
      Math.sin(
        safeLatitude *
        Math.PI /
        180
      );

    const y =
      (
        0.5 -
        Math.log(
          (1 + sinLatitude) /
          (1 - sinLatitude)
        ) /
        (4 * Math.PI)
      ) * scale;

    return {
      x,
      y
    };

  }


  function worldToScreen(
    worldX,
    worldY
  ) {

    const centerWorld =
      latLngToWorld(
        center.latitude,
        center.longitude,
        zoom
      );

    return {

      x:
        worldX -
        centerWorld.x +
        mapWidth / 2,

      y:
        worldY -
        centerWorld.y +
        mapHeight / 2

    };

  }


  // ==========================================================
  // CREATE TILE
  // ==========================================================

  function createTile(
    z,
    x,
    y
  ) {

    const maxTile =
      Math.pow(
        2,
        z
      );

    let normalizedX =
      x;

    while (
      normalizedX < 0
    ) {

      normalizedX +=
        maxTile;

    }

    while (
      normalizedX >= maxTile
    ) {

      normalizedX -=
        maxTile;

    }

    if (
      y < 0 ||
      y >= maxTile
    ) {

      return null;

    }

    const image =
      document.createElement(
        'img'
      );

    image.className =
      'tile';

    image.draggable =
      false;

    image.src =
      'https://tile.openstreetmap.org/' +
      z +
      '/' +
      normalizedX +
      '/' +
      y +
      '.png';

    return image;

  }


  // ==========================================================
  // DRAW TILES
  // ==========================================================

  function drawTiles() {

    tilesElement.innerHTML =
      '';

    const z =
      zoom;

    const centerWorld =
      latLngToWorld(
        center.latitude,
        center.longitude,
        z
      );

    const centerTileX =
      Math.floor(
        centerWorld.x /
        TILE_SIZE
      );

    const centerTileY =
      Math.floor(
        centerWorld.y /
        TILE_SIZE
      );

    const radiusX =
      Math.ceil(
        mapWidth /
        TILE_SIZE
      ) + 2;

    const radiusY =
      Math.ceil(
        mapHeight /
        TILE_SIZE
      ) + 2;

    for (
      let tileX =
        centerTileX -
        radiusX;

      tileX <=
      centerTileX +
      radiusX;

      tileX++
    ) {

      for (
        let tileY =
          centerTileY -
          radiusY;

        tileY <=
        centerTileY +
        radiusY;

        tileY++
      ) {

        const tile =
          createTile(
            z,
            tileX,
            tileY
          );

        if (!tile) {
          continue;
        }

        const tileWorldX =
          tileX *
          TILE_SIZE;

        const tileWorldY =
          tileY *
          TILE_SIZE;

        const screen =
          worldToScreen(
            tileWorldX,
            tileWorldY
          );

        tile.style.left =
          screen.x + 'px';

        tile.style.top =
          screen.y + 'px';

        tilesElement.appendChild(
          tile
        );

      }

    }

  }


  // ==========================================================
  // CREATE MARKER
  // ==========================================================

  function createMarker(
    latitude,
    longitude,
    html,
    className,
    clickHandler
  ) {

    const lat =
      toFiniteNumber(
        latitude
      );

    const lng =
      toFiniteNumber(
        longitude
      );

    if (
      !isValidCoordinate(
        lat,
        lng
      )
    ) {

      console.warn(
        '⚠️ Invalid marker coordinates:',
        {
          latitude,
          longitude,
          className,
        }
      );

      return;

    }

    const world =
      latLngToWorld(
        lat,
        lng,
        zoom
      );

    const screen =
      worldToScreen(
        world.x,
        world.y
      );

    const marker =
      document.createElement(
        'div'
      );

    marker.className =
      'marker ' +
      className;

    marker.innerHTML =
      html;

    marker.style.left =
      screen.x + 'px';

    marker.style.top =
      screen.y + 'px';

    if (clickHandler) {

      marker.addEventListener(
        'click',
        function(event) {

          event.stopPropagation();

          clickHandler(
            marker,
            lat,
            lng
          );

        }
      );

    }

    markersElement.appendChild(
      marker
    );

  }


  // ==========================================================
  // POPUP
  // ==========================================================

  function closePopup() {

    if (popup) {

      popup.remove();

      popup = null;

    }

  }


  function showRestaurantPopup(
    latitude,
    longitude,
    restaurant
  ) {

    closePopup();

    const world =
      latLngToWorld(
        latitude,
        longitude,
        zoom
      );

    const screen =
      worldToScreen(
        world.x,
        world.y
      );

    popup =
      document.createElement(
        'div'
      );

    popup.className =
      'popup';

    popup.innerHTML =

      '<div class="popup-title">' +

      escapeHtml(
        restaurant.name ||
        'مطعم'
      ) +

      '</div>' +

      '<div class="popup-subtitle">' +

      'مطعم مسجل على التطبيق' +

      '</div>';

    popup.style.left =
      screen.x + 'px';

    popup.style.top =
      screen.y + 'px';

    markersElement.appendChild(
      popup
    );

  }


  // ==========================================================
  // DRAW MARKERS
  // ==========================================================

  function drawMarkers() {

    markersElement.innerHTML =
      '';

    popup = null;


    // --------------------------------------------------------
    // RESTAURANTS
    // --------------------------------------------------------

    restaurants.forEach(
      function(
        restaurant,
        index
      ) {

        if (!restaurant) {

          return;

        }

        const latitude =
          toFiniteNumber(
            restaurant.latitude
          );

        const longitude =
          toFiniteNumber(
            restaurant.longitude
          );


        if (
          !isValidCoordinate(
            latitude,
            longitude
          )
        ) {

          console.warn(
            '⚠️ Restaurant skipped - invalid coordinates:',
            {
              index,
              id:
                restaurant.id,
              name:
                restaurant.name,
              latitude:
                restaurant.latitude,
              longitude:
                restaurant.longitude,
              restaurant,
            }
          );

          return;

        }


        const normalizedRestaurant = {

          ...restaurant,

          latitude,

          longitude,

        };


        console.log(
          '🍽️ Drawing restaurant marker:',
          {
            index,
            id:
              normalizedRestaurant.id,
            name:
              normalizedRestaurant.name,
            latitude,
            longitude,
          }
        );


        createMarker(

          latitude,

          longitude,

          getRestaurantIcon(),

          'restaurant',

          function() {

            showRestaurantPopup(
              latitude,
              longitude,
              normalizedRestaurant
            );

          }

        );

      }
    );


    // --------------------------------------------------------
    // DRIVER
    // --------------------------------------------------------

    if (
      driver &&
      isValidCoordinate(
        driver.latitude,
        driver.longitude
      )
    ) {

      const driverLatitude =
        toFiniteNumber(
          driver.latitude
        );

      const driverLongitude =
        toFiniteNumber(
          driver.longitude
        );


      createMarker(

        driverLatitude,

        driverLongitude,

        '<div class="driver-marker">🛵</div>',

        'driver',

        function() {

          closePopup();

        }

      );

    }

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  function render() {

    drawTiles();

    drawMarkers();

    statusElement.innerText =

      driver

        ? 'موقعك الحالي • ' +
          restaurants.length +
          ' مطعم'

        : 'جاري تحديد موقعك...';

  }


  // ==========================================================
  // CENTER ON DRIVER
  // ==========================================================

  function centerOnDriver() {

    if (
      !driver ||
      !isValidCoordinate(
        driver.latitude,
        driver.longitude
      )
    ) {

      return;

    }

    center = {

      latitude:
        toFiniteNumber(
          driver.latitude
        ),

      longitude:
        toFiniteNumber(
          driver.longitude
        )

    };

    render();

  }


  // ==========================================================
  // ZOOM
  // ==========================================================

  function changeZoom(
    delta
  ) {

    const oldZoom =
      zoom;

    zoom =
      clamp(
        zoom + delta,
        MIN_ZOOM,
        MAX_ZOOM
      );

    if (
      zoom !== oldZoom
    ) {

      render();

    }

  }


  // ==========================================================
  // DRAG
  // ==========================================================

  mapElement.addEventListener(
    'pointerdown',
    function(event) {

      if (
        event.target.closest(
          '.control'
        ) ||
        event.target.closest(
          '.marker'
        )
      ) {

        return;

      }

      dragging = true;

      dragStartX =
        event.clientX;

      dragStartY =
        event.clientY;

      const world =
        latLngToWorld(
          center.latitude,
          center.longitude,
          zoom
        );

      dragCenterX =
        world.x;

      dragCenterY =
        world.y;

      try {

        mapElement.setPointerCapture(
          event.pointerId
        );

      } catch (error) {

        console.warn(
          'Pointer capture failed:',
          error
        );

      }

      closePopup();

    }
  );


  mapElement.addEventListener(
    'pointermove',
    function(event) {

      if (!dragging) {
        return;
      }

      const dx =
        event.clientX -
        dragStartX;

      const dy =
        event.clientY -
        dragStartY;

      const scale =
        TILE_SIZE *
        Math.pow(
          2,
          zoom
        );

      const worldX =
        dragCenterX -
        dx;

      const worldY =
        dragCenterY -
        dy;

      const longitude =
        worldX /
        scale *
        360 -
        180;

      const n =
        Math.PI -
        2 *
        Math.PI *
        worldY /
        scale;

      const latitude =
        180 /
        Math.PI *
        Math.atan(
          Math.sinh(n)
        );

      center = {

        latitude:
          clamp(
            latitude,
            -85,
            85
          ),

        longitude:
          longitude

      };

      render();

    }
  );


  mapElement.addEventListener(
    'pointerup',
    function() {

      dragging = false;

    }
  );


  mapElement.addEventListener(
    'pointercancel',
    function() {

      dragging = false;

    }
  );


  // ==========================================================
  // CONTROLS
  // ==========================================================

  document
    .getElementById('zoomIn')
    .addEventListener(
      'click',
      function(event) {

        event.stopPropagation();

        changeZoom(1);

      }
    );


  document
    .getElementById('zoomOut')
    .addEventListener(
      'click',
      function(event) {

        event.stopPropagation();

        changeZoom(-1);

      }
    );


  document
    .getElementById('myLocation')
    .addEventListener(
      'click',
      function(event) {

        event.stopPropagation();

        centerOnDriver();

        if (
          window.ReactNativeWebView
        ) {

          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type:
                'recenter_driver'
            })
          );

        }

      }
    );


  // ==========================================================
  // RECEIVE DATA FROM REACT NATIVE
  // ==========================================================

  function handleMessage(event) {

    try {

      const message =
        JSON.parse(
          event.data
        );


      if (
        message.type !==
        'map_data'
      ) {

        return;

      }


      // ------------------------------------------------------
      // DRIVER
      // ------------------------------------------------------

      if (
        message.driver
      ) {

        const latitude =
          toFiniteNumber(
            message.driver.latitude
          );

        const longitude =
          toFiniteNumber(
            message.driver.longitude
          );


        if (
          isValidCoordinate(
            latitude,
            longitude
          )
        ) {

          driver = {

            latitude,

            longitude

          };

        } else {

          driver = null;

        }

      } else {

        driver = null;

      }


      // ------------------------------------------------------
      // RESTAURANTS
      // ------------------------------------------------------

      restaurants =
        Array.isArray(
          message.restaurants
        )
          ? message.restaurants
              .map(
                function(
                  restaurant,
                  index
                ) {

                  if (
                    !restaurant
                  ) {

                    return null;

                  }


                  const latitude =
                    toFiniteNumber(
                      restaurant.latitude
                    );

                  const longitude =
                    toFiniteNumber(
                      restaurant.longitude
                    );


                  if (
                    !isValidCoordinate(
                      latitude,
                      longitude
                    )
                  ) {

                    console.warn(
                      '⚠️ Map rejected restaurant:',
                      {
                        index,
                        restaurant,
                      }
                    );

                    return null;

                  }


                  return {

                    ...restaurant,

                    latitude,

                    longitude,

                  };

                }
              )
              .filter(Boolean)
          : [];


      console.log(
        '🍽️ Map received restaurants:',
        restaurants.length,
        restaurants
      );


      // ------------------------------------------------------
      // CENTER
      // ------------------------------------------------------

      if (
        message.center
      ) {

        const centerLatitude =
          toFiniteNumber(
            message.center.latitude
          );

        const centerLongitude =
          toFiniteNumber(
            message.center.longitude
          );


        if (
          isValidCoordinate(
            centerLatitude,
            centerLongitude
          )
        ) {

          center = {

            latitude:
              centerLatitude,

            longitude:
              centerLongitude

          };

        }

      }


      // ------------------------------------------------------
      // ZOOM
      // ------------------------------------------------------

      if (
        Number.isFinite(
          Number(
            message.zoom
          )
        )
      ) {

        zoom =
          clamp(
            Number(
              message.zoom
            ),
            MIN_ZOOM,
            MAX_ZOOM
          );

      }


      // ------------------------------------------------------
      // RENDER
      // ------------------------------------------------------

      render();

    } catch (error) {

      console.error(
        '❌ Map message error:',
        error
      );

    }

  }


  document.addEventListener(
    'message',
    handleMessage
  );


  window.addEventListener(
    'message',
    handleMessage
  );


  // ==========================================================
  // RESIZE
  // ==========================================================

  window.addEventListener(
    'resize',
    function() {

      mapWidth =
        window.innerWidth;

      mapHeight =
        window.innerHeight;

      render();

    }
  );


  // ==========================================================
  // INITIAL RENDER
  // ==========================================================

  render();

})();

</script>

</body>

</html>
`;


// ============================================================
// DRIVER HOME SCREEN
// ============================================================

export default function DriverHomeScreen({
  navigation,
}) {

  const { user } =
    useAuth();


  // ==========================================================
  // SOCKET
  // ==========================================================

  const {
    socket,
    newNotification,
    clearNewNotification,
  } = useSocket();


  // ==========================================================
  // STATE
  // ==========================================================

  const [
    isOnline,
    setIsOnline,
  ] = useState(false);


  const [
    isLoadingLocation,
    setIsLoadingLocation,
  ] = useState(true);


  const [
    currentLocation,
    setCurrentLocation,
  ] = useState(null);


  const [
    restaurants,
    setRestaurants,
  ] = useState([]);


  const [
    isLoadingRestaurants,
    setIsLoadingRestaurants,
  ] = useState(true);


  const [
    locationError,
    setLocationError,
  ] = useState(null);


  const [
    mapReady,
    setMapReady,
  ] = useState(false);


  // ==========================================================
  // REFS
  // ==========================================================

  const webViewRef =
    useRef(null);


  const locationSubscriptionRef =
    useRef(null);


  const heartbeatIntervalRef =
    useRef(null);


  const lastRestLocationUpdateRef =
    useRef(0);


  const currentLocationRef =
    useRef(null);


  const isOnlineRef =
    useRef(false);


  const lastNotificationRef =
    useRef(null);


  const driverId =
    user?.driverId;


  // ==========================================================
  // KEEP ONLINE REF IN SYNC
  // ==========================================================

  useEffect(
    () => {

      isOnlineRef.current =
        isOnline;

    },
    [
      isOnline,
    ]
  );


  // ==========================================================
  // NORMALIZED RESTAURANTS
  // ==========================================================

  const normalizedRestaurants =
    useMemo(() => {

      return restaurants;

    }, [
      restaurants,
    ]);


  // ==========================================================
  // SEND DATA TO MAP
  // ==========================================================

  const sendMapData =
    useCallback(
      (
        locationOverride = null
      ) => {

        if (
          !webViewRef.current ||
          !mapReady
        ) {

          return;

        }


        const location =
          locationOverride ||
          currentLocationRef.current;


        const driver =
          location
            ? {
                latitude:
                  toNumber(
                    location.latitude
                  ),

                longitude:
                  toNumber(
                    location.longitude
                  ),
              }
            : null;


        const payload = {

          type:
            'map_data',

          driver,

          restaurants:
            normalizedRestaurants,

          center:
            location
              ? {
                  latitude:
                    toNumber(
                      location.latitude
                    ),

                  longitude:
                    toNumber(
                      location.longitude
                    ),
                }
              : BERKET_ELSAB_CENTER,

          zoom:
            location
              ? 15
              : 14,

        };


        console.log(
          '🗺️ Sending map data:',
          {
            driver,
            restaurants:
              normalizedRestaurants.length,
          }
        );


        webViewRef.current.postMessage(
          JSON.stringify(
            payload
          )
        );

      },
      [
        mapReady,
        normalizedRestaurants,
      ]
    );


  // ==========================================================
  // RESTAURANTS NORMALIZER
  // ==========================================================

  const normalizeRestaurants =
    useCallback(
      (response) => {

        const payload =
          response?.data;

        let list = [];


        if (
          Array.isArray(
            payload
          )
        ) {

          list =
            payload;

        } else if (
          Array.isArray(
            payload?.restaurants
          )
        ) {

          list =
            payload.restaurants;

        } else if (
          Array.isArray(
            payload?.vendors
          )
        ) {

          list =
            payload.vendors;

        } else if (
          Array.isArray(
            payload?.data
          )
        ) {

          list =
            payload.data;

        } else if (
          Array.isArray(
            payload?.data?.restaurants
          )
        ) {

          list =
            payload.data.restaurants;

        } else if (
          Array.isArray(
            payload?.data?.vendors
          )
        ) {

          list =
            payload.data.vendors;

        }


        console.log(
          '🍽️ Raw restaurant list:',
          list
        );


        return list
          .map(
            (
              restaurant,
              index
            ) => {

              const latitude =
                toNumber(
                  getRestaurantLatitude(
                    restaurant
                  )
                );


              const longitude =
                toNumber(
                  getRestaurantLongitude(
                    restaurant
                  )
                );


              if (
                !isValidCoordinate(
                  latitude,
                  longitude
                )
              ) {

                console.warn(
                  '⚠️ Invalid restaurant coordinates:',
                  {
                    index,
                    restaurant,
                    latitude,
                    longitude,
                  }
                );

                return null;

              }


              return {

                id:
                  getRestaurantId(
                    restaurant,
                    index
                  ),

                name:
                  getRestaurantName(
                    restaurant,
                    index
                  ),

                latitude,

                longitude,

              };

            }
          )
          .filter(Boolean);

      },
      []
    );


  // ==========================================================
  // LOAD RESTAURANTS
  // ==========================================================

  const loadRestaurants =
    useCallback(
      async () => {

        try {

          setIsLoadingRestaurants(
            true
          );


          const response =
            await vendorApi.getVendors();


          const normalized =
            normalizeRestaurants(
              response
            );


          setRestaurants(
            normalized
          );


          console.log(
            '🍽️ Restaurants loaded:',
            normalized.length
          );


          console.log(
            '🍽️ NORMALIZED RESTAURANTS:',
            JSON.stringify(
              normalized,
              null,
              2
            )
          );


          if (
            normalized.length === 0
          ) {

            console.warn(
              '⚠️ No restaurants with valid coordinates were returned.'
            );

          }

        } catch (error) {

          console.error(
            '❌ Failed to load restaurants:',
            error?.response?.data ||
            error?.message ||
            error
          );

          setRestaurants([]);

        } finally {

          setIsLoadingRestaurants(
            false
          );

        }

      },
      [
        normalizeRestaurants,
      ]
    );


  // ==========================================================
  // UPDATE LOCATION REST
  // ==========================================================

  const updateLocationREST =
    useCallback(
      async (
        latitude,
        longitude
      ) => {

        if (
          !driverId
        ) {

          return;

        }


        try {

          await driverApi.updateLocation(
            driverId,
            latitude,
            longitude
          );


          console.log(
            '📍 Driver location REST updated:',
            {
              driverId,
              latitude,
              longitude,
            }
          );

        } catch (error) {

          console.warn(
            '⚠️ Driver REST location update failed:',
            error?.response?.data ||
            error?.message ||
            error
          );

        }

      },
      [
        driverId,
      ]
    );


  // ==========================================================
  // SEND DRIVER LOCATION SOCKET
  // ==========================================================

  const emitDriverLocation =
    useCallback(
      (
        latitude,
        longitude,
        speed = 0,
        bearing = 0
      ) => {

        if (
          !socket ||
          !driverId
        ) {

          console.warn(
            '⚠️ Driver location socket not sent: socket or driverId missing.',
            {
              hasSocket:
                !!socket,
              driverId,
            }
          );

          return false;

        }


        if (
          !isValidCoordinate(
            latitude,
            longitude
          )
        ) {

          console.warn(
            '⚠️ Driver location socket rejected: invalid coordinates.',
            {
              latitude,
              longitude,
            }
          );

          return false;

        }


        socket.emit(
          'driver_location_update',
          {

            driverId,

            lat:
              latitude,

            lng:
              longitude,

            bearing:
              Number.isFinite(
                Number(
                  bearing
                )
              )
                ? Number(
                    bearing
                  )
                : 0,

            speed:
              Number.isFinite(
                Number(
                  speed
                )
              )
                ? Number(
                    speed
                  )
                : 0,

          }
        );


        console.log(
          '📡 Driver location socket sent:',
          {
            driverId,
            latitude,
            longitude,
            source: 'socket',
          }
        );


        return true;

      },
      [
        socket,
        driverId,
      ]
    );


  // ==========================================================
  // STOP DRIVER HEARTBEAT
  // ==========================================================

  const stopDriverHeartbeat =
    useCallback(
      () => {

        if (
          heartbeatIntervalRef.current
        ) {

          clearInterval(
            heartbeatIntervalRef.current
          );

          heartbeatIntervalRef.current =
            null;


          console.log(
            '🛑 Driver heartbeat stopped.'
          );

        }

      },
      []
    );


  // ==========================================================
  // SEND DRIVER HEARTBEAT
  // ==========================================================

  const sendDriverHeartbeat =
    useCallback(
      () => {

        if (
          !isOnlineRef.current
        ) {

          console.log(
            '⏸️ Driver heartbeat skipped: driver is offline.'
          );

          return;

        }


        if (
          !driverId
        ) {

          console.warn(
            '⚠️ Driver heartbeat skipped: missing driverId.'
          );

          return;

        }


        const location =
          currentLocationRef.current;


        if (
          !location
        ) {

          console.warn(
            '⚠️ Driver heartbeat skipped: no current location.'
          );

          return;

        }


        const latitude =
          toNumber(
            location.latitude
          );

        const longitude =
          toNumber(
            location.longitude
          );


        if (
          !isValidCoordinate(
            latitude,
            longitude
          )
        ) {

          console.warn(
            '⚠️ Driver heartbeat skipped: invalid current location.',
            {
              latitude,
              longitude,
            }
          );

          return;

        }


        const speed =
          Number(
            location.speed
          );

        const heading =
          Number(
            location.heading
          );


        const sent =
          emitDriverLocation(
            latitude,
            longitude,
            Number.isFinite(
              speed
            ) && speed >= 0
              ? speed
              : 0,
            Number.isFinite(
              heading
            ) && heading >= 0
              ? heading
              : 0
          );


        if (
          sent
        ) {

          console.log(
            '💓 DRIVER HEARTBEAT SENT',
            {
              driverId,
              latitude,
              longitude,
              interval:
                DRIVER_HEARTBEAT_INTERVAL,
            }
          );

        } else {

          console.warn(
            '⚠️ DRIVER HEARTBEAT COULD NOT BE SENT.',
            {
              driverId,
              hasSocket:
                !!socket,
            }
          );

        }

      },
      [
        driverId,
        emitDriverLocation,
        socket,
      ]
    );


  // ==========================================================
  // START DRIVER HEARTBEAT
  // ==========================================================

  const startDriverHeartbeat =
    useCallback(
      () => {

        stopDriverHeartbeat();


        if (
          !isOnlineRef.current
        ) {

          return;

        }


        if (
          !driverId
        ) {

          console.warn(
            '⚠️ Driver heartbeat not started: missing driverId.'
          );

          return;

        }


        console.log(
          '💓 Driver heartbeat started.',
          {
            driverId,
            interval:
              DRIVER_HEARTBEAT_INTERVAL,
          }
        );


        // ------------------------------------------------------
        // IMPORTANT:
        // Do NOT wait 45 seconds for the first heartbeat.
        // Send the current location immediately.
        // ------------------------------------------------------

        sendDriverHeartbeat();


        heartbeatIntervalRef.current =
          setInterval(
            () => {

              sendDriverHeartbeat();

            },
            DRIVER_HEARTBEAT_INTERVAL
          );

      },
      [
        driverId,
        sendDriverHeartbeat,
        stopDriverHeartbeat,
      ]
    );


  // ==========================================================
  // HANDLE NEW GPS LOCATION
  // ==========================================================

  const handleLocationUpdate =
    useCallback(
      async (
        location,
        forceRest = false
      ) => {

        if (
          !location?.coords
        ) {

          return;

        }


        const latitude =
          Number(
            location.coords.latitude
          );


        const longitude =
          Number(
            location.coords.longitude
          );


        if (
          !isValidCoordinate(
            latitude,
            longitude
          )
        ) {

          console.warn(
            '⚠️ Invalid GPS coordinates:',
            {
              latitude,
              longitude,
            }
          );

          return;

        }


        const speed =
          Number(
            location.coords.speed
          );


        const heading =
          Number(
            location.coords.heading
          );


        const normalizedLocation = {

          latitude,

          longitude,

          speed:
            Number.isFinite(
              speed
            ) &&
            speed >= 0
              ? speed
              : 0,

          heading:
            Number.isFinite(
              heading
            ) &&
            heading >= 0
              ? heading
              : 0,

          accuracy:
            Number(
              location.coords.accuracy
            ),

        };


        currentLocationRef.current =
          normalizedLocation;


        setCurrentLocation(
          normalizedLocation
        );


        setLocationError(
          null
        );


        // ------------------------------------------------------
        // SOCKET
        // ------------------------------------------------------

        if (
          isOnlineRef.current
        ) {

          emitDriverLocation(
            latitude,
            longitude,
            normalizedLocation.speed,
            normalizedLocation.heading
          );

        }


        // ------------------------------------------------------
        // REST FALLBACK
        // ------------------------------------------------------

        const now =
          Date.now();


        if (
          forceRest ||
          now -
            lastRestLocationUpdateRef.current >=
            REST_LOCATION_UPDATE_INTERVAL
        ) {

          lastRestLocationUpdateRef.current =
            now;


          await updateLocationREST(
            latitude,
            longitude
          );

        }


        // ------------------------------------------------------
        // MAP
        // ------------------------------------------------------

        sendMapData(
          normalizedLocation
        );

      },
      [
        emitDriverLocation,
        sendMapData,
        updateLocationREST,
      ]
    );


  // ==========================================================
  // REQUEST GPS PERMISSION
  // ==========================================================

  const requestLocation =
    useCallback(
      async (
        forceRest = false
      ) => {

        try {

          setIsLoadingLocation(
            true
          );


          setLocationError(
            null
          );


          const permission =
            await Location.requestForegroundPermissionsAsync();


          if (
            permission.status !==
            Location.PermissionStatus.GRANTED
          ) {

            setLocationError(
              'يجب السماح للتطبيق باستخدام موقعك الحالي.'
            );


            setIsLoadingLocation(
              false
            );


            Alert.alert(
              'صلاحية الموقع',
              'يجب السماح للتطبيق باستخدام الموقع حتى يتمكن التطبيق من استقبال الطلبات وتتبع موقعك.'
            );


            return null;

          }


          const location =
            await Location.getCurrentPositionAsync(
              {
                accuracy:
                  Location.Accuracy.High,
              }
            );


          await handleLocationUpdate(
            location,
            forceRest
          );


          setIsLoadingLocation(
            false
          );


          return location;

        } catch (error) {

          console.error(
            '❌ GPS error:',
            error
          );


          setLocationError(
            'تعذر الحصول على موقعك الحالي.'
          );


          setIsLoadingLocation(
            false
          );


          return null;

        }

      },
      [
        handleLocationUpdate,
      ]
    );


  // ==========================================================
  // START LOCATION WATCH
  // ==========================================================

  const startLocationTracking =
    useCallback(
      async () => {

        if (
          Platform.OS === 'web'
        ) {

          return;

        }


        if (
          locationSubscriptionRef.current
        ) {

          locationSubscriptionRef.current.remove();

          locationSubscriptionRef.current =
            null;

        }


        const permission =
          await Location.requestForegroundPermissionsAsync();


        if (
          permission.status !==
          Location.PermissionStatus.GRANTED
        ) {

          setLocationError(
            'يجب السماح للموقع حتى يتم تشغيل حالة Online.'
          );

          return;

        }


        const initialLocation =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,
            }
          );


        await handleLocationUpdate(
          initialLocation,
          true
        );


        locationSubscriptionRef.current =
          await Location.watchPositionAsync(

            {

              accuracy:
                Location.Accuracy.High,

              timeInterval:
                5000,

              // ------------------------------------------------
              // Keep this for movement-based GPS updates.
              // The heartbeat handles the stationary case.
              // ------------------------------------------------

              distanceInterval:
                LOCATION_DISTANCE_INTERVAL,

            },

            async (
              location
            ) => {

              await handleLocationUpdate(
                location,
                false
              );

            }

          );


        console.log(
          '📍 Driver GPS tracking started.'
        );

      },
      [
        handleLocationUpdate,
      ]
    );


  // ==========================================================
  // STOP LOCATION WATCH
  // ==========================================================

  const stopLocationTracking =
    useCallback(
      () => {

        if (
          locationSubscriptionRef.current
        ) {

          locationSubscriptionRef.current.remove();

          locationSubscriptionRef.current =
            null;

        }


        console.log(
          '🛑 Driver GPS tracking stopped.'
        );

      },
      []
    );


  // ==========================================================
  // LOAD RESTAURANTS
  // ==========================================================

  useEffect(
    () => {

      loadRestaurants();

    },
    [
      loadRestaurants,
    ]
  );


  // ==========================================================
  // LOAD INITIAL LOCATION
  // ==========================================================

  useEffect(
    () => {

      requestLocation(
        false
      );

    },
    [
      requestLocation,
    ]
  );


  // ==========================================================
  // ONLINE LOCATION TRACKING
  // ==========================================================

  useEffect(
    () => {

      isOnlineRef.current =
        isOnline;


      if (
        isOnline
      ) {

        startLocationTracking();

        startDriverHeartbeat();

      } else {

        stopLocationTracking();

        stopDriverHeartbeat();

      }


      return () => {

        stopLocationTracking();

        stopDriverHeartbeat();

      };

    },
    [
      isOnline,
      startLocationTracking,
      startDriverHeartbeat,
      stopLocationTracking,
      stopDriverHeartbeat,
    ]
  );


  // ==========================================================
  // SOCKET RECONNECT / CONNECT
  // ==========================================================

  useEffect(
    () => {

      if (
        !socket
      ) {

        return;

      }


      const handleSocketConnect =
        () => {

          console.log(
            '🔌 Driver socket connected/reconnected.',
            {
              driverId,
              online:
                isOnlineRef.current,
            }
          );


          if (
            !isOnlineRef.current
          ) {

            return;

          }


          // ----------------------------------------------------
          // Socket may have been disconnected while the driver
          // was online. Send the last known GPS immediately.
          // ----------------------------------------------------

          sendDriverHeartbeat();

        };


      socket.on(
        'connect',
        handleSocketConnect
      );


      // --------------------------------------------------------
      // If socket is already connected when this effect mounts,
      // send a heartbeat immediately as well.
      // --------------------------------------------------------

      if (
        socket.connected &&
        isOnlineRef.current
      ) {

        sendDriverHeartbeat();

      }


      return () => {

        socket.off(
          'connect',
          handleSocketConnect
        );

      };

    },
    [
      socket,
      driverId,
      sendDriverHeartbeat,
    ]
  );


  // ==========================================================
  // MAP UPDATE WHEN RESTAURANTS CHANGE
  // ==========================================================

  useEffect(
    () => {

      if (
        mapReady
      ) {

        sendMapData();

      }

    },
    [
      mapReady,
      normalizedRestaurants,
      sendMapData,
    ]
  );


  // ==========================================================
  // NEW NOTIFICATION
  // ==========================================================

  useEffect(
    () => {

      if (
        !newNotification
      ) {

        return;

      }


      const notificationId =
        newNotification?.id ??
        newNotification?.notificationId ??
        newNotification?.notification_id ??
        `${newNotification?.orderId ?? 'none'}_${newNotification?.receivedAt ?? Date.now()}`;


      // منع عرض نفس الإشعار أكثر من مرة

      if (
        lastNotificationRef.current ===
        notificationId
      ) {

        return;

      }


      lastNotificationRef.current =
        notificationId;


      console.log(
        '\n🔔 ======================================='
      );


      console.log(
        '🔔 DRIVER HOME RECEIVED NOTIFICATION'
      );


      console.log(
        '🔔 Notification:',
        newNotification
      );


      console.log(
        '🔔 =======================================\n'
      );


      // ======================================================
      // ORDER ID
      // ======================================================

      const orderId =
        newNotification?.orderId ??
        newNotification?.order_id ??
        newNotification?.OrderId ??
        newNotification?.order?.id ??
        newNotification?.order?.Id ??
        null;


      // ======================================================
      // TITLE
      // ======================================================

      const title =
        newNotification?.title ||
        'طلب جديد';


      // ======================================================
      // MESSAGE
      // ======================================================

      const message =
        newNotification?.message ||
        'لديك إشعار جديد';


      // ======================================================
      // TYPE
      // ======================================================

      const type =
        String(
          newNotification?.type ||
          ''
        ).toLowerCase();


      // ======================================================
      // ORDER NOTIFICATION
      // ======================================================

      const isOrderNotification =
        !!orderId ||
        type.includes('order') ||
        type.includes('new_order') ||
        type.includes('incoming');


      if (
        isOrderNotification &&
        orderId
      ) {

        Alert.alert(
          title,
          message,
          [
            {
              text: 'لاحقًا',

              style: 'cancel',

              onPress: () => {

                clearNewNotification();

              },

            },

            {
              text: 'عرض الطلب',

              onPress: () => {

                clearNewNotification();


                navigation.navigate(
                  'IncomingOrder',
                  {
                    order: {

                      ...newNotification,

                      id:
                        Number(
                          orderId
                        ),

                      orderId:
                        Number(
                          orderId
                        ),

                    },
                  }
                );

              },

            },

          ],

          {
            cancelable: true,

            onDismiss: () => {

              clearNewNotification();

            },

          }

        );

      } else {

        // ====================================================
        // GENERAL NOTIFICATION
        // ====================================================

        Alert.alert(
          title,
          message,
          [
            {
              text: 'حسنًا',

              onPress: () => {

                clearNewNotification();

              },

            },

          ],

          {
            cancelable: true,

            onDismiss: () => {

              clearNewNotification();

            },

          }

        );

      }

    },
    [
      newNotification,
      clearNewNotification,
      navigation,
    ]
  );


  // ==========================================================
  // INCOMING ORDERS
  // ==========================================================

  useEffect(
    () => {

      if (
        !socket
      ) {

        return;

      }


      const handleIncomingOrder =
        (order) => {

          console.log(
            '📦 Incoming order:',
            order
          );


          navigation.navigate(
            'IncomingOrder',
            {
              order,
            }
          );

        };


      socket.on(
        'order:incoming',
        handleIncomingOrder
      );


      return () => {

        socket.off(
          'order:incoming',
          handleIncomingOrder
        );

      };

    },
    [
      socket,
      navigation,
    ]
  );


  // ==========================================================
  // ONLINE ERROR MESSAGE
  // ==========================================================

  const showOnlineEligibilityError =
    useCallback(
      (error) => {

        const data =
          error?.response?.data || {};


        const reasons =
          Array.isArray(
            data.reasons
          )
            ? data.reasons
            : [];


        const missingDocs =
          Array.isArray(
            data.missingDocs
          )
            ? data.missingDocs
            : [];


        const hasDocumentsProblem =
          reasons.includes(
            'DOCUMENTS_NOT_APPROVED'
          ) ||
          missingDocs.length > 0;


        if (
          hasDocumentsProblem
        ) {

          const missingDocumentNames =
            missingDocs
              .map(
                (documentType) =>
                  DOCUMENT_LABELS[
                    documentType
                  ] ||
                  documentType
              )
              .join(
                '\n'
              );


          const balance =
            toNumber(
              data.balance
            );


          const minRequiredBalance =
            toNumber(
              data.minRequiredBalance
            );


          let message =
            'لا يمكن تشغيل حالة Online لأن حساب السائق غير مكتمل.';


          if (
            missingDocumentNames
          ) {

            message +=
              '\n\nالمستندات التي تحتاج إلى اعتماد:\n' +
              missingDocumentNames;

          }


          if (
            balance !== null &&
            minRequiredBalance !== null
          ) {

            message +=
              '\n\nالرصيد الحالي: ' +
              balance +
              ' جنيه' +
              '\nالحد الأدنى المطلوب: ' +
              minRequiredBalance +
              ' جنيه';

          }


          message +=
            '\n\nبعد اعتماد المستندات المطلوبة يمكنك تشغيل Online.';


          Alert.alert(
            'الحساب غير مكتمل',
            message
          );


          return;

        }


        Alert.alert(
          'تعذر تشغيل Online',
          data.message ||
          'تعذر تغيير حالة السائق.'
        );

      },
      []
    );


  // ==========================================================
  // TOGGLE ONLINE
  // ==========================================================

  const toggleOnline =
    useCallback(
      async () => {

        if (
          !driverId
        ) {

          Alert.alert(
            'خطأ',
            'لم يتم العثور على Driver ID.'
          );

          return;

        }


        const newStatus =
          !isOnline;


        try {

          await driverApi.updateStatus(
            driverId,
            newStatus
              ? 'available'
              : 'offline'
          );


          // ----------------------------------------------------
          // Update ref immediately before state.
          // This prevents the heartbeat from seeing stale state.
          // ----------------------------------------------------

          isOnlineRef.current =
            newStatus;


          setIsOnline(
            newStatus
          );


          if (
            newStatus
          ) {

            console.log(
              '🟢 Driver is now ONLINE.'
            );


            const location =
              await requestLocation(
                true
              );


            if (
              location
            ) {

              // ------------------------------------------------
              // Start heartbeat immediately after the first
              // valid location is available.
              // ------------------------------------------------

              startDriverHeartbeat();

            } else {

              Alert.alert(
                'تنبيه',
                'تم تشغيل Online لكن لم نتمكن من تحديد موقعك. تأكد من تشغيل GPS والسماح بصلاحية الموقع.'
              );

            }

          } else {

            console.log(
              '🔴 Driver is now OFFLINE.'
            );


            // ----------------------------------------------------
            // Stop heartbeat immediately.
            // ----------------------------------------------------

            stopDriverHeartbeat();

          }

        } catch (error) {

          console.error(
            '❌ Failed to update driver status:',
            error?.response?.data ||
            error?.message ||
            error
          );


          isOnlineRef.current =
            false;


          setIsOnline(
            false
          );


          stopDriverHeartbeat();


          showOnlineEligibilityError(
            error
          );

        }

      },
      [
        driverId,
        isOnline,
        requestLocation,
        showOnlineEligibilityError,
        startDriverHeartbeat,
        stopDriverHeartbeat,
      ]
    );


  // ==========================================================
  // RECENTER
  // ==========================================================

  const centerOnCurrentLocation =
    useCallback(
      async () => {

        if (
          currentLocationRef.current
        ) {

          sendMapData(
            currentLocationRef.current
          );

          return;

        }


        await requestLocation(
          true
        );

      },
      [
        requestLocation,
        sendMapData,
      ]
    );


  // ==========================================================
  // FINAL CLEANUP
  // ==========================================================

  useEffect(
    () => {

      return () => {

        isOnlineRef.current =
          false;

        stopDriverHeartbeat();

        stopLocationTracking();

      };

    },
    [
      stopDriverHeartbeat,
      stopLocationTracking,
    ]
  );


  // ==========================================================
  // WEB BLOCK
  // ==========================================================

  if (
    Platform.OS === 'web'
  ) {

    return (

      <View
        style={
          styles.webBlockedContainer
        }
      >

        <Ionicons
          name="phone-portrait-outline"
          size={54}
          color={SKY_BLUE}
        />


        <Text
          style={
            styles.webBlockedTitle
          }
        >
          شاشة السائق
        </Text>


        <Text
          style={
            styles.webBlockedText
          }
        >
          افتح التطبيق من الموبايل
          للحصول على موقع GPS الحقيقي.
        </Text>

      </View>

    );

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <View
      style={
        styles.container
      }
    >

      {/* ======================================================
          MAP
      ====================================================== */}

      <View
        style={
          styles.mapContainer
        }
      >

        <WebView

          ref={
            webViewRef
          }

          source={{
            html:
              MAP_HTML,
          }}

          originWhitelist={[
            '*',
          ]}

          javaScriptEnabled={
            true
          }

          domStorageEnabled={
            true
          }

          onLoadEnd={() => {

            console.log(
              '🗺️ Map WebView loaded.'
            );

            setMapReady(
              true
            );

          }}

          onError={(
            event
          ) => {

            console.error(
              '❌ Map WebView error:',
              event.nativeEvent
            );

          }}

          onMessage={(
            event
          ) => {

            try {

              const message =
                JSON.parse(
                  event.nativeEvent.data
                );


              if (
                message.type ===
                'recenter_driver'
              ) {

                centerOnCurrentLocation();

              }

            } catch (
              error
            ) {

              console.warn(
                'Map message parse error:',
                error
              );

            }

          }}

          style={
            styles.webView
          }

        />


        {/* ====================================================
            TOP STATUS
        ==================================================== */}

        <View
          style={
            styles.topOverlay
          }
        >

          <View
            style={[
              styles.statusCard,
              isOnline
                ? styles.statusOnline
                : styles.statusOffline,
            ]}
          >

            <View
              style={
                styles.statusDot
              }
            />


            <Text
              style={
                styles.statusText
              }
            >
              {isOnline
                ? 'متصل ومستعد لاستقبال الطلبات'
                : 'غير متصل'}
            </Text>

          </View>


          <View
            style={
              styles.restaurantCount
            }
          >

            <Ionicons
              name="restaurant"
              size={16}
              color={SKY_BLUE}
            />


            <Text
              style={
                styles.restaurantCountText
              }
            >
              {isLoadingRestaurants
                ? '...'
                : restaurants.length}
            </Text>

          </View>

        </View>


        {/* ====================================================
            GPS LOADING
        ==================================================== */}

        {isLoadingLocation && (

          <View
            style={
              styles.gpsLoading
            }
          >

            <ActivityIndicator
              size="small"
              color={SKY_BLUE}
            />


            <Text
              style={
                styles.gpsLoadingText
              }
            >
              جاري تحديد موقعك...
            </Text>

          </View>

        )}


        {/* ====================================================
            GPS ERROR
        ==================================================== */}

        {locationError && (

          <View
            style={
              styles.errorCard
            }
          >

            <Ionicons
              name="warning-outline"
              size={18}
              color="#b00020"
            />


            <Text
              style={
                styles.errorText
              }
            >
              {locationError}
            </Text>

          </View>

        )}


        {/* ====================================================
            RESTAURANT LOADING
        ==================================================== */}

        {isLoadingRestaurants && (

          <View
            style={
              styles.restaurantLoading
            }
          >

            <ActivityIndicator
              size="small"
              color={SKY_BLUE}
            />


            <Text
              style={
                styles.restaurantLoadingText
              }
            >
              جاري تحميل المطاعم...
            </Text>

          </View>

        )}


        {/* ====================================================
            RECENTER BUTTON
        ==================================================== */}

        <TouchableOpacity

          activeOpacity={
            0.8
          }

          onPress={
            centerOnCurrentLocation
          }

          style={
            styles.recenterButton
          }

        >

          <Ionicons
            name="locate"
            size={24}
            color={SKY_BLUE}
          />

        </TouchableOpacity>

      </View>


      {/* ======================================================
          BOTTOM PANEL
      ====================================================== */}

      <View
        style={
          styles.bottomPanel
        }
      >

        <View
          style={
            styles.locationRow
          }
        >

          <View
            style={
              styles.locationIcon
            }
          >

            <Ionicons
              name="navigate"
              size={20}
              color={SKY_BLUE}
            />

          </View>


          <View
            style={
              styles.locationInfo
            }
          >

            <Text
              style={
                styles.locationTitle
              }
            >
              موقعك الحالي
            </Text>


            {currentLocation ? (

              <Text
                style={
                  styles.locationCoordinates
                }
                numberOfLines={
                  1
                }
              >
                {currentLocation.latitude.toFixed(6)}
                {' , '}
                {currentLocation.longitude.toFixed(6)}
              </Text>

            ) : (

              <Text
                style={
                  styles.locationCoordinates
                }
              >
                جاري تحديد الموقع...
              </Text>

            )}

          </View>


          <TouchableOpacity

            activeOpacity={
              0.8
            }

            onPress={
              centerOnCurrentLocation
            }

            style={
              styles.smallLocationButton
            }

          >

            <Ionicons
              name="locate-outline"
              size={22}
              color={SKY_BLUE}
            />

          </TouchableOpacity>

        </View>


        {/* ====================================================
            MAP LEGEND
        ==================================================== */}

        <View
          style={
            styles.mapLegend
          }
        >

          {/* DRIVER LEGEND */}

          <View
            style={
              styles.legendItem
            }
          >

            <View
              style={
                styles.driverLegendIcon
              }
            >

              <Ionicons
                name="bicycle"
                size={16}
                color="#ffffff"
              />

            </View>


            <Text
              style={
                styles.legendText
              }
            >
              موقعك
            </Text>

          </View>


          {/* RESTAURANT LEGEND */}

          <View
            style={
              styles.legendItem
            }
          >

            <View
              style={
                styles.restaurantLegendIcon
              }
            >

              <Ionicons
                name="restaurant"
                size={15}
                color="#ffffff"
              />

            </View>


            <Text
              style={
                styles.legendText
              }
            >
              المطاعم
            </Text>

          </View>


          {/* RESTAURANT TOTAL */}

          <View
            style={
              styles.restaurantTotal
            }
          >

            <Text
              style={
                styles.restaurantTotalText
              }
            >
              {restaurants.length}
            </Text>


            <Text
              style={
                styles.restaurantTotalLabel
              }
            >
              مطعم
            </Text>

          </View>

        </View>


        {/* ====================================================
            ONLINE BUTTON
        ==================================================== */}

        <TouchableOpacity

          activeOpacity={
            0.85
          }

          onPress={
            toggleOnline
          }

          style={[
            styles.onlineButton,
            isOnline
              ? styles.onlineButtonActive
              : styles.onlineButtonInactive,
          ]}

        >

          <View
            style={
              styles.onlineButtonIcon
            }
          >

            <Ionicons

              name={
                isOnline
                  ? 'radio'
                  : 'power-outline'
              }

              size={22}

              color={
                isOnline
                  ? '#ffffff'
                  : SKY_BLUE
              }

            />

          </View>


          <Text
            style={[
              styles.onlineButtonText,
              isOnline
                ? styles.onlineButtonTextActive
                : styles.onlineButtonTextInactive,
            ]}
          >
            {isOnline
              ? 'أنت متصل - إيقاف استقبال الطلبات'
              : 'العمل Online - استقبال الطلبات'}
          </Text>

        </TouchableOpacity>

      </View>

    </View>

  );

}


// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor:
      '#f5fbff',

  },


  mapContainer: {

    flex: 1,

    position: 'relative',

    overflow: 'hidden',

  },


  webView: {

    flex: 1,

    backgroundColor:
      '#e9e9e9',

  },


  // ==========================================================
  // TOP
  // ==========================================================

  topOverlay: {

    position: 'absolute',

    top: 15,

    left: 15,

    right: 15,

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    zIndex: 20,

  },


  statusCard: {

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 14,

    paddingVertical: 10,

    borderRadius: 22,

    backgroundColor:
      '#ffffff',

    elevation: 5,

    shadowColor: '#000',

    shadowOpacity: 0.15,

    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 3,
    },

  },


  statusOnline: {

    borderWidth: 1,

    borderColor:
      SKY_BLUE,

  },


  statusOffline: {

    borderWidth: 1,

    borderColor:
      '#dddddd',

  },


  statusDot: {

    width: 10,

    height: 10,

    borderRadius: 5,

    backgroundColor:
      SKY_BLUE,

    marginRight: 8,

  },


  statusText: {

    fontSize: 13,

    fontWeight: '700',

    color:
      '#333333',

  },


  restaurantCount: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      '#ffffff',

    paddingHorizontal: 13,

    paddingVertical: 10,

    borderRadius: 20,

    elevation: 5,

    shadowColor: '#000',

    shadowOpacity: 0.15,

    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 3,
    },

  },


  restaurantCountText: {

    marginLeft: 6,

    fontSize: 14,

    fontWeight: '800',

    color:
      '#333333',

  },


  // ==========================================================
  // GPS
  // ==========================================================

  gpsLoading: {

    position: 'absolute',

    top: 72,

    alignSelf: 'center',

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      'rgba(255,255,255,0.95)',

    paddingHorizontal: 14,

    paddingVertical: 9,

    borderRadius: 20,

    elevation: 4,

  },


  gpsLoadingText: {

    marginLeft: 8,

    fontSize: 12,

    color:
      '#444444',

    fontWeight: '600',

  },


  errorCard: {

    position: 'absolute',

    left: 15,

    right: 15,

    bottom: 15,

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      '#fff0f0',

    borderRadius: 12,

    padding: 11,

    zIndex: 30,

  },


  errorText: {

    flex: 1,

    marginLeft: 8,

    fontSize: 12,

    color:
      '#b00020',

    textAlign: 'right',

  },


  restaurantLoading: {

    position: 'absolute',

    top: 120,

    alignSelf: 'center',

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      'rgba(255,255,255,0.95)',

    paddingHorizontal: 14,

    paddingVertical: 9,

    borderRadius: 20,

    elevation: 4,

  },


  restaurantLoadingText: {

    marginLeft: 8,

    fontSize: 12,

    color:
      '#555555',

  },


  // ==========================================================
  // RECENTER
  // ==========================================================

  recenterButton: {

    position: 'absolute',

    right: 15,

    bottom: 20,

    width: 50,

    height: 50,

    borderRadius: 16,

    backgroundColor:
      '#ffffff',

    alignItems: 'center',

    justifyContent: 'center',

    elevation: 6,

    shadowColor: '#000',

    shadowOpacity: 0.18,

    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    borderWidth: 1,

    borderColor:
      '#E1F5FE',

    zIndex: 40,

  },


  // ==========================================================
  // BOTTOM PANEL
  // ==========================================================

  bottomPanel: {

    backgroundColor:
      '#ffffff',

    paddingHorizontal: 16,

    paddingTop: 14,

    paddingBottom: 18,

    borderTopLeftRadius: 22,

    borderTopRightRadius: 22,

    elevation: 15,

    shadowColor: '#000',

    shadowOpacity: 0.15,

    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: -4,
    },

  },


  locationRow: {

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 12,

  },


  locationIcon: {

    width: 42,

    height: 42,

    borderRadius: 13,

    backgroundColor:
      SKY_BLUE_LIGHT,

    alignItems: 'center',

    justifyContent: 'center',

  },


  locationInfo: {

    flex: 1,

    marginLeft: 10,

  },


  locationTitle: {

    fontSize: 13,

    color:
      '#777777',

    marginBottom: 3,

  },


  locationCoordinates: {

    fontSize: 13,

    color:
      '#222222',

    fontWeight: '700',

  },


  smallLocationButton: {

    width: 42,

    height: 42,

    borderRadius: 13,

    backgroundColor:
      SKY_BLUE_LIGHT,

    alignItems: 'center',

    justifyContent: 'center',

  },


  // ==========================================================
  // LEGEND
  // ==========================================================

  mapLegend: {

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 13,

    paddingHorizontal: 4,

  },


  legendItem: {

    flexDirection: 'row',

    alignItems: 'center',

    marginRight: 16,

  },


  driverLegendIcon: {

    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor:
      SKY_BLUE,

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 6,

  },


  restaurantLegendIcon: {

    width: 28,

    height: 28,

    borderRadius: 14,

    backgroundColor:
      SKY_BLUE_DARK,

    alignItems: 'center',

    justifyContent: 'center',

    marginRight: 6,

  },


  legendText: {

    fontSize: 12,

    color:
      '#555555',

    fontWeight: '600',

  },


  restaurantTotal: {

    marginLeft: 'auto',

    alignItems: 'center',

  },


  restaurantTotalText: {

    fontSize: 15,

    fontWeight: '900',

    color:
      SKY_BLUE_DARK,

  },


  restaurantTotalLabel: {

    fontSize: 9,

    color:
      '#777777',

  },


  // ==========================================================
  // ONLINE BUTTON
  // ==========================================================

  onlineButton: {

    height: 54,

    borderRadius: 16,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

  },


  onlineButtonInactive: {

    backgroundColor:
      SKY_BLUE_SOFT,

    borderWidth: 1,

    borderColor:
      SKY_BLUE,

  },


  onlineButtonActive: {

    backgroundColor:
      SKY_BLUE_DARK,

  },


  onlineButtonIcon: {

    marginRight: 9,

  },


  onlineButtonText: {

    fontSize: 14,

    fontWeight: '800',

  },


  onlineButtonTextInactive: {

    color:
      SKY_BLUE_DARK,

  },


  onlineButtonTextActive: {

    color:
      '#ffffff',

  },


  // ==========================================================
  // WEB
  // ==========================================================

  webBlockedContainer: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor:
      SKY_BLUE_SOFT,

    padding: 30,

  },


  webBlockedTitle: {

    marginTop: 15,

    fontSize: 22,

    fontWeight: '900',

    color:
      '#222222',

  },


  webBlockedText: {

    marginTop: 8,

    fontSize: 14,

    color:
      '#777777',

    textAlign: 'center',

    lineHeight: 22,

  },

});