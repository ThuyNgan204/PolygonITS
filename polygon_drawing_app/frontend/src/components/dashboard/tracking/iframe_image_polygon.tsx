import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
            {polygons.map((pts, i) => (
              <polygon key={i} points={pts} fill="rgba(0,0,255,0.2)" stroke="blue" strokeWidth={2} />
            ))}
          </svg>,
          iframeBody.querySelector('#polygon-overlay') || iframeBody
        )}
    </>
  );
}