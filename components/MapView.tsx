"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { webgl } from "@/lib/map-style-load";
import type { MapProps } from "./map-shared";

const loading = () => <div className="leaflet-host map-loading" />;
// each engine is its own download, so a phone only fetches the one it uses
const GL = dynamic(() => import("./MapViewGL"), { ssr: false, loading });
const Raster = dynamic(() => import("./MapViewLeaflet"), { ssr: false, loading });

/** Vector map (MapLibre) when the device can draw it, which is nearly all; plain tiles otherwise. */
export default function MapView(props: MapProps) {
  const [vector] = useState(() => webgl());
  return vector ? <GL {...props} /> : <Raster {...props} />;
}
