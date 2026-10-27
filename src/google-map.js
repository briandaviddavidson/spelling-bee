// Optional Google Maps view. Used only when VITE_GOOGLE_MAPS_API_KEY and
// VITE_GOOGLE_MAPS_MAP_ID are set at build time; otherwise the SVG map is drawn.
// Browser keys are public by nature: restrict yours by HTTP referrer.
const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

function loadApi() {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // Google's dynamic library import bootstrap, reduced to what this page needs.
    window.__sbInit = resolve;
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&loading=async&callback=__sbInit`;
    s.async = true;
    s.onerror = reject;
    document.head.append(s);
  });
}

export async function renderGoogleMap(box, cities) {
  if (!KEY || !MAP_ID) return false;
  try {
    await loadApi();
    const { Map, InfoWindow } = await google.maps.importLibrary('maps');
    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    box.replaceChildren();
    const map = new Map(box, {
      mapId: MAP_ID, center: { lat: 38.5, lng: -96 }, zoom: 4, colorScheme: dark ? 'DARK' : 'LIGHT',
      streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
    });
    const info = new InfoWindow();
    for (const c of cities) {
      const size = 10 + c.count * 4;
      const el = document.createElement('div');
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:#eb6834;border:2px solid #fff;opacity:.9`;
      const m = new AdvancedMarkerElement({ map, position: { lat: c.lat, lng: c.lon }, content: el, title: `${c.place}: ${c.count}` });
      m.addListener('click', () => {
        info.setContent(`<strong>${c.place}</strong><br>${c.count} champion${c.count > 1 ? 's' : ''}: ${c.years.join(', ')}`);
        info.open({ map, anchor: m });
      });
    }
    return true;
  } catch (err) {
    console.warn('Google map unavailable, using SVG map', err);
    return false;
  }
}
