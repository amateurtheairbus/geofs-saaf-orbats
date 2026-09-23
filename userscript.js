// ==UserScript==
// @name         SAAF red orbats
// @namespace    https://geo-fs.com/
// @version      5.0
// @description  Makes runway icons for SAAF ORBATS bases red
// @author       Squirtle7479(original USAF), Amateur380(SAAF edition)
// @match        https://www.geo-fs.com/geofs.php*
// @match        https://geo-fs.com/geofs.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════
  //  SOUTH AFRICAN MILITARY AIRFIELDS
  // ══════════════════════════════════════════════════════════════════
  const RED_AIRPORTS = new Set([
    // SOUTH AFRICA
    "FABL","FADN","FAHS","FAKM","FALW","FALM","FAOB","FAPE","FASK","FAWK","FAYP",
    // NAMIBIA
    "FYGF","FYWE",
    // LESOTHO
    "FXMU",
    // SENEGAL
    "GOOY","GOOK",
    // GUINEA-BISSAU
    "GGOV",
    // LIBERIA
    "GLMR",
    // BURKINA FASO
    "DFOO","DFEF",
    //IVORY COAST
    "DIAP","DIBK","DIKO",
    //NIGERIA
    "DNAA","DNBE","DNCA","DNEN","DNIL","DN53","DNKN","DNMM","DNMA","DNMK","DNMN","NG-0004","DNYO",
    //THE GAMBIA 
    "GBYD",
    //GUINEA
    "GUCY",
    //GHANA
    "DGAA","DGTK","DGLE",
    //TOGO
    "DXXX","DXNG",
    //DJIBOUTI
    "HDAM",
    //ZAMBIA
    "FLLI",
    //ZIMBABWE
    "FVTL","FVHA",
    //BOTSWANA
    "FBFT","FBTP","FBSK"
  ]);

  const RED_FILL   = "#e03030";
  const RED_STROKE = "#8b0000";

  // ══════════════════════════════════════════════════════════════════
  //  RECOLOR EXISTING MARKERS
  //  Walks geofs.api.map.markerLayers.major and .minor, which hold
  //  all currently rendered runway markers. Each entry has
  //  layer.options.runway.icao — confirmed from diagnostics.
  // ══════════════════════════════════════════════════════════════════

  function recolorExisting() {
    const markerLayers = geofs.api.map.markerLayers;
    for (const tier of ['major', 'minor']) {
      const group = markerLayers[tier];
      if (!group) continue;
      // The group is a Leaflet layer group — iterate its layers
      const layers = group._layers || group.getLayers && group.getLayers() || {};
      const arr = Array.isArray(layers) ? layers : Object.values(layers);
      for (const layer of arr) {
        try {
          const icao = layer.options && layer.options.runway && layer.options.runway.icao;
          if (icao && RED_AIRPORTS.has(icao)) {
            layer.setStyle({ fillColor: RED_FILL, color: RED_STROKE });
          }
        } catch (e) { /* ignore */ }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  PATCH addRunwayMarker
  //  Intercepts every future marker at creation time and swaps the
  //  fillColor before it reaches geofs.api.map.addLayeredMarker.
  //  The runway object `e` has e.icao confirmed from diagnostics.
  // ══════════════════════════════════════════════════════════════════

  function patchAddRunwayMarker() {
    const orig = geofs.map.addRunwayMarker;
    geofs.map.addRunwayMarker = function (e) {
      if (e && e.icao && RED_AIRPORTS.has(e.icao)) {
        // Clone to avoid mutating the original runway data
        e = Object.assign({}, e, { _redOverride: true });
        // Wrap addLayeredMarker temporarily to swap the color
        const origALM = geofs.api.map.addLayeredMarker;
        geofs.api.map.addLayeredMarker = function (type, options) {
          if (options && options.runway && options.runway._redOverride) {
            options = Object.assign({}, options, {
              fillColor: RED_FILL,
              color:     RED_STROKE,
            });
          }
          geofs.api.map.addLayeredMarker = origALM; // restore immediately
          return origALM.call(this, type, options);
        };
      }
      return orig.call(this, e);
    };
    console.log('[RedRunway] addRunwayMarker patched.');
  }

  // ══════════════════════════════════════════════════════════════════
  //  BOOT — wait for geofs.map and geofs.api.map to be ready
  // ══════════════════════════════════════════════════════════════════

  function tryBoot() {
    if (!window.geofs || !geofs.map || !geofs.api || !geofs.api.map) return false;
    if (!geofs.map.addRunwayMarker || !geofs.api.map.markerLayers) return false;
    return true;
  }

  const bootInterval = setInterval(() => {
    if (!tryBoot()) return;
    clearInterval(bootInterval);

    patchAddRunwayMarker();

    // Recolor anything already on the map, then keep sweeping since
    // GeoFS loads markers lazily as you pan.
    recolorExisting();
    setInterval(recolorExisting, 2000);

    console.log('[RedRunway] v4.0 active. ' + RED_AIRPORTS.size + ' military/gov airfields flagged.');
    console.log('[RedRunway] API: window.__redRunwayAddon.add("ICAO") / .remove() / .list()');
  }, 500);

  // ══════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════════════════════════

  window.__redRunwayAddon = {
    add(icao) {
      [].concat(icao).forEach(c => RED_AIRPORTS.add(c.toUpperCase()));
      recolorExisting();
      console.log('[RedRunway] Added:', [].concat(icao).join(', '));
    },
    remove(icao) {
      [].concat(icao).forEach(c => RED_AIRPORTS.delete(c.toUpperCase()));
      console.log('[RedRunway] Removed (pan map to restore blue):', [].concat(icao).join(', '));
    },
    list() {
      console.log('[RedRunway]', RED_AIRPORTS.size, 'airports:', [...RED_AIRPORTS].sort().join(', '));
    },
  };

  console.log('[RedRunway] v4.0 loaded, waiting for GeoFS...');
})();
