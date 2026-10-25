
// src/screens/Customer/OrderTrackingScreen.js

import React, {
  useCallback,
  useEffect,
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
  Linking,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import { COLORS } from '../../constants/colors';
import {
  FONT_SIZES,
  SPACING,
  RADIUS,
} from '../../constants/theme';

import orderApi from '../../api/orderApi';
import { useSocket } from '../../context/SocketContext';


// ============================================================
// STATUS
// ============================================================

const STATUS_STEPS = [
  {
    key: 'pending',
    label: 'جاري البحث عن سائق',
    icon: 'search-outline',
  },
  {
    key: 'confirmed',
    label: 'تم تأكيد الطلب',
    icon: 'checkmark-circle-outline',
  },
  {
    key: 'preparing',
    label: 'جاري تجهيز الطلب',
    icon: 'restaurant-outline',
  },
  {
    key: 'ready',
    label: 'الطلب جاهز',
    icon: 'bag-check-outline',
  },
  {
    key: 'picked_up',
    label: 'السائق استلم الطلب',
    icon: 'bicycle-outline',
  },
  {
    key: 'on_the_way',
    label: 'السائق في الطريق',
    icon: 'navigate-outline',
  },
  {
    key: 'delivered',
    label: 'تم توصيل الطلب',
    icon: 'checkmark-done-circle-outline',
  },
];

const CANCELLABLE_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
];


// ============================================================
// HELPERS
// ============================================================

const normalizeStatus = (status) => {
  if (!status) {
    return 'pending';
  }

  return String(status)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
};


// ============================================================
// COORDINATE VALIDATION
// ============================================================
//
// IMPORTANT:
//
// Number(null) === 0
// Number(undefined) === NaN
// Number("") === 0
//
// لذلك لا نحول القيمة إلى Number قبل التأكد أنها موجودة.
//
// كذلك 0,0 غير مقبول كموقع حقيقي للسائق.
// ============================================================

const normalizeCoordinateNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
};

const isValidLatitude = (value) => {
  return (
    Number.isFinite(value) &&
    value >= -90 &&
    value <= 90
  );
};

const isValidLongitude = (value) => {
  return (
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
};

const parseCoordinates = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  // ----------------------------------------------------------
  // Array [lat, lng]
  // ----------------------------------------------------------

  if (
    Array.isArray(value) &&
    value.length >= 2
  ) {
    const latitude =
      normalizeCoordinateNumber(
        value[0]
      );

    const longitude =
      normalizeCoordinateNumber(
        value[1]
      );

    if (
      isValidLatitude(latitude) &&
      isValidLongitude(longitude)
    ) {
      if (
        latitude === 0 &&
        longitude === 0
      ) {
        return null;
      }

      return {
        latitude,
        longitude,
      };
    }

    return null;
  }

  if (
    typeof value !== 'object'
  ) {
    return null;
  }

  // ----------------------------------------------------------
  // Direct latitude / longitude
  // ----------------------------------------------------------

  if (
    value.latitude !== undefined &&
    value.longitude !== undefined
  ) {
    const latitude =
      normalizeCoordinateNumber(
        value.latitude
      );

    const longitude =
      normalizeCoordinateNumber(
        value.longitude
      );

    if (
      isValidLatitude(latitude) &&
      isValidLongitude(longitude)
    ) {
      if (
        latitude === 0 &&
        longitude === 0
      ) {
        return null;
      }

      return {
        latitude,
        longitude,
      };
    }
  }

  // ----------------------------------------------------------
  // lat / lng
  // ----------------------------------------------------------

  if (
    value.lat !== undefined &&
    value.lng !== undefined
  ) {
    const latitude =
      normalizeCoordinateNumber(
        value.lat
      );

    const longitude =
      normalizeCoordinateNumber(
        value.lng
      );

    if (
      isValidLatitude(latitude) &&
      isValidLongitude(longitude)
    ) {
      if (
        latitude === 0 &&
        longitude === 0
      ) {
        return null;
      }

      return {
        latitude,
        longitude,
      };
    }
  }

  // ----------------------------------------------------------
  // lat / lon
  // ----------------------------------------------------------

  if (
    value.lat !== undefined &&
    value.lon !== undefined
  ) {
    const latitude =
      normalizeCoordinateNumber(
        value.lat
      );

    const longitude =
      normalizeCoordinateNumber(
        value.lon
      );

    if (
      isValidLatitude(latitude) &&
      isValidLongitude(longitude)
    ) {
      if (
        latitude === 0 &&
        longitude === 0
      ) {
        return null;
      }

      return {
        latitude,
        longitude,
      };
    }
  }

  // ----------------------------------------------------------
  // GeoJSON
  // coordinates = [lng, lat]
  // ----------------------------------------------------------

  if (
    Array.isArray(value.coordinates) &&
    value.coordinates.length >= 2
  ) {
    const longitude =
      normalizeCoordinateNumber(
        value.coordinates[0]
      );

    const latitude =
      normalizeCoordinateNumber(
        value.coordinates[1]
      );

    if (
      isValidLatitude(latitude) &&
      isValidLongitude(longitude)
    ) {
      if (
        latitude === 0 &&
        longitude === 0
      ) {
        return null;
      }

      return {
        latitude,
        longitude,
      };
    }
  }

  // ----------------------------------------------------------
  // Nested locations
  // ----------------------------------------------------------

  const nestedKeys = [
    'location',
    'pickup',
    'dropoff',
    'restaurant',
    'driver',
    'address',
    'position',
  ];

  for (const key of nestedKeys) {
    if (
      value[key] !== null &&
      value[key] !== undefined
    ) {
      const result =
        parseCoordinates(
          value[key]
        );

      if (result) {
        return result;
      }
    }
  }

  return null;
};


// ============================================================
// DRIVER LOCATION FROM ORDER
// ============================================================

const parseDriverLocationFromOrder = (
  order
) => {
  if (!order) {
    return null;
  }

  // ----------------------------------------------------------
  // IMPORTANT:
  //
  // Do not call Number(null).
  // parseCoordinates handles null safely.
  // ----------------------------------------------------------

  const directDriver =
    parseCoordinates({
      latitude:
        order.driver_lat ??
        order.driverLat,

      longitude:
        order.driver_lng ??
        order.driverLng,
    });

  if (directDriver) {
    return directDriver;
  }

  // ----------------------------------------------------------
  // Nested driver object
  // ----------------------------------------------------------

  const nestedDriver =
    parseCoordinates(
      order.driver
    );

  if (nestedDriver) {
    return nestedDriver;
  }

  return null;
};


// ============================================================
// ORDER ID FROM SOCKET EVENT
// ============================================================

const getEventOrderId = (
  payload
) => {
  if (!payload) {
    return null;
  }

  return (
    payload.orderId ??
    payload.order_id ??
    payload.id ??
    payload.order?.id ??
    payload.order?.orderId ??
    null
  );
};


// ============================================================
// SOCKET DRIVER LOCATION
// ============================================================

const parseDriverLocationFromSocket = (
  payload
) => {
  if (!payload) {
    return null;
  }

  // ----------------------------------------------------------
  // Direct payload
  // ----------------------------------------------------------

  const direct =
    parseCoordinates({
      latitude:
        payload.latitude ??
        payload.lat,

      longitude:
        payload.longitude ??
        payload.lng ??
        payload.lon,
    });

  if (direct) {
    return direct;
  }

  // ----------------------------------------------------------
  // driver object
  // ----------------------------------------------------------

  const driver =
    parseCoordinates(
      payload.driver
    );

  if (driver) {
    return driver;
  }

  // ----------------------------------------------------------
  // location object
  // ----------------------------------------------------------

  const location =
    parseCoordinates(
      payload.location
    );

  if (location) {
    return location;
  }

  // ----------------------------------------------------------
  // position object
  // ----------------------------------------------------------

  const position =
    parseCoordinates(
      payload.position
    );

  if (position) {
    return position;
  }

  return null;
};


// ============================================================
// OPEN STREET MAP HTML
// NO GOOGLE
// NO LEAFLET
// ============================================================

