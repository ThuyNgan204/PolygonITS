import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

//add interface
interface PolygonItem {
  points: string;
  color: string;
}

interface IframeWithImageAndPolygonsProps {
  imgSrc: string;
  polygons: PolygonItem[]; // Thay đổi kiểu dữ liệu
  streamWidth: number;
  streamHeight: number;
}

function isPointInPolygon(point: number[], polygon: number[]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length / 2 - 1; i < polygon.length / 2; j = i++) {
    const xi = polygon[i * 2];
    const yi = polygon[i * 2 + 1];
    const xj = polygon[j * 2];
    const yj = polygon[j * 2 + 1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

export function IframeWithImageAndPolygons({ imgSrc, polygons, streamWidth, streamHeight }) {
  const iframeRef = useRef(null);
  const [iframeBody, setIframeBody] = useState(null);

  useEffect(() => {
    function onLoad() {
      if (iframeRef.current) {
        setIframeBody(iframeRef.current.contentDocument.body);
      }
    }

    const iframeCurrent = iframeRef.current;
    if (iframeCurrent) {
      iframeCurrent.addEventListener('load', onLoad);
      // Also try to set body immediately if iframe is already loaded
      if (iframeCurrent.contentDocument?.readyState === 'complete') {
        setIframeBody(iframeCurrent.contentDocument.body);
      }
    }
    return () => {
      if (iframeCurrent) {
        iframeCurrent.removeEventListener('load', onLoad);
      }
    };
  }, [imgSrc]); // Run on srcDoc changes as well

  const iframeContent = `
    <html>
        <head>
        <style>
            html, body {
            margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: black;
            }
            #container {
            position: relative; width: 100%; height: 100%;
            }
            img {
            width: 100%; height: 100%; display: block;
            }
            svg {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;
            }
        </style>
        </head>
        <body>
        <div id="container">
            <img src="${imgSrc}" alt="stream image" />
            <svg id="polygon-overlay" viewBox="0 0 ${streamWidth} ${streamHeight}" preserveAspectRatio="xMidYMid meet"></svg>
        </div>
        </body>
    </html>
    `;

  return (
    <>
      <iframe
        ref={iframeRef}
        srcDoc={iframeContent}
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
        }}
        sandbox="allow-same-origin allow-scripts"
        title="Stream with polygons"
      />
      {iframeBody &&
        createPortal(
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            {/* {polygons.map((pts, i) => (
              <polygon key={i} points={pts} fill="rgba(0,0,255,0.2)" stroke="blue" strokeWidth={2} />
            ))} */}

          {polygons.map((polygon, index) => {
              const points = polygon.points.split(' ').flatMap(p => p.split(',').map(Number));

              const step = 20; // Khoảng cách giữa các đường lưới
              const xs = points?.filter((_, i) => i % 2 === 0) || [];
              const ys = points?.filter((_, i) => i % 2 === 1) || [];
              if (xs.length === 0 || ys.length === 0) return null;

              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);

              const gridLines: React.ReactElement[] = [];

              // Đường dọc
              for (let x = minX; x <= maxX; x += step) {
                  const segments = [];
                  let segmentStart = null;
                  for (let y = minY; y <= maxY; y++) {
                      if (isPointInPolygon([x, y], points)) {
                          if (segmentStart === null) segmentStart = y;
                      } else {
                          if (segmentStart !== null) {
                              segments.push([segmentStart, y - 1]);
                              segmentStart = null;
                          }
                      }
                  }
                  if (segmentStart !== null) segments.push([segmentStart, maxY]);

                  segments.forEach(([startY, endY], i) => {
                      gridLines.push(
                          <line
                              key={`vline-${index}-${x}-${i}`}
                              x1={x}
                              y1={startY}
                              x2={x}
                              y2={endY}
                              stroke='white' // Màu của lưới giống với viền
                              strokeWidth={0.5}
                              opacity={0.3}
                          />
                      );
                  });
              }

              // Đường ngang
              for (let y = minY; y <= maxY; y += step) {
                  const segments = [];
                  let segmentStart = null;
                  for (let x = minX; x <= maxX; x++) {
                      if (isPointInPolygon([x, y], points)) {
                          if (segmentStart === null) segmentStart = x;
                      } else {
                          if (segmentStart !== null) {
                              segments.push([segmentStart, x - 1]);
                              segmentStart = null;
                          }
                      }
                  }
                  if (segmentStart !== null) segments.push([segmentStart, maxX]);

                  segments.forEach(([startX, endX], i) => {
                      gridLines.push(
                          <line
                              key={`hline-${index}-${y}-${i}`}
                              x1={startX}
                              y1={y}
                              x2={endX}
                              y2={y}
                              stroke='white'
                              strokeWidth={0.5}
                              opacity={0.3}
                          />
                      );
                  });
              }

              return (
                <React.Fragment key={index}>
                  {/* Đa giác chính với fill trong suốt và viền màu */}
                  <polygon
                    points={polygon.points}
                    stroke={polygon.color}
                    strokeWidth={2}
                    fill='rgba(0,0,255,0.05)'
                  />
                  {/* Render các đường lưới */}
                  {gridLines}
                </React.Fragment>
              );
            })}
          </svg>,
          iframeBody.querySelector('#polygon-overlay') || iframeBody
        )}
    </>
  );
}