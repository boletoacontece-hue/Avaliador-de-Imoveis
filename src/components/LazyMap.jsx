import React, { Suspense, lazy } from "react";

// Leaflet só é baixado quando o mapa aparece (aba Comparativos / página pública)
const EvaluationMap = lazy(() => import("./EvaluationMap"));

export default function LazyMap(props) {
  return (
    <Suspense fallback={<div className="carregando" style={{ minHeight: 200, height: props.altura || "100%" }}><div className="giro" /></div>}>
      <EvaluationMap {...props} />
    </Suspense>
  );
}
