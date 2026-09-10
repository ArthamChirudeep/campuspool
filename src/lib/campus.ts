export const CAMPUS = {
  name: "CVR College of Engineering",
  short: "CVR",
  address: "Vastunagar, Mangalpally, Ibrahimpatnam, Rangareddy, Telangana 501510",
  city: "Hyderabad",
  lat: 17.1968,
  lng: 78.6069,
} as const;

export const DISCLAIMER =
  "CampusPool @ CVR is an independent student project. It is not officially endorsed by or affiliated with CVR ";

export const DAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 0, short: "Sun", label: "Sunday" },
] as const;

export const CO2_KG_PER_KM = 0.171;

export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Shortest distance in km from point p to the segment a->b. */
export function distanceToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const toXY = (q: LatLng) => ({
    x: q.lng * Math.cos((17.3 * Math.PI) / 180) * 111.32,
    y: q.lat * 110.57,
  });
  const P = toXY(p);
  const A = toXY(a);
  const B = toXY(b);
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return haversineKm(p, a);
  let t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = A.x + t * dx;
  const cy = A.y + t * dy;
  return Math.hypot(P.x - cx, P.y - cy);
}

export function minutesFromTime(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function formatTime(time: string): string {
  const total = minutesFromTime(time);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDays(days: number[] | null | undefined): string {
  if (!days || days.length === 0) return "One-time";
  const sorted = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  if (sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5)) return "Mon–Fri";
  return sorted
    .map((d) => DAYS.find((x) => x.value === d)?.short ?? "")
    .filter(Boolean)
    .join(", ");
}

export function co2ForKm(km: number): number {
  return km * CO2_KG_PER_KM;
}

/** Google encoded-polyline decoder. */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
