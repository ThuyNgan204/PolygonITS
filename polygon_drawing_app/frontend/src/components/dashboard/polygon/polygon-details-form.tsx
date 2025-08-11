'use client';

import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { Image, Layer, Line, Stage } from 'react-konva';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField // ✅ Added
} from '@mui/material';
import { XSquare } from '@phosphor-icons/react/dist/ssr/XSquare';

const zoneColor_of_polygon = 'rgba(0, 0, 255, 0.05)';

function isPointInPolygon(point: [number, number], polygon: number[]) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length / 2 - 1; i < polygon.length / 2; j = i++) {
    const xi = polygon[i * 2],
      yi = polygon[i * 2 + 1];
    const xj = polygon[j * 2],
      yj = polygon[j * 2 + 1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

export function PolygonDetailsForm(): React.JSX.Element {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [polygons, setPolygons] = useState([]);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [mousePosition, setMousePosition] = useState(null);
  const [selectedCameraSN, setSelectedCameraSN] = useState('');
  const [cameras, setCameras] = useState([]);

  // ✅ Added state for editable zone names
  const [zoneNames, setZoneNames] = useState<string[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [tempName, setTempName] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedCameraSN) {
      setImage(null);
      setPolygons([]);
      return;
    }

    let isMounted = true;

    async function fetchCameraData() {
      try {
        const response = await fetch(
          `http://localhost:5101/api/v1/tracking/latest-frame/${selectedCameraSN}`
        );
        if (!response.ok) throw new Error('Failed to fetch latest frame');
        const blob = await response.blob();

        const img = new window.Image();
        img.onload = () => {
          if (isMounted) setImage(img);
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(blob);

        const polyResp = await fetch(
          `http://localhost:5101/api/v1/camera/${selectedCameraSN}`
        );
        if (!polyResp.ok) throw new Error('Failed to fetch polygons');
        const polyData = await polyResp.json();
        if (isMounted) {
          setPolygons(polyData.points || []);
          setZoneNames(
            (polyData.points || []).map((_: any, i: number) => `Zone${i}`)
          ); // ✅ Added
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setImage(null);
          setPolygons([]);
        }
      }
    }

    fetchCameraData();

    return () => {
      isMounted = false;
    };
  }, [selectedCameraSN]);

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:5101/api/v1/camera');
      const data = await response.json();
      setCameras(data);
    } catch (error) {}
  };

  const handleClick = (event) => {
    const { x, y } = event.target.getStage().getPointerPosition();
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    setCurrentPoints([...currentPoints, roundedX, roundedY]);
  };

  const handleMouseMove = (event) => {
    const stage = event.target.getStage();
    const pos = stage.getPointerPosition();
    setMousePosition(pos);
  };

  const handleComplete = () => {
    if (currentPoints.length > 2) {
      const newPolygons = [...polygons, currentPoints];
      setPolygons(newPolygons);
      setZoneNames([...zoneNames, `Zone${newPolygons.length - 1}`]); // ✅ Added
      setCurrentPoints([]);
    }
  };

  const handleUpdate = async () => {
    const url = `http://localhost:5101/api/v1/camera/${selectedCameraSN}`;

    const points = {
      //
      points: polygons
    };

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(points)
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      await response.json();
      fetchData();
    } catch (error) {
      console.error('Error updating camera:', error);
    }
  };

  const handleDeviceChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedCameraSN(e.target.value?.toString());
  };

  const handleDelete = (index: number) => {
    setPolygons(polygons.filter((_, i) => i !== index));
    setZoneNames(zoneNames.filter((_, i) => i !== index)); // ✅ Added
  };

  // ✅ Added editable functions
  const handleNameClick = (index: number) => {
    setEditIndex(index);
    setTempName(zoneNames[index]);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempName(e.target.value);
  };

  const handleNameSave = () => {
    if (editIndex !== null) {
      const updated = [...zoneNames];
      updated[editIndex] = tempName.trim() || updated[editIndex];
      setZoneNames(updated);
      setEditIndex(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    }
  };

  return (
    <Card>
      <CardHeader title='Polygon' />
      <Divider />

      <CardContent>
        <Grid container md={6} xs={12}>
          <FormControl fullWidth>
            <InputLabel>Thiết bị</InputLabel>
            <Select
              value={selectedCameraSN}
              onChange={handleDeviceChange}
              label='Thiết bị'
              variant='outlined'
            >
              {cameras.map((option) => (
                <MenuItem key={option.name} value={option.serial_number}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid container spacing={3}>
          <Grid md={6} xs={12}>
            <Stage
              //padding-top={10}
              width={1200}
              height={800}
              onClick={handleClick}
              onMouseMove={handleMouseMove}
            >
              <Layer>
                {image && (
                  <Image image={image} x={0} y={0} width={1200} height={800} />
                )}

                {polygons.map((points, index) => {
                  const step = 20;

                  const xs = points.filter((_, i) => i % 2 === 0);
                  const ys = points.filter((_, i) => i % 2 === 1);
                  const minX = Math.min(...xs);
                  const maxX = Math.max(...xs);
                  const minY = Math.min(...ys);
                  const maxY = Math.max(...ys);

                  const verticalLines = [];
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
                    if (segmentStart !== null)
                      segments.push([segmentStart, maxY]);

                    segments.forEach(([startY, endY], i) => {
                      verticalLines.push(
                        <Line
                          key={`vline-${index}-${x}-${i}`}
                          points={[x, startY, x, endY]}
                          stroke='white'
                          strokeWidth={0.5}
                          opacity={0.3}
                        />
                      );
                    });
                  }

                  const horizontalLines = [];
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
                    if (segmentStart !== null)
                      segments.push([segmentStart, maxX]);

                    segments.forEach(([startX, endX], i) => {
                      horizontalLines.push(
                        <Line
                          key={`hline-${index}-${y}-${i}`}
                          points={[startX, y, endX, y]}
                          stroke='white'
                          strokeWidth={0.5}
                          opacity={0.3}
                        />
                      );
                    });
                  }

                  return (
                    <React.Fragment key={index}>
                      <Line
                        points={points}
                        stroke='blue'
                        strokeWidth={2}
                        closed
                        fill={zoneColor_of_polygon}
                      />
                      {verticalLines}
                      {horizontalLines}
                    </React.Fragment>
                  );
                })}
                <Line
                  points={
                    mousePosition
                      ? [...currentPoints, mousePosition.x, mousePosition.y]
                      : currentPoints
                  }
                  stroke='red'
                  strokeWidth={2}
                />
              </Layer>
            </Stage>
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
      <CardContent>
        <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
          Kết quả
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Zone</strong>
                </TableCell>
                <TableCell>
                  <strong>Points</strong>
                </TableCell>
                <TableCell>
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {polygons.map((polygon, index) => (
                <TableRow key={index}>
                  <TableCell
                    style={{
                      backgroundColor: zoneColor_of_polygon,
                      position: 'relative',
                      height: 40, // ✅ cố định chiều cao để không nhảy layout
                      verticalAlign: 'middle'
                    }}
                  >
                    {editIndex === index ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: 0,
                          right: 0,
                          transform: 'translateY(-50%)'
                        }}
                      >
                        <TextField
                          value={tempName}
                          onChange={handleNameChange}
                          onBlur={handleNameSave}
                          onKeyDown={handleKeyDown}
                          size='small'
                          autoFocus
                          variant='outlined'
                          fullWidth
                          InputProps={{
                            style: { fontSize: 14, padding: '4px 8px' }
                          }}
                        />
                      </div>
                    ) : (
                      <span
                        style={{
                          cursor: 'pointer',
                          color: '#1976d2',
                          display: 'inline-block',
                          width: '100%'
                        }}
                        onClick={() => handleNameClick(index)}
                      >
                        {zoneNames[index] || `Zone${index}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{polygon?.join(', ')}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleDelete(index)}
                      color='error'
                    >
                      <XSquare />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      <Divider />
      <CardActions sx={{ justifyContent: 'space-between' }}>
        <Button variant='contained' color='secondary' onClick={handleComplete}>
          Xác nhận
        </Button>

        <Button variant='contained' color='success' onClick={handleUpdate}>
          Lưu
        </Button>

        <Button
          style={{ display: 'none' }}
          variant='contained'
          color='error'
          onClick={() => {
            setPolygons([]);
            setZoneNames([]); // ✅ Added
            setCurrentPoints([]);
          }}
        >
          Xóa
        </Button>
      </CardActions>
    </Card>
  );
}
