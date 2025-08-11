'use client';

import React, { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import { Image, Layer, Line, Stage } from 'react-konva';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

interface Point {
  x: number;
  y: number;
}

export function PolygonInfo(): React.JSX.Element {

  const [image] = useState(new window.Image());
  const [imageLoaded, setImageLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [polygons, setPolygons] = useState([]);
  const [currentPoints, setCurrentPoints] = useState([]);

  useEffect(() => {
    setPolygons([
      [490, 253, 619, 253, 858, 788, 372, 787],
    ])
  }, []);

  // Load image dynamically
  useEffect(() => {
    image.src = '/assets/device-mct-1.1.jpg';
    image.onload = () => {
      setImageLoaded(true);
    };
  }, [image]);

  const handleClick = (event) => {
    console.log('click');
  };

  return (
    <Card>
      <CardHeader title='' />
      <CardContent>
        <Typography align='center'>
          Polygon:
          <ul>
          {polygons.map((points, index) => (
            <li key={index}>{points}</li>
          ))}
          </ul>
        </Typography>
        <Grid container spacing={3}>
          <Grid md={6} xs={12}>
            <Stage width={1200} height={800} onClick={handleClick}>
              <Layer>
                {image && <Image image={image} x={0} y={0} width={1200} height={800} />}

                {/* Render multiple polygons */}
                {polygons.map((points, index) => (
                  <Line key={index} points={points} stroke="blue" strokeWidth={2} closed fill="rgba(0, 0, 255, 0.1)" />
                ))}

                {/* Draw current polygon-in-progress */}
                <Line points={currentPoints} stroke="red" strokeWidth={2} />
              </Layer>
            </Stage>
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
      <CardActions>
        <Button fullWidth variant="text">
          Upload picture
        </Button>
      </CardActions>
    </Card>
  );
}
