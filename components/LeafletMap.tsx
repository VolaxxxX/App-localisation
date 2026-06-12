import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  emoji: string;
  color: string;
  /** Rendered semi-transparent (e.g. offline contact / sharing paused). */
  dimmed?: boolean;
  /** Draws a subtle "you" ring; also kept on top. */
  isMe?: boolean;
}

export interface LeafletMapHandle {
  centerOn: (lat: number, lng: number, zoom?: number) => void;
  fitAll: () => void;
}

interface LeafletMapProps {
  markers: MapMarker[];
  initialCenter: { lat: number; lng: number; zoom: number };
  dark?: boolean;
  onMarkerPress?: (id: string) => void;
  /** Optional breadcrumb trail to draw as a polyline. */
  path?: { lat: number; lng: number }[];
  pathColor?: string;
  /** Optional GPS accuracy circle (metres) drawn around a point. */
  accuracy?: { lat: number; lng: number; radius: number; color: string } | null;
}

/**
 * Zero-API-key map: Leaflet + OpenStreetMap tiles rendered inside a WebView.
 * Works in Expo Go (no native map module) and on iOS + Android alike.
 *
 * Communication:
 *   RN → page  : injectJavaScript() calls window.__setMarkers / __centerOn / __fitAll
 *   page → RN  : window.ReactNativeWebView.postMessage(JSON) → onMessage
 */