const createOpenStreetMapHTML = () => `
<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
/>

<style>

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #e8e8e8;
  font-family: Arial, sans-serif;
}

#map {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #e8e8e8;
  touch-action: none;
}

#tiles {
  position: absolute;
  inset: 0;
}

.tile {
  position: absolute;
  width: 256px;
  height: 256px;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
}

#routeCanvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

#markers {
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}

.marker {
  position: absolute;
  width: 46px;
  height: 46px;
  margin-left: -23px;
  margin-top: -46px;
  pointer-events: none;
}

.marker-inner {
  width: 42px;
  height: 42px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 3px 10px rgba(0,0,0,0.28);
  border: 3px solid #ffffff;
}

.marker-icon {
  transform: rotate(45deg);
  color: #ffffff;
  font-size: 20px;
  font-weight: bold;
}

.restaurant .marker-inner {
  background: #d4a017;
}

.customer .marker-inner {
  background: #2e7d32;
}

.driver .marker-inner {
  background: #1976d2;
}

#zoomControls {
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: auto;
}

.zoomButton {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 12px;
  background: #ffffff;
  color: #333333;
  font-size: 25px;
  box-shadow:
    0 3px 12px rgba(0,0,0,0.18);
}

#osmBadge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  z-index: 100;
  background: rgba(255,255,255,0.88);
  padding: 3px 7px;
  border-radius: 4px;
  font-size: 10px;
  color: #333;
  pointer-events: none;
}

</style>

</head>

<body>

<div id="map">

  <div id="tiles"></div>

  <canvas id="routeCanvas"></canvas>

  <div id="markers"></div>

  <div id="zoomControls">

    <button
      class="zoomButton"
      onclick="zoomIn()"
    >
      +
    </button>

    <button
      class="zoomButton"
      onclick="zoomOut()"
    >
      −
    </button>

  </div>

  <div id="osmBadge">
    © OpenStreetMap contributors
  </div>

</div>

<script>

const TILE_SIZE = 256;

let zoom = 13;

let centerLat = 30.6391;
let centerLng = 31.0766;

let markers = [];
let route = [];

let mapWidth = window.innerWidth;
let mapHeight = window.innerHeight;

let dragging = false;

let lastX = 0;
let lastY = 0;

let renderFrame = null;


// ============================================================
// CLAMP
// ============================================================

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


// ============================================================
// WEB MERCATOR
// ============================================================

function latLngToWorld(
  lat,
  lng,
  z
) {

  const safeLat =
    clamp(
      lat,
      -85.05112878,
      85.05112878
    );

  const scale =
    TILE_SIZE *
    Math.pow(2, z);

  const x =
    ((lng + 180) / 360) *
    scale;

  const sinLat =
    Math.sin(
      safeLat *
      Math.PI /
      180
    );

  const y =
    (
      0.5 -
      Math.log(
        (1 + sinLat) /
        (1 - sinLat)
      ) /
      (4 * Math.PI)
    ) *
    scale;

  return {
    x,
    y,
  };
}


function worldToLatLng(
  x,
  y,
  z
) {

  const scale =
    TILE_SIZE *
    Math.pow(2, z);

  const lng =
    (x / scale) *
    360 -
    180;

  const n =
    Math.PI -
    (2 * Math.PI * y) /
    scale;

  const lat =
    180 /
    Math.PI *
    Math.atan(
      0.5 *
      (
        Math.exp(n) -
        Math.exp(-n)
      )
    );

  return {
    latitude: lat,
    longitude: lng,
  };
}


// ============================================================
// SCHEDULE RENDER
// ============================================================

function scheduleRender() {

  if (renderFrame) {
    cancelAnimationFrame(
      renderFrame
    );
  }

  renderFrame =
    requestAnimationFrame(
      () => {
        renderFrame = null;
        renderMap();
      }
    );
}


// ============================================================
// MAP RENDER
// ============================================================

function renderMap() {

  const tiles =
    document.getElementById(
      'tiles'
    );

  if (!tiles) {
    return;
  }

  tiles.innerHTML = '';

  const centerWorld =
    latLngToWorld(
      centerLat,
      centerLng,
      zoom
    );

  const startX =
    Math.floor(
      (
        centerWorld.x -
        mapWidth / 2
      ) /
      TILE_SIZE
    ) - 1;

  const endX =
    Math.floor(
      (
        centerWorld.x +
        mapWidth / 2
      ) /
      TILE_SIZE
    ) + 1;

  const startY =
    Math.floor(
      (
        centerWorld.y -
        mapHeight / 2
      ) /
      TILE_SIZE
    ) - 1;

  const endY =
    Math.floor(
      (
        centerWorld.y +
        mapHeight / 2
      ) /
      TILE_SIZE
    ) + 1;

  const maxTile =
    Math.pow(
      2,
      zoom
    );

  for (
    let tx = startX;
    tx <= endX;
    tx++
  ) {

    for (
      let ty = startY;
      ty <= endY;
      ty++
    ) {

      if (
        ty < 0 ||
        ty >= maxTile
      ) {
        continue;
      }

      let normalizedX =
        tx % maxTile;

      if (
        normalizedX < 0
      ) {
        normalizedX += maxTile;
      }

      const img =
        document.createElement(
          'img'
        );

      img.className =
        'tile';

      img.draggable =
        false;

      img.loading =
        'eager';

      img.src =
        'https://tile.openstreetmap.org/' +
        zoom +
        '/' +
        normalizedX +
        '/' +
        ty +
        '.png';

      img.style.left =
        (
          tx *
          TILE_SIZE -
          centerWorld.x +
          mapWidth / 2
        ) +
        'px';

      img.style.top =
        (
          ty *
          TILE_SIZE -
          centerWorld.y +
          mapHeight / 2
        ) +
        'px';

      tiles.appendChild(
        img
      );
    }
  }

  renderMarkers();
  renderRoute();
}


// ============================================================
// SCREEN POSITION
// ============================================================

function coordinateToScreen(
  lat,
  lng
) {

  const centerWorld =
    latLngToWorld(
      centerLat,
      centerLng,
      zoom
    );

  const pointWorld =
    latLngToWorld(
      lat,
      lng,
      zoom
    );

  return {
    x:
      pointWorld.x -
      centerWorld.x +
      mapWidth / 2,

    y:
      pointWorld.y -
      centerWorld.y +
      mapHeight / 2,
  };
}


// ============================================================
// MARKERS
// ============================================================

function createMarker(
  type,
  lat,
  lng,
  icon
) {

  const position =
    coordinateToScreen(
      lat,
      lng
    );

  const marker =
    document.createElement(
      'div'
    );

  marker.className =
    'marker ' +
    type;

  marker.style.left =
    position.x +
    'px';

  marker.style.top =
    position.y +
    'px';

  marker.innerHTML =
    '<div class="marker-inner">' +
      '<div class="marker-icon">' +
        icon +
      '</div>' +
    '</div>';

  document
    .getElementById(
      'markers'
    )
    .appendChild(
      marker
    );
}


function renderMarkers() {

  const container =
    document.getElementById(
      'markers'
    );

  if (!container) {
    return;
  }

  container.innerHTML = '';

  markers.forEach(
    marker => {

      if (
        !marker ||
        !Number.isFinite(
          marker.lat
        ) ||
        !Number.isFinite(
          marker.lng
        )
      ) {
        return;
      }

      createMarker(
        marker.type,
        marker.lat,
        marker.lng,
        marker.icon
      );
    }
  );
}


// ============================================================
// ROUTE
// ============================================================

function renderRoute() {

  const canvas =
    document.getElementById(
      'routeCanvas'
    );

  if (!canvas) {
    return;
  }

  canvas.width =
    mapWidth;

  canvas.height =
    mapHeight;

  const ctx =
    canvas.getContext(
      '2d'
    );

  if (!ctx) {
    return;
  }

  ctx.clearRect(
    0,
    0,
    mapWidth,
    mapHeight
  );

  if (
    !Array.isArray(route) ||
    route.length < 2
  ) {
    return;
  }

  const screenPoints =
    route
      .map(point => {

        if (
          !point ||
          !Number.isFinite(
            point.latitude
          ) ||
          !Number.isFinite(
            point.longitude
          )
        ) {
          return null;
        }

        return coordinateToScreen(
          point.latitude,
          point.longitude
        );
      })
      .filter(Boolean);

  if (
    screenPoints.length < 2
  ) {
    return;
  }

  // ----------------------------------------------------------
  // Shadow / outer route
  // ----------------------------------------------------------

  ctx.beginPath();

  screenPoints.forEach(
    (position, index) => {

      if (index === 0) {
        ctx.moveTo(
          position.x,
          position.y
        );
      } else {
        ctx.lineTo(
          position.x,
          position.y
        );
      }
    }
  );

  ctx.strokeStyle =
    '#1976D2';

  ctx.lineWidth = 7;

  ctx.lineCap =
    'round';

  ctx.lineJoin =
    'round';

  ctx.stroke();

  // ----------------------------------------------------------
  // Inner route
  // ----------------------------------------------------------

  ctx.beginPath();

  screenPoints.forEach(
    (position, index) => {

      if (index === 0) {
        ctx.moveTo(
          position.x,
          position.y
        );
      } else {
        ctx.lineTo(
          position.x,
          position.y
        );
      }
    }
  );

  ctx.strokeStyle =
    '#ffffff';

  ctx.lineWidth = 2.5;

  ctx.lineCap =
    'round';

  ctx.lineJoin =
    'round';

  ctx.stroke();
}


// ============================================================
// FIT MAP
// ============================================================

function fitCoordinates(
  points
) {

  if (
    !Array.isArray(points) ||
    points.length === 0
  ) {
    return;
  }

  const valid =
    points.filter(
      point =>
        point &&
        Number.isFinite(
          point.latitude
        ) &&
        Number.isFinite(
          point.longitude
        )
    );

  if (!valid.length) {
    return;
  }

  let minLat =
    valid[0].latitude;

  let maxLat =
    valid[0].latitude;

  let minLng =
    valid[0].longitude;

  let maxLng =
    valid[0].longitude;

  valid.forEach(
    point => {

      minLat =
        Math.min(
          minLat,
          point.latitude
        );

      maxLat =
        Math.max(
          maxLat,
          point.latitude
        );

      minLng =
        Math.min(
          minLng,
          point.longitude
        );

      maxLng =
        Math.max(
          maxLng,
          point.longitude
        );
    }
  );

  centerLat =
    (minLat + maxLat) /
    2;

  centerLng =
    (minLng + maxLng) /
    2;

  const latDiff =
    Math.abs(
      maxLat - minLat
    );

  const lngDiff =
    Math.abs(
      maxLng - minLng
    );

  const maxDiff =
    Math.max(
      latDiff,
      lngDiff
    );

  let selectedZoom;

  if (maxDiff > 2) {
    selectedZoom = 7;
  } else if (maxDiff > 1.2) {
    selectedZoom = 8;
  } else if (maxDiff > 0.7) {
    selectedZoom = 9;
  } else if (maxDiff > 0.4) {
    selectedZoom = 10;
  } else if (maxDiff > 0.2) {
    selectedZoom = 11;
  } else if (maxDiff > 0.1) {
    selectedZoom = 12;
  } else if (maxDiff > 0.05) {
    selectedZoom = 13;
  } else if (maxDiff > 0.025) {
    selectedZoom = 14;
  } else {
    selectedZoom = 15;
  }

  zoom =
    clamp(
      selectedZoom,
      3,
      18
    );

  renderMap();
}


// ============================================================
// ZOOM
// ============================================================

function zoomIn() {

  zoom =
    clamp(
      zoom + 1,
      3,
      18
    );

  renderMap();
}


function zoomOut() {

  zoom =
    clamp(
      zoom - 1,
      3,
      18
    );

  renderMap();
}


// ============================================================
// DRAG
// ============================================================

const map =
  document.getElementById(
    'map'
  );

if (map) {

  map.addEventListener(
    'pointerdown',
    event => {

      if (
        event.target &&
        event.target.closest &&
        event.target.closest(
          '#zoomControls'
        )
      ) {
        return;
      }

      dragging = true;

      lastX =
        event.clientX;

      lastY =
        event.clientY;

      try {
        map.setPointerCapture(
          event.pointerId
        );
      } catch (error) {
        // ignore
      }
    }
  );


  map.addEventListener(
    'pointermove',
    event => {

      if (!dragging) {
        return;
      }

      const dx =
        event.clientX -
        lastX;

      const dy =
        event.clientY -
        lastY;

      lastX =
        event.clientX;

      lastY =
        event.clientY;

      const centerWorld =
        latLngToWorld(
          centerLat,
          centerLng,
          zoom
        );

      const next =
        worldToLatLng(
          centerWorld.x - dx,
          centerWorld.y - dy,
          zoom
        );

      centerLat =
        clamp(
          next.latitude,
          -85,
          85
        );

      centerLng =
        next.longitude;

      scheduleRender();
    }
  );


  map.addEventListener(
    'pointerup',
    () => {
      dragging = false;
    }
  );


  map.addEventListener(
    'pointercancel',
    () => {
      dragging = false;
    }
  );


  map.addEventListener(
    'pointerleave',
    () => {
      dragging = false;
    }
  );
}


// ============================================================
// MESSAGE FROM REACT NATIVE
// ============================================================

function receiveData(
  data
) {

  if (!data) {
    return;
  }

  // ----------------------------------------------------------
  // SET MAP DATA
  // ----------------------------------------------------------

  if (
    data.type ===
    'setMapData'
  ) {

    markers =
      Array.isArray(
        data.markers
      )
        ? data.markers
        : [];

    route =
      Array.isArray(
        data.route
      )
        ? data.route
        : [];

    if (
      data.center &&
      Number.isFinite(
        data.center.latitude
      ) &&
      Number.isFinite(
        data.center.longitude
      )
    ) {

      centerLat =
        clamp(
          data.center.latitude,
          -85,
          85
        );

      centerLng =
        data.center.longitude;
    }

    if (
      Number.isFinite(
        data.zoom
      )
    ) {

      zoom =
        clamp(
          data.zoom,
          3,
          18
        );
    }

    renderMap();
  }

  // ----------------------------------------------------------
  // FIT COORDINATES
  // ----------------------------------------------------------

  if (
    data.type ===
    'fitCoordinates'
  ) {

    fitCoordinates(
      data.points || []
    );
  }

  // ----------------------------------------------------------
  // CENTER ON
  // ----------------------------------------------------------

  if (
    data.type ===
    'centerOn'
  ) {

    if (
      Number.isFinite(
        data.latitude
      ) &&
      Number.isFinite(
        data.longitude
      )
    ) {

      centerLat =
        clamp(
          data.latitude,
          -85,
          85
        );

      centerLng =
        data.longitude;

      renderMap();
    }
  }
}


// ============================================================
// WINDOW MESSAGE
// ============================================================

window.addEventListener(
  'message',
  event => {

    try {

      const data =
        JSON.parse(
          event.data
        );

      receiveData(data);

    } catch (error) {

      console.log(
        'OSM message error',
        error
      );
    }
  }
);


// ============================================================
// ANDROID WEBVIEW MESSAGE
// ============================================================

document.addEventListener(
  'message',
  event => {

    try {

      const data =
        JSON.parse(
          event.data
        );

      receiveData(data);

    } catch (error) {

      console.log(
        'OSM message error',
        error
      );
    }
  }
);


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
  'resize',
  () => {

    mapWidth =
      window.innerWidth;

    mapHeight =
      window.innerHeight;

    renderMap();
  }
);


// ============================================================
// INITIAL
// ============================================================

renderMap();

</script>

</body>
</html>
`;


