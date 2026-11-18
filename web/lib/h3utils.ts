import * as h3 from 'h3-js';

export function latlngToH3(lat: number, lng: number, resolution = 8): string {
  return h3.latLngToCell(lat, lng, resolution);
}

export function h3ToLatLng(cell: string): [number, number] {
  return h3.cellToLatLng(cell);
}

export function getH3Boundary(cell: string): [number, number][] {
  return h3.cellToBoundary(cell);
}