export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(
  function LeafletMap(
    { markers, initialCenter, dark, onMarkerPress, path, pathColor, accuracy },
    ref,
  ) {
    const webRef = useRef<WebView>(null);
    const [ready, setReady] = useState(false);

    const inject = useCallback((js: string) => {
      webRef.current?.injectJavaScript(`${js}; true;`);
    }, []);

    // Stable keys so the injection effects only fire on meaningful changes.
    const markersKey = useMemo(
      () =>
        markers
          .map((m) => `${m.id}:${m.lat.toFixed(5)}:${m.lng.toFixed(5)}:${m.emoji}:${m.color}:${m.dimmed ? 1 : 0}:${m.isMe ? 1 : 0}`)
          .join('|'),
      [markers],
    );
    const resolvedPathColor = pathColor ?? '#2563EB';
    const pathKey = useMemo(
      () => `${resolvedPathColor}#${(path ?? []).length}:${path?.[path.length - 1]?.lat ?? ''}`,
      [path, resolvedPathColor],
    );

    // Inject markers once the page is ready and whenever they change.
    // Non-finite coordinates are dropped — JSON.stringify(NaN) === "null",
    // which would make Leaflet throw on L.marker([null, …]).
    useEffect(() => {
      if (!ready) return;
      const safe = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
      inject(`window.__setMarkers(${JSON.stringify(safe)})`);
      // markersKey captures the meaningful contents of `markers`.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, markersKey, inject]);

    // Inject the path once the page is ready and whenever it changes.
    useEffect(() => {
      if (!ready) return;
      const safe = (path ?? []).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      inject(`window.__setPath(${JSON.stringify(safe)}, ${JSON.stringify(resolvedPathColor)})`);
      // pathKey captures the meaningful contents of `path` + colour.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, pathKey, inject]);

    // Inject the GPS accuracy circle once ready and whenever it changes.
    const accuracyKey = accuracy
      ? `${accuracy.lat.toFixed(5)}:${accuracy.lng.toFixed(5)}:${Math.round(accuracy.radius)}:${accuracy.color}`
      : '';
    useEffect(() => {
      if (!ready) return;
      const a =
        accuracy &&
        Number.isFinite(accuracy.lat) &&
        Number.isFinite(accuracy.lng) &&
        Number.isFinite(accuracy.radius)
          ? accuracy
          : null;
      inject(`window.__setAccuracy(${JSON.stringify(a)})`);
      // accuracyKey captures the meaningful contents of `accuracy`.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, accuracyKey, inject]);

    useImperativeHandle(
      ref,
      () => ({
        centerOn: (lat, lng, zoom) =>
          inject(`window.__centerOn(${lat}, ${lng}, ${zoom ?? 16})`),
        fitAll: () => inject('window.__fitAll()'),
      }),
      [inject],
    );

    const onMessage = useCallback(
      (e: WebViewMessageEvent) => {
        let msg: any;
        try {
          msg = JSON.parse(e.nativeEvent.data);
        } catch {
          return;
        }
        if (msg?.type === 'ready') {
          setReady(true);
        } else if (msg?.type === 'marker' && msg.id) {
          onMarkerPress?.(msg.id);
        }
      },
      [onMarkerPress],
    );

    const html = useMemo(
      () => buildHtml(initialCenter, !!dark),
      // initialCenter only matters for first render; intentionally stable.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [dark],
    );

    // If the document is reloaded (e.g. theme change rebuilds the HTML), the
    // page is blank again until it re-signals "ready" — reset so the injection
    // effects re-run and restore markers/path.
    useEffect(() => {
      setReady(false);
    }, [html]);

    return (
      <View style={StyleSheet.absoluteFill}>
        <WebView
          ref={webRef}
          style={styles.web}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={onMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          androidLayerType="hardware"
          // The map is interactive; let it handle its own gestures.
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
});

/** Build the self-contained Leaflet HTML document. */
function buildHtml(
  center: { lat: number; lng: number; zoom: number },
  dark: boolean,
): string {
  // Dark mode: invert the tile pane for a passable dark map (OSM has no native
  // dark tiles without a key).
  const tileFilter = dark
    ? 'filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9);'
    : '';
  const bg = dark ? '#0B1221' : '#F4F6FB';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${bg}; }
    .leaflet-tile-pane { ${tileFilter} }
    .leaflet-container { background: ${bg}; outline: none; }
    .gs-pin { display:flex; flex-direction:column; align-items:center; }
    .gs-bubble {
      width:40px; height:40px; border-radius:20px; border:3px solid #fff;
      display:flex; align-items:center; justify-content:center; font-size:20px;
      box-shadow:0 2px 4px rgba(0,0,0,.35);
    }
    .gs-me { box-shadow:0 0 0 3px rgba(37,99,235,.35), 0 2px 4px rgba(0,0,0,.35); }
    .gs-dim { opacity:.55; }
    .gs-pointer {
      width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent;
      border-top:9px solid #fff; margin-top:-2px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${center.lat}, ${center.lng}], ${center.zoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, crossOrigin: true
    }).addTo(map);
    L.control.attribution({ prefix: false })
      .addAttribution('© OpenStreetMap')
      .addTo(map);

    var layer = L.layerGroup().addTo(map);
    var pathLine = null;
    var accuracyCircle = null;
    var markerIndex = {};

    function send(obj) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    }

    function pinHtml(m) {
      var cls = 'gs-bubble' + (m.isMe ? ' gs-me' : '') + (m.dimmed ? ' gs-dim' : '');
      return '<div class="gs-pin">'
        + '<div class="' + cls + '" style="background:' + m.color + '">' + (m.emoji || '📍') + '</div>'
        + '<div class="gs-pointer"></div></div>';
    }

    window.__setMarkers = function (list) {
      layer.clearLayers();
      markerIndex = {};
      (list || []).forEach(function (m) {
        var icon = L.divIcon({
          html: pinHtml(m),
          className: '',
          iconSize: [40, 49],
          iconAnchor: [20, 49]
        });
        var mk = L.marker([m.lat, m.lng], { icon: icon, zIndexOffset: m.isMe ? 1000 : 0 });
        mk.on('click', function () { send({ type: 'marker', id: m.id }); });
        mk.addTo(layer);
        markerIndex[m.id] = mk;
      });
    };

    window.__setPath = function (pts, color) {
      if (pathLine) { map.removeLayer(pathLine); pathLine = null; }
      if (!pts || pts.length < 2) return;
      var latlngs = pts.map(function (p) { return [p.lat, p.lng]; });
      pathLine = L.polyline(latlngs, {
        color: color || '#2563EB', weight: 4, opacity: 0.85, lineJoin: 'round'
      }).addTo(map);
    };

    window.__setAccuracy = function (a) {
      if (accuracyCircle) { map.removeLayer(accuracyCircle); accuracyCircle = null; }
      if (!a || !a.radius || a.radius <= 0) return;
      accuracyCircle = L.circle([a.lat, a.lng], {
        radius: a.radius, color: a.color, weight: 1, opacity: 0.4,
        fillColor: a.color, fillOpacity: 0.12
      }).addTo(map);
    };

    window.__centerOn = function (lat, lng, zoom) {
      map.flyTo([lat, lng], zoom || 16, { duration: 0.45 });
    };

    window.__fitAll = function () {
      var pts = [];
      for (var id in markerIndex) { pts.push(markerIndex[id].getLatLng()); }
      if (pts.length === 0) return;
      if (pts.length === 1) { map.flyTo(pts[0], 16, { duration: 0.45 }); return; }
      map.flyToBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 17, duration: 0.45 });
    };

    // Signal readiness once Leaflet has laid out.
    map.whenReady(function () { setTimeout(function () { send({ type: 'ready' }); }, 50); });
  </script>
</body>
</html>`;
}