// ============================================================
// COMPONENT
// ============================================================

export default function OrderTrackingScreen({
  route: navigationRoute,
  navigation,
}) {

  // ==========================================================
  // STATE
  // ==========================================================

  const [order, setOrder] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [driverLocation, setDriverLocation] =
    useState(null);

  const [locationUpdatedAt, setLocationUpdatedAt] =
    useState(null);

  const [cancelling, setCancelling] =
    useState(false);

  // ==========================================================
  // REFS
  // ==========================================================

  const webViewRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  const mapLoadedRef =
    useRef(false);

  const firstMapFitRef =
    useRef(false);

  // ==========================================================
  // SOCKET
  // ==========================================================

  const socketContext =
    useSocket?.() || {};

  const socket =
    socketContext?.socket ??
    socketContext ??
    null;

  // ==========================================================
  // ORDER ID
  // ==========================================================

  const orderId =
    navigationRoute?.params?.orderId ??
    navigationRoute?.params?.id ??
    navigationRoute?.params?.order?.id ??
    null;


  // ==========================================================
  // LOAD ORDER
  // ==========================================================

  const loadOrder =
    useCallback(
      async (
        showLoading = true
      ) => {

        if (!orderId) {

          setError(
            'رقم الطلب غير موجود'
          );

          setLoading(false);

          return;
        }

        try {

          if (showLoading) {
            setLoading(true);
          }

          setError(null);

          let response;

          if (
            typeof orderApi?.getOrderById ===
            'function'
          ) {

            response =
              await orderApi.getOrderById(
                orderId
              );

          } else if (
            typeof orderApi?.getOrder ===
            'function'
          ) {

            response =
              await orderApi.getOrder(
                orderId
              );

          } else if (
            typeof orderApi?.getTracking ===
            'function'
          ) {

            response =
              await orderApi.getTracking(
                orderId
              );

          } else {

            throw new Error(
              'لم يتم العثور على دالة جلب الطلب داخل orderApi'
            );
          }

          const data =
            response?.data ??
            response?.order ??
            response;

          const normalizedOrder =
            data?.data ??
            data?.order ??
            data;

          if (!normalizedOrder) {

            throw new Error(
              'بيانات الطلب غير موجودة'
            );
          }

          if (
            !mountedRef.current
          ) {
            return;
          }

          setOrder(
            normalizedOrder
          );

          // ----------------------------------------------------
          // DRIVER LOCATION
          // ----------------------------------------------------

          const parsedDriver =
            parseDriverLocationFromOrder(
              normalizedOrder
            );

          if (parsedDriver) {

            setDriverLocation(
              parsedDriver
            );

          } else {

            // مهم جدًا:
            // لو API رجّع null، نمسح الموقع القديم
            // حتى لا يظهر سائق بموقع قديم.

            setDriverLocation(
              null
            );
          }

          // ----------------------------------------------------
          // DEBUG
          // ----------------------------------------------------

          const restaurantLocation =
            parseCoordinates({
              latitude:
                normalizedOrder.pickupLat ??
                normalizedOrder.pickup_lat ??
                normalizedOrder.restaurant_lat,

              longitude:
                normalizedOrder.pickupLng ??
                normalizedOrder.pickup_lng ??
                normalizedOrder.restaurant_lng,
            });

          const customerLocation =
            parseCoordinates({
              latitude:
                normalizedOrder.dropoffLat ??
                normalizedOrder.dropoff_lat ??
                normalizedOrder.delivery_lat ??
                normalizedOrder.user_lat,

              longitude:
                normalizedOrder.dropoffLng ??
                normalizedOrder.dropoff_lng ??
                normalizedOrder.delivery_lng ??
                normalizedOrder.user_lng,
            });

          console.log(
            '📦 Order Tracking:',
            normalizedOrder.id
          );

          console.log(
            '🍽️ Restaurant location:',
            restaurantLocation
          );

          console.log(
            '🏠 Delivery location:',
            customerLocation
          );

          console.log(
            '🛵 Driver location:',
            parsedDriver
          );

          console.log(
            '👤 AssignedDriverId:',
            normalizedOrder.AssignedDriverId ??
            normalizedOrder.assignedDriverId ??
            normalizedOrder.driver_id ??
            normalizedOrder.driverId ??
            normalizedOrder.driver?.id ??
            null
          );

        } catch (err) {

          console.error(
            '❌ Order tracking load error:',
            err
          );

          if (
            mountedRef.current
          ) {

            setError(
              err?.response?.data?.message ??
              err?.message ??
              'حدث خطأ أثناء تحميل الطلب'
            );
          }

        } finally {

          if (
            mountedRef.current
          ) {

            setLoading(false);
            setRefreshing(false);
          }
        }
      },
      [orderId]
    );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(
    () => {

      mountedRef.current =
        true;

      loadOrder(true);

      return () => {

        mountedRef.current =
          false;
      };

    },
    [loadOrder]
  );


  // ==========================================================
  // ORDER LOCATIONS
  // ==========================================================

  const restaurantLocation =
    parseCoordinates({
      latitude:
        order?.pickupLat ??
        order?.pickup_lat ??
        order?.restaurant_lat,

      longitude:
        order?.pickupLng ??
        order?.pickup_lng ??
        order?.restaurant_lng,
    });

  const customerLocation =
    parseCoordinates({
      latitude:
        order?.dropoffLat ??
        order?.dropoff_lat ??
        order?.delivery_lat ??
        order?.user_lat,

      longitude:
        order?.dropoffLng ??
        order?.dropoff_lng ??
        order?.delivery_lng ??
        order?.user_lng,
    });


  // ==========================================================
  // ASSIGNED DRIVER
  // ==========================================================

  const assignedDriverId =
    order?.AssignedDriverId ??
    order?.assignedDriverId ??
    order?.driver_id ??
    order?.driverId ??
    order?.driver?.id ??
    null;


  // ==========================================================
  // REAL DRIVER ASSIGNMENT
  // ==========================================================

  const hasAssignedDriver =
    assignedDriverId !== null &&
    assignedDriverId !== undefined &&
    assignedDriverId !== '' &&
    Number(assignedDriverId) > 0;


  // ==========================================================
  // DRIVER EXISTS
  // ==========================================================

  const hasDriver =
    Boolean(
      hasAssignedDriver ||
      driverLocation ||
      order?.driver
    );


  // ==========================================================
  // SEND MAP DATA
  // ==========================================================

  const sendMapData =
    useCallback(
      (
        centerOverride = null
      ) => {

        if (
          !mapLoadedRef.current ||
          !webViewRef.current
        ) {
          return;
        }

        const markers = [];

        // ------------------------------------------------------
        // RESTAURANT
        // ------------------------------------------------------

        if (
          restaurantLocation
        ) {

          markers.push({
            type:
              'restaurant',

            lat:
              restaurantLocation.latitude,

            lng:
              restaurantLocation.longitude,

            icon:
              '🍽️',
          });
        }

        // ------------------------------------------------------
        // CUSTOMER
        // ------------------------------------------------------

        if (
          customerLocation
        ) {

          markers.push({
            type:
              'customer',

            lat:
              customerLocation.latitude,

            lng:
              customerLocation.longitude,

            icon:
              '🏠',
          });
        }

        // ------------------------------------------------------
        // DRIVER
        // ------------------------------------------------------

        if (
          driverLocation
        ) {

          markers.push({
            type:
              'driver',

            lat:
              driverLocation.latitude,

            lng:
              driverLocation.longitude,

            icon:
              '🛵',
          });
        }

        // ------------------------------------------------------
        // FIT POINTS
        // ------------------------------------------------------

        const points = [];

        if (
          restaurantLocation
        ) {
          points.push(
            restaurantLocation
          );
        }

        if (
          customerLocation
        ) {
          points.push(
            customerLocation
          );
        }

        if (
          driverLocation
        ) {
          points.push(
            driverLocation
          );
        }

        // ------------------------------------------------------
        // ROUTE
        // ------------------------------------------------------
        //
        // Before driver:
        //
        // restaurant -> customer
        //
        // After driver:
        //
        // driver -> customer
        //
        // ------------------------------------------------------

        let routePoints = [];

        if (
          !driverLocation &&
          restaurantLocation &&
          customerLocation
        ) {

          routePoints = [
            restaurantLocation,
            customerLocation,
          ];
        }

        if (
          driverLocation &&
          customerLocation
        ) {

          routePoints = [
            driverLocation,
            customerLocation,
          ];
        }

        // ------------------------------------------------------
        // CENTER
        // ------------------------------------------------------

        const center =
          centerOverride ??
          driverLocation ??
          customerLocation ??
          restaurantLocation ??
          null;

        const payload = {
          type:
            'setMapData',

          markers,

          route:
            routePoints,

          center,

          zoom:
            points.length > 1
              ? undefined
              : 14,
        };

        try {

          webViewRef.current.postMessage(
            JSON.stringify(
              payload
            )
          );

        } catch (error) {

          console.log(
            '❌ OSM postMessage error:',
            error
          );
        }
      },
      [
        restaurantLocation,
        customerLocation,
        driverLocation,
      ]
    );


  // ==========================================================
  // UPDATE MAP
  // ==========================================================

  useEffect(
    () => {

      if (
        !mapLoadedRef.current
      ) {
        return;
      }

      sendMapData();

    },
    [
      sendMapData,
    ]
  );


  // ==========================================================
  // FIT MAP
  // ==========================================================

  const fitMap =
    useCallback(
      () => {

        if (
          !mapLoadedRef.current ||
          !webViewRef.current
        ) {
          return;
        }

        const points = [];

        if (
          restaurantLocation
        ) {
          points.push(
            restaurantLocation
          );
        }

        if (
          customerLocation
        ) {
          points.push(
            customerLocation
          );
        }

        if (
          driverLocation
        ) {
          points.push(
            driverLocation
          );
        }

        if (
          !points.length
        ) {
          return;
        }

        try {

          webViewRef.current.postMessage(
            JSON.stringify({
              type:
                'fitCoordinates',

              points,
            })
          );

        } catch (error) {

          console.log(
            '❌ OSM fit error:',
            error
          );
        }

      },
      [
        restaurantLocation,
        customerLocation,
        driverLocation,
      ]
    );


  // ==========================================================
  // SOCKET
  // ==========================================================

  useEffect(
    () => {

      if (
        !socket ||
        !orderId
      ) {
        return;
      }

      const orderRoom =
        `order_${orderId}`;

      // --------------------------------------------------------
      // JOIN CUSTOMER ORDER ROOM
      // --------------------------------------------------------
      //
      // IMPORTANT:
      //
      // Customer MUST NOT emit:
      //
      // driver_join_order_room
      //
      // because that event is reserved for drivers.
      //
      // Customer only:
      //
      // join_order_room
      // --------------------------------------------------------

      try {

        if (
          typeof socket.emit ===
          'function'
        ) {

          socket.emit(
            'join_order_room',
            {
              orderId,
            }
          );

          console.log(
            '📡 Customer joined order room:',
            orderRoom
          );
        }

      } catch (err) {

        console.log(
          '❌ Socket join error:',
          err
        );
      }


      // ========================================================
      // DRIVER LIVE LOCATION
      // ========================================================

      const handleDriverLocation =
        (payload) => {

          const eventOrderId =
            getEventOrderId(
              payload
            );

          // لو الحدث خاص بطلب آخر
          if (
            eventOrderId &&
            String(eventOrderId) !==
            String(orderId)
          ) {
            return;
          }

          const parsed =
            parseDriverLocationFromSocket(
              payload
            );

          if (!parsed) {

            console.log(
              '⚠️ Ignored invalid driver location:',
              payload
            );

            return;
          }

          if (
            !mountedRef.current
          ) {
            return;
          }

          console.log(
            '🛵 LIVE DRIVER LOCATION:',
            parsed
          );

          setDriverLocation(
            parsed
          );

          setLocationUpdatedAt(
            new Date()
          );

          // ----------------------------------------------------
          // Update local order too
          // ----------------------------------------------------

          setOrder(
            previous => {

              if (!previous) {
                return previous;
              }

              return {
                ...previous,

                driver_lat:
                  parsed.latitude,

                driver_lng:
                  parsed.longitude,

                driver:
                  previous.driver
                    ? {
                        ...previous.driver,

                        latitude:
                          parsed.latitude,

                        longitude:
                          parsed.longitude,
                      }
                    : previous.driver,
              };
            }
          );
        };


      // ========================================================
      // ORDER UPDATED
      // ========================================================

      const handleOrderUpdated =
        (payload) => {

          const eventOrderId =
            getEventOrderId(
              payload
            );

          if (
            eventOrderId &&
            String(eventOrderId) !==
            String(orderId)
          ) {
            return;
          }

          loadOrder(false);
        };


      // ========================================================
      // DRIVER ASSIGNED
      // ========================================================

      const handleDriverAssigned =
        (payload) => {

          const eventOrderId =
            getEventOrderId(
              payload
            );

          if (
            eventOrderId &&
            String(eventOrderId) !==
            String(orderId)
          ) {
            return;
          }

          console.log(
            '👤 Driver assigned event:',
            payload
          );

          loadOrder(false);
        };


      // ========================================================
      // SOCKET EVENTS
      // ========================================================

      const locationEvents = [
        'driver_live_location',
        'driver_location_update',
        'location_saved',
      ];

      const assignmentEvents = [
        'driver_assigned',
        'driver_accepted_order',
        'order_driver_assigned',
      ];

      const orderEvents = [
        'order_updated',
        'order_status_updated',
        'order_status_changed',
      ];


      // --------------------------------------------------------
      // LOCATION EVENTS
      // --------------------------------------------------------

      locationEvents.forEach(
        eventName => {

          try {

            socket.on?.(
              eventName,
              handleDriverLocation
            );

          } catch (err) {

            console.log(
              `❌ Socket listener error ${eventName}:`,
              err
            );
          }
        }
      );


      // --------------------------------------------------------
      // ASSIGNMENT EVENTS
      // --------------------------------------------------------

      assignmentEvents.forEach(
        eventName => {

          try {

            socket.on?.(
              eventName,
              handleDriverAssigned
            );

          } catch (err) {

            console.log(
              `❌ Socket listener error ${eventName}:`,
              err
            );
          }
        }
      );


      // --------------------------------------------------------
      // ORDER EVENTS
      // --------------------------------------------------------

      orderEvents.forEach(
        eventName => {

          try {

            socket.on?.(
              eventName,
              handleOrderUpdated
            );

          } catch (err) {

            console.log(
              `❌ Socket listener error ${eventName}:`,
              err
            );
          }
        }
      );


      // ========================================================
      // CLEANUP
      // ========================================================

      return () => {

        locationEvents.forEach(
          eventName => {

            try {

              socket.off?.(
                eventName,
                handleDriverLocation
              );

            } catch (err) {
              // ignore
            }
          }
        );


        assignmentEvents.forEach(
          eventName => {

            try {

              socket.off?.(
                eventName,
                handleDriverAssigned
              );

            } catch (err) {
              // ignore
            }
          }
        );


        orderEvents.forEach(
          eventName => {

            try {

              socket.off?.(
                eventName,
                handleOrderUpdated
              );

            } catch (err) {
              // ignore
            }
          }
        );


        // ------------------------------------------------------
        // Leave order room
        // ------------------------------------------------------

        try {

          socket.emit?.(
            'leave_order_room',
            {
              orderId,
              room:
                orderRoom,
            }
          );

          console.log(
            '🧹 Leaving order room:',
            orderRoom
          );

        } catch (err) {
          // ignore
        }
      };

    },
    [
      socket,
      orderId,
      loadOrder,
    ]
  );


  // ==========================================================
  // CANCEL ORDER
  // ==========================================================

  const cancelOrder =
    useCallback(
      async () => {

        if (
          !orderId ||
          cancelling
        ) {
          return;
        }

        Alert.alert(
          'إلغاء الطلب',
          'هل أنت متأكد من إلغاء الطلب؟',
          [
            {
              text:
                'لا',

              style:
                'cancel',
            },

            {
              text:
                'نعم، إلغاء',

              style:
                'destructive',

              onPress:
                async () => {

                  try {

                    setCancelling(
                      true
                    );

                    if (
                      typeof orderApi?.cancelOrder ===
                      'function'
                    ) {

                      await orderApi.cancelOrder(
                        orderId
                      );

                    } else {

                      throw new Error(
                        'دالة إلغاء الطلب غير موجودة'
                      );
                    }

                    Alert.alert(
                      'تم',
                      'تم إلغاء الطلب بنجاح'
                    );

                    await loadOrder(
                      false
                    );

                  } catch (err) {

                    Alert.alert(
                      'خطأ',

                      err?.response?.data?.message ??
                      err?.message ??
                      'تعذر إلغاء الطلب'
                    );

                  } finally {

                    setCancelling(
                      false
                    );
                  }
                },
            },
          ]
        );

      },
      [
        orderId,
        cancelling,
        loadOrder,
      ]
    );


  // ==========================================================
  // CALL DRIVER
  // ==========================================================

  const callDriver =
    useCallback(
      async () => {

        const phone =
          order?.driver?.phone ??
          order?.driver_phone ??
          order?.driverPhone ??
          null;

        if (!phone) {

          Alert.alert(
            'غير متاح',
            'رقم هاتف السائق غير متاح حاليًا'
          );

          return;
        }

        try {

          await Linking.openURL(
            `tel:${phone}`
          );

        } catch (err) {

          Alert.alert(
            'خطأ',
            'تعذر فتح تطبيق الاتصال'
          );
        }

      },
      [order]
    );


  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh =
    useCallback(
      async () => {

        setRefreshing(
          true
        );

        await loadOrder(
          false
        );

      },
      [loadOrder]
    );


  // ==========================================================
  // CURRENT STATUS
  // ==========================================================

  const currentStatus =
    normalizeStatus(
      order?.status
    );

  const foundStepIndex =
    STATUS_STEPS.findIndex(
      step =>
        step.key ===
        currentStatus
    );

  const currentStepIndex =
    Math.max(
      0,
      foundStepIndex
    );

  const canCancel =
    CANCELLABLE_STATUSES.includes(
      currentStatus
    );


  // ==========================================================
  // MAP LOAD
  // ==========================================================

  const handleMapLoadEnd =
    useCallback(
      () => {

        mapLoadedRef.current =
          true;

        firstMapFitRef.current =
          false;

        setTimeout(
          () => {

            if (
              !mountedRef.current
            ) {
              return;
            }

            sendMapData();

            setTimeout(
              () => {

                if (
                  !mountedRef.current
                ) {
                  return;
                }

                if (
                  !firstMapFitRef.current
                ) {

                  firstMapFitRef.current =
                    true;

                  fitMap();
                }

              },
              300
            );

          },
          100
        );

      },
      [
        sendMapData,
        fitMap,
      ]
    );


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <View
        style={
          styles.loadingContainer
        }
      >

        <ActivityIndicator
          size="large"
          color={
            COLORS?.primary ??
            '#D4A017'
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          جاري تحميل تتبع الطلب...
        </Text>

      </View>
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    !order
  ) {

    return (
      <View
        style={
          styles.errorContainer
        }
      >

        <Ionicons
          name="alert-circle-outline"
          size={64}
          color="#D32F2F"
        />

        <Text
          style={
            styles.errorTitle
          }
        >
          تعذر تحميل الطلب
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          {error}
        </Text>

        <TouchableOpacity
          style={
            styles.retryButton
          }
          onPress={() =>
            loadOrder(true)
          }
        >

          <Text
            style={
              styles.retryButtonText
            }
          >
            إعادة المحاولة
          </Text>

        </TouchableOpacity>

      </View>
    );
  }


  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <View
      style={
        styles.container
      }
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <View
        style={
          styles.header
        }
      >

        <TouchableOpacity
          style={
            styles.headerButton
          }
          onPress={() =>
            navigation?.goBack?.()
          }
        >

          <Ionicons
            name="arrow-forward"
            size={23}
            color="#222"
          />

        </TouchableOpacity>


        <View
          style={
            styles.headerCenter
          }
        >

          <Text
            style={
              styles.headerTitle
            }
          >
            تتبع الطلب
          </Text>

          <Text
            style={
              styles.headerOrderNumber
            }
          >
            طلب #{order?.id ?? orderId}
          </Text>

        </View>


        <TouchableOpacity
          style={
            styles.headerButton
          }
          onPress={
            handleRefresh
          }
        >

          {refreshing ? (

            <ActivityIndicator
              size="small"
              color={
                COLORS?.primary ??
                '#D4A017'
              }
            />

          ) : (

            <Ionicons
              name="refresh-outline"
              size={23}
              color="#222"
            />

          )}

        </TouchableOpacity>

      </View>


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

          originWhitelist={[
            '*',
          ]}

          source={{
            html:
              createOpenStreetMapHTML(),
          }}

          javaScriptEnabled

          domStorageEnabled

          startInLoadingState={
            false
          }

          scrollEnabled={
            false
          }

          bounces={
            false
          }

          showsHorizontalScrollIndicator={
            false
          }

          showsVerticalScrollIndicator={
            false
          }

          onLoadEnd={
            handleMapLoadEnd
          }

          onError={
            event => {

              console.log(
                '❌ OSM WebView error:',
                event.nativeEvent
              );
            }
          }

          onHttpError={
            event => {

              console.log(
                '❌ OSM HTTP error:',
                event.nativeEvent
              );
            }
          }

          onMessage={
            event => {

              try {

                const data =
                  JSON.parse(
                    event.nativeEvent
                      .data
                  );

                console.log(
                  'OSM WebView:',
                  data
                );

              } catch (err) {
                // ignore
              }
            }
          }

          style={
            styles.map
          }
        />


        {/* ====================================================
            MAP INFO
        ==================================================== */}

        <View
          style={
            styles.mapInfo
          }
        >

          <View
            style={
              styles.mapInfoRow
            }
          >

            <View
              style={[
                styles.dot,
                styles.restaurantDot,
              ]}
            />

            <Text
              style={
                styles.mapInfoText
              }
            >
              المطعم
            </Text>

          </View>


          <View
            style={
              styles.mapInfoRow
            }
          >

            <View
              style={[
                styles.dot,
                styles.customerDot,
              ]}
            />

            <Text
              style={
                styles.mapInfoText
              }
            >
              عنوانك
            </Text>

          </View>


          {hasDriver && (

            <View
              style={
                styles.mapInfoRow
              }
            >

              <View
                style={[
                  styles.dot,
                  styles.driverDot,
                ]}
              />

              <Text
                style={
                  styles.mapInfoText
                }
              >
                السائق
              </Text>

            </View>

          )}

        </View>


        {/* ====================================================
            RECENTER
        ==================================================== */}

        <TouchableOpacity
          style={
            styles.recenterButton
          }
          onPress={() => {

            if (
              driverLocation
            ) {

              webViewRef.current?.postMessage(
                JSON.stringify({
                  type:
                    'centerOn',

                  latitude:
                    driverLocation.latitude,

                  longitude:
                    driverLocation.longitude,
                })
              );

            } else {

              fitMap();
            }
          }}
        >

          <Ionicons
            name="locate-outline"
            size={25}
            color="#222"
          />

        </TouchableOpacity>

      </View>


      {/* ======================================================
          STATUS CARD
      ====================================================== */}

      <View
        style={
          styles.statusCard
        }
      >

        <View
          style={
            styles.statusHeader
          }
        >

          <View
            style={
              styles.statusHeaderText
            }
          >

            <Text
              style={
                styles.statusTitle
              }
            >
              {
                STATUS_STEPS[
                  currentStepIndex
                ]?.label ??
                'جاري متابعة الطلب'
              }
            </Text>

            <Text
              style={
                styles.statusSubtitle
              }
            >
              {hasDriver
                ? 'السائق متابع معاك لحظة بلحظة'
                : 'جاري تجهيز طلبك والبحث عن سائق'}
            </Text>

          </View>


          <View
            style={
              styles.statusIconCircle
            }
          >

            <Ionicons
              name={
                STATUS_STEPS[
                  currentStepIndex
                ]?.icon ??
                'time-outline'
              }
              size={25}
              color={
                COLORS?.primary ??
                '#D4A017'
              }
            />

          </View>

        </View>


        {/* ====================================================
            STATUS STEPS
        ==================================================== */}

        <View
          style={
            styles.stepsContainer
          }
        >

          {STATUS_STEPS.map(
            (
              step,
              index
            ) => {

              const completed =
                index <=
                currentStepIndex;

              const active =
                index ===
                currentStepIndex;

              return (
                <View
                  key={
                    step.key
                  }
                  style={
                    styles.step
                  }
                >

                  <View
                    style={[
                      styles.stepCircle,

                      completed &&
                        styles.stepCircleCompleted,

                      active &&
                        styles.stepCircleActive,
                    ]}
                  >

                    <Ionicons
                      name={
                        completed
                          ? 'checkmark'
                          : step.icon
                      }
                      size={14}
                      color={
                        completed
                          ? '#fff'
                          : '#999'
                      }
                    />

                  </View>


                  {index <
                    STATUS_STEPS.length -
                    1 && (

                    <View
                      style={[
                        styles.stepLine,

                        index <
                          currentStepIndex &&
                          styles.stepLineCompleted,
                      ]}
                    />

                  )}

                </View>
              );
            }
          )}

        </View>

      </View>


      {/* ======================================================
          DRIVER CARD
      ====================================================== */}

      {hasDriver ? (

        <View
          style={
            styles.driverCard
          }
        >

          <View
            style={
              styles.driverAvatar
            }
          >

            <Ionicons
              name="bicycle-outline"
              size={28}
              color="#fff"
            />

          </View>


          <View
            style={
              styles.driverInfo
            }
          >

            <Text
              style={
                styles.driverTitle
              }
            >
              السائق في خدمتك
            </Text>

            <Text
              style={
                styles.driverName
              }
            >
              {
                order?.driver?.name ??
                order?.driver?.full_name ??
                order?.driver_name ??
                'السائق'
              }
            </Text>


            {driverLocation && (

              <Text
                style={
                  styles.liveText
                }
              >

                <Text
                  style={
                    styles.liveDot
                  }
                >
                  ●
                </Text>

                {' '}
                الموقع مباشر

                {locationUpdatedAt
                  ? ` • ${locationUpdatedAt.toLocaleTimeString(
                      'ar-EG',
                      {
                        hour:
                          '2-digit',

                        minute:
                          '2-digit',
                      }
                    )}`
                  : ''}

              </Text>

            )}

          </View>


          <TouchableOpacity
            style={
              styles.callButton
            }
            onPress={
              callDriver
            }
          >

            <Ionicons
              name="call-outline"
              size={21}
              color="#fff"
            />

          </TouchableOpacity>

        </View>

      ) : (

        <View
          style={
            styles.waitingCard
          }
        >

          <View
            style={
              styles.waitingIcon
            }
          >

            <Ionicons
              name="search-outline"
              size={27}
              color={
                COLORS?.primary ??
                '#D4A017'
              }
            />

          </View>


          <View
            style={
              styles.waitingInfo
            }
          >

            <Text
              style={
                styles.waitingTitle
              }
            >
              جاري البحث عن سائق
            </Text>

            <Text
              style={
                styles.waitingText
              }
            >
              هنختار لك أقرب سائق متاح لتوصيل طلبك.
            </Text>

          </View>

        </View>
      )}


      {/* ======================================================
          LIVE LOCATION
      ====================================================== */}

      {driverLocation && (

        <View
          style={
            styles.locationCard
          }
        >

          <Ionicons
            name="navigate-circle-outline"
            size={25}
            color="#1976D2"
          />

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
              السائق يتحرك الآن
            </Text>

            <Text
              style={
                styles.locationText
              }
            >
              موقع السائق يتم تحديثه مباشرة على الخريطة
            </Text>

          </View>


          <View
            style={
              styles.liveBadge
            }
          >

            <Text
              style={
                styles.liveBadgeText
              }
            >
              LIVE
            </Text>

          </View>

        </View>
      )}


      {/* ======================================================
          NO DRIVER ROUTE
      ====================================================== */}

      {!hasDriver &&
        restaurantLocation &&
        customerLocation && (

        <View
          style={
            styles.routeInfoCard
          }
        >

          <Ionicons
            name="map-outline"
            size={24}
            color={
              COLORS?.primary ??
              '#D4A017'
            }
          />

          <View
            style={
              styles.routeInfoTextContainer
            }
          >

            <Text
              style={
                styles.routeInfoTitle
              }
            >
              مسار الطلب
            </Text>

            <Text
              style={
                styles.routeInfoText
              }
            >
              يظهر المطعم وعنوانك على الخريطة حتى يتم تعيين السائق.
            </Text>

          </View>

        </View>
      )}


      {/* ======================================================
          ORDER TOTAL
      ====================================================== */}

      <View
        style={
          styles.totalCard
        }
      >

        <View>

          <Text
            style={
              styles.totalLabel
            }
          >
            إجمالي الطلب
          </Text>

          <Text
            style={
              styles.totalValue
            }
          >
            {Number(
              order?.total_price ??
              order?.totalPrice ??
              0
            ).toFixed(2)}
            {' '}
            جنيه
          </Text>

        </View>


        <View
          style={
            styles.paymentStatus
          }
        >

          <Ionicons
            name={
              order?.payment_status ===
              'paid'
                ? 'checkmark-circle'
                : 'time-outline'
            }
            size={18}
            color={
              order?.payment_status ===
              'paid'
                ? '#2E7D32'
                : '#D4A017'
            }
          />

          <Text
            style={[
              styles.paymentText,

              order?.payment_status ===
                'paid' &&
                styles.paymentPaid,
            ]}
          >
            {order?.payment_status ===
            'paid'
              ? 'تم الدفع'
              : 'الدفع عند الاستلام / قيد الانتظار'}
          </Text>

        </View>

      </View>


      {/* ======================================================
          CANCEL
      ====================================================== */}

      {canCancel && (

        <TouchableOpacity
          style={[
            styles.cancelButton,

            cancelling &&
              styles.cancelButtonDisabled,
          ]}
          onPress={
            cancelOrder
          }
          disabled={
            cancelling
          }
        >

          {cancelling ? (

            <ActivityIndicator
              size="small"
              color="#D32F2F"
            />

          ) : (

            <Ionicons
              name="close-circle-outline"
              size={21}
              color="#D32F2F"
            />

          )}

          <Text
            style={
              styles.cancelButtonText
            }
          >
            {cancelling
              ? 'جاري الإلغاء...'
              : 'إلغاء الطلب'}
          </Text>

        </TouchableOpacity>
      )}

    </View>
  );
}


// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({

    // ========================================================
    // CONTAINER
    // ========================================================

    container: {
      flex: 1,
      backgroundColor:
        '#F7F7F7',
    },


    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#F7F7F7',
    },

    loadingText: {
      marginTop:
        SPACING?.md ??
        12,

      fontSize:
        FONT_SIZES?.md ??
        15,

      color:
        '#555',

      textAlign:
        'center',
    },


    // ========================================================
    // ERROR
    // ========================================================

    errorContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        SPACING?.xl ??
        24,

      backgroundColor:
        '#F7F7F7',
    },

    errorTitle: {
      marginTop:
        14,

      fontSize:
        FONT_SIZES?.lg ??
        18,

      fontWeight:
        '800',

      color:
        '#222',
    },

    errorText: {
      marginTop:
        8,

      fontSize:
        FONT_SIZES?.md ??
        15,

      color:
        '#666',

      textAlign:
        'center',

      lineHeight:
        23,
    },

    retryButton: {
      marginTop:
        20,

      paddingHorizontal:
        25,

      paddingVertical:
        12,

      borderRadius:
        RADIUS?.md ??
        12,

      backgroundColor:
        COLORS?.primary ??
        '#D4A017',
    },

    retryButtonText: {
      color:
        '#fff',

      fontSize:
        FONT_SIZES?.md ??
        15,

      fontWeight:
        '800',
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height:
        70,

      backgroundColor:
        '#fff',

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        12,

      borderBottomWidth:
        1,

      borderBottomColor:
        '#EEEEEE',
    },

    headerButton: {
      width:
        44,

      height:
        44,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F5F5F5',
    },

    headerCenter: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerTitle: {
      fontSize:
        FONT_SIZES?.lg ??
        18,

      fontWeight:
        '900',

      color:
        '#222',
    },

    headerOrderNumber: {
      marginTop:
        2,

      fontSize:
        FONT_SIZES?.sm ??
        12,

      color:
        '#888',
    },


    // ========================================================
    // MAP
    // ========================================================

    mapContainer: {
      height:
        Platform.OS === 'web'
          ? 390
          : 350,

      backgroundColor:
        '#E8E8E8',

      position:
        'relative',
    },

    map: {
      flex: 1,

      backgroundColor:
        '#E8E8E8',
    },

    mapInfo: {
      position:
        'absolute',

      top:
        12,

      left:
        12,

      backgroundColor:
        'rgba(255,255,255,0.95)',

      borderRadius:
        12,

      paddingHorizontal:
        11,

      paddingVertical:
        9,

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.12,

      shadowRadius:
        5,

      elevation:
        4,
    },

    mapInfoRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginVertical:
        3,
    },

    dot: {
      width:
        9,

      height:
        9,

      borderRadius:
        5,

      marginRight:
        7,
    },

    restaurantDot: {
      backgroundColor:
        '#D4A017',
    },

    customerDot: {
      backgroundColor:
        '#2E7D32',
    },

    driverDot: {
      backgroundColor:
        '#1976D2',
    },

    mapInfoText: {
      fontSize:
        FONT_SIZES?.xs ??
        11,

      color:
        '#333',

      fontWeight:
        '700',
    },

    recenterButton: {
      position:
        'absolute',

      right:
        14,

      bottom:
        14,

      width:
        48,

      height:
        48,

      borderRadius:
        15,

      backgroundColor:
        '#fff',

      alignItems:
        'center',

      justifyContent:
        'center',

      shadowColor:
        '#000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity:
        0.16,

      shadowRadius:
        6,

      elevation:
        5,
    },


    // ========================================================
    // STATUS
    // ========================================================

    statusCard: {
      backgroundColor:
        '#fff',

      marginHorizontal:
        12,

      marginTop:
        12,

      borderRadius:
        RADIUS?.lg ??
        16,

      padding:
        15,

      elevation:
        2,

      shadowColor:
        '#000',

      shadowOpacity:
        0.06,

      shadowRadius:
        5,

      shadowOffset: {
        width: 0,
        height: 2,
      },
    },

    statusHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    statusHeaderText: {
      flex: 1,
    },

    statusTitle: {
      fontSize:
        FONT_SIZES?.lg ??
        18,

      fontWeight:
        '900',

      color:
        '#222',
    },

    statusSubtitle: {
      marginTop:
        4,

      fontSize:
        FONT_SIZES?.sm ??
        13,

      color:
        '#777',
    },

    statusIconCircle: {
      marginLeft:
        10,

      width:
        48,

      height:
        48,

      borderRadius:
        24,

      backgroundColor:
        '#FFF8E5',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    stepsContainer: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        18,
    },

    step: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    stepCircle: {
      width:
        25,

      height:
        25,

      borderRadius:
        13,

      backgroundColor:
        '#EEEEEE',

      alignItems:
        'center',

      justifyContent:
        'center',

      zIndex:
        2,
    },

    stepCircleCompleted: {
      backgroundColor:
        COLORS?.primary ??
        '#D4A017',
    },

    stepCircleActive: {
      transform: [
        {
          scale:
            1.12,
        },
      ],
    },

    stepLine: {
      flex: 1,

      height:
        3,

      backgroundColor:
        '#EEEEEE',

      marginHorizontal:
        -2,
    },

    stepLineCompleted: {
      backgroundColor:
        COLORS?.primary ??
        '#D4A017',
    },


    // ========================================================
    // DRIVER
    // ========================================================

    driverCard: {
      marginHorizontal:
        12,

      marginTop:
        10,

      backgroundColor:
        '#fff',

      borderRadius:
        RADIUS?.lg ??
        16,

      padding:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      elevation:
        2,

      shadowColor:
        '#000',

      shadowOpacity:
        0.06,

      shadowRadius:
        5,

      shadowOffset: {
        width: 0,
        height: 2,
      },
    },

    driverAvatar: {
      width:
        52,

      height:
        52,

      borderRadius:
        26,

      backgroundColor:
        '#1976D2',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    driverInfo: {
      flex: 1,

      marginLeft:
        12,
    },

    driverTitle: {
      fontSize:
        FONT_SIZES?.xs ??
        11,

      color:
        '#777',
    },

    driverName: {
      marginTop:
        2,

      fontSize:
        FONT_SIZES?.md ??
        15,

      color:
        '#222',

      fontWeight:
        '900',
    },

    liveText: {
      marginTop:
        3,

      fontSize:
        FONT_SIZES?.xs ??
        11,

      color:
        '#2E7D32',

      fontWeight:
        '700',
    },

    liveDot: {
      color:
        '#2E7D32',
    },

    callButton: {
      width:
        44,

      height:
        44,

      borderRadius:
        14,

      backgroundColor:
        '#2E7D32',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    // ========================================================
    // WAITING
    // ========================================================

    waitingCard: {
      marginHorizontal:
        12,

      marginTop:
        10,

      backgroundColor:
        '#FFFDF5',

      borderWidth:
        1,

      borderColor:
        '#F2E5B7',

      borderRadius:
        RADIUS?.lg ??
        16,

      padding:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    waitingIcon: {
      width:
        50,

      height:
        50,

      borderRadius:
        25,

      backgroundColor:
        '#FFF4CF',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    waitingInfo: {
      flex: 1,

      marginLeft:
        12,
    },

    waitingTitle: {
      fontSize:
        FONT_SIZES?.md ??
        15,

      fontWeight:
        '900',

      color:
        '#333',
    },

    waitingText: {
      marginTop:
        4,

      fontSize:
        FONT_SIZES?.sm ??
        12,

      color:
        '#777',

      lineHeight:
        19,
    },


    // ========================================================
    // LIVE LOCATION
    // ========================================================

    locationCard: {
      marginHorizontal:
        12,

      marginTop:
        10,

      backgroundColor:
        '#F3F8FF',

      borderWidth:
        1,

      borderColor:
        '#D8E8FF',

      borderRadius:
        RADIUS?.lg ??
        16,

      padding:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    locationInfo: {
      flex: 1,

      marginLeft:
        10,
    },

    locationTitle: {
      fontSize:
        FONT_SIZES?.sm ??
        13,

      color:
        '#1A4E88',

      fontWeight:
        '900',
    },

    locationText: {
      marginTop:
        3,

      fontSize:
        FONT_SIZES?.xs ??
        11,

      color:
        '#6683A2',
    },

    liveBadge: {
      backgroundColor:
        '#1976D2',

      paddingHorizontal:
        8,

      paddingVertical:
        5,

      borderRadius:
        7,
    },

    liveBadgeText: {
      color:
        '#fff',

      fontSize:
        9,

      fontWeight:
        '900',
    },


    // ========================================================
    // ROUTE INFO
    // ========================================================

    routeInfoCard: {
      marginHorizontal:
        12,

      marginTop:
        10,

      backgroundColor:
        '#fff',

      borderRadius:
        RADIUS?.lg ??
        16,

      padding:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      elevation:
        1,
    },

    routeInfoTextContainer: {
      flex: 1,

      marginLeft:
        10,
    },

    routeInfoTitle: {
      fontSize:
        FONT_SIZES?.sm ??
        13,

      fontWeight:
        '900',

      color:
        '#333',
    },

    routeInfoText: {
      marginTop:
        3,

      fontSize:
        FONT_SIZES?.xs ??
        11,

      color:
        '#777',

      lineHeight:
        18,
    },


    // ========================================================
    // TOTAL
    // ========================================================

    totalCard: {
      marginHorizontal:
        12,

      marginTop:
        10,

      marginBottom:
        10,

      padding:
        15,

      backgroundColor:
        '#fff',

      borderRadius:
        RADIUS?.lg ??
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      elevation:
        2,

      shadowColor:
        '#000',

      shadowOpacity:
        0.06,

      shadowRadius:
        5,

      shadowOffset: {
        width: 0,
        height: 2,
      },
    },

    totalLabel: {
      fontSize:
        FONT_SIZES?.sm ??
        12,

      color:
        '#777',
    },

    totalValue: {
      marginTop:
        3,

      fontSize:
        FONT_SIZES?.xl ??
        21,

      fontWeight:
        '900',

      color:
        '#222',
    },

    paymentStatus: {
      flexDirection:
        'row',

      alignItems:
        'center',

      maxWidth:
        '48%',
    },

    paymentText: {
      marginLeft:
        5,

      fontSize:
        FONT_SIZES?.xs ??
        11,

      color:
        '#A16F00',

      fontWeight:
        '700',
    },

    paymentPaid: {
      color:
        '#2E7D32',
    },


    // ========================================================
    // CANCEL
    // ========================================================

    cancelButton: {
      marginHorizontal:
        12,

      marginBottom:
        20,

      minHeight:
        48,

      borderRadius:
        RADIUS?.md ??
        12,

      borderWidth:
        1,

      borderColor:
        '#E5B5B5',

      backgroundColor:
        '#FFF7F7',

      alignItems:
        'center',

      justifyContent:
        'center',

      flexDirection:
        'row',
    },

    cancelButtonDisabled: {
      opacity:
        0.6,
    },

    cancelButtonText: {
      marginLeft:
        7,

      color:
        '#D32F2F',

      fontSize:
        FONT_SIZES?.md ??
        14,

      fontWeight:
        '800',
    },

  });
