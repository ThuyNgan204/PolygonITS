'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  TextField,
  Box,
  Snackbar,
  Alert
} from '@mui/material';
import { XSquare } from '@phosphor-icons/react/dist/ssr/XSquare';

const zoneFillColor = 'rgba(0, 0, 255, 0.05)';
const VALID_ZONE_NAMES = ['inner', 'outer'];

const ZONE_COLORS = [
  '#0d21f9ff',
  '#FFC107',
  '#FF5722',
  '#26982aff',
  '#E91E63',
  '#9C27B0',
  '#07649eff',
  '#f83bffff',
  '#61453aff',
  '#41535cff'
];

const getNextColor = (zonesCount) => {
  return ZONE_COLORS[zonesCount % ZONE_COLORS.length];
};

function isPointInPolygon(point, polygon) {
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

export function PolygonDetailsForm() {
  const [image, setImage] = useState(null);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [mousePosition, setMousePosition] = useState(null);
  const [selectedCameraSN, setSelectedCameraSN] = useState('');
  const [cameras, setCameras] = useState([]);
  const [zones, setZones] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [tempName, setTempName] = useState('');
  const stageRef = useRef(null);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    type: 'success'
  });
  const [originalName, setOriginalName] = useState('');
  const [nameError, setNameError] = useState(false);

  useEffect(() => {
    if (notification.open) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, open: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedCameraSN) {
      setImage(null);
      setZones([]);
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
          const formattedZones = (polyData.points || []).map(
            (zoneObj, index) => {
              const name = Object.keys(zoneObj)[0];
              const points = zoneObj[name];
              return { name, points, color: getNextColor(index) };
            }
          );
          setZones(formattedZones);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setImage(null);
          setZones([]);
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
      if (Array.isArray(data)) {
        setCameras(data);
      } else {
        console.error('API response for cameras is not an array:', data);
        setCameras([]);
      }
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
      setCameras([]);
    }
  };

  const handleClick = (event) => {
    const stage = event.target.getStage();
    if (!stage) return;
    const point = stage.getPointerPosition();
    if (point) {
      const roundedX = Math.round(point.x);
      const roundedY = Math.round(point.y);
      setCurrentPoints([...currentPoints, roundedX, roundedY]);
    }
  };

  const handleMouseMove = (event) => {
    const stage = event.target.getStage();
    const pos = stage?.getPointerPosition();
    setMousePosition(pos);
  };

  const handleComplete = () => {
    if (currentPoints.length > 2) {
      const newZoneName = `zone${zones.length}`;
      const newColor = getNextColor(zones.length);
      const newZone = {
        name: newZoneName,
        points: currentPoints,
        color: newColor
      };
      setZones([...zones, newZone]);
      setCurrentPoints([]);
    }
  };

  const handleUpdate = async () => {
    const url = `http://localhost:5101/api/v1/camera/${selectedCameraSN}`;
    const pointsForAPI = zones.map((zone) => ({
      [zone.name]: zone.points
    }));
    const dataToUpdate = {
      points: pointsForAPI
    };

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToUpdate)
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }
      await response.json();
      fetchData();
      setNotification({
        open: true,
        message: 'Lưu thành công!',
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating camera:', error);
      setNotification({
        open: true,
        message: 'Lưu thất bại!',
        type: 'error'
      });
    }
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const handleDeviceChange = (e) => {
    setSelectedCameraSN(e.target.value);
  };

  const handleDelete = (index) => {
    setZones(zones.filter((_, i) => i !== index));
  };

  const handleNameClick = (index) => {
    setEditIndex(index);
    const currentName = zones[index].name || '';
    setTempName(currentName);
    setOriginalName(currentName); // Lưu tên gốc
    setNameError(false); // Reset lỗi
  };

  const handleNameChange = (e) => {
    setTempName(e.target.value);
  };

  const handleNameSave = () => {
    if (editIndex !== null) {
      const newName = tempName.trim().toLowerCase();

      if (!VALID_ZONE_NAMES.includes(newName)) {
        setNameError(true);
      } else {
        const updatedZones = [...zones];
        const oldZone = updatedZones[editIndex];
        updatedZones[editIndex] = { ...oldZone, name: newName };
        setZones(updatedZones);
        setEditIndex(null);
        setNameError(false);
      }
    }
  };

  const handleNameBlur = () => {
    if (nameError) {
      setTempName(originalName);
      setNameError(false);
    }

    setEditIndex(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const newName = tempName.trim().toLowerCase();
      if (VALID_ZONE_NAMES.includes(newName)) {
        handleNameSave();
      } else {
        setNameError(true);
      }
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
              {Array.isArray(cameras) &&
                cameras.map((option) => (
                  <MenuItem
                    key={option.serial_number}
                    value={option.serial_number}
                  >
                    {option.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid md={6} xs={12}>
            <Stage
              width={1200}
              height={800}
              onClick={handleClick}
              onMouseMove={handleMouseMove}
              ref={stageRef}
            >
              <Layer>
                {image && (
                  <Image image={image} x={0} y={0} width={1200} height={800} />
                )}

                {zones.map((zone, index) => {
                  const { points, color } = zone;
                  const step = 20;
                  const xs = points?.filter((_, i) => i % 2 === 0) || [];
                  const ys = points?.filter((_, i) => i % 2 === 1) || [];
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
                        stroke={color}
                        strokeWidth={2}
                        closed
                        fill={zoneFillColor}
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
                <TableCell sx={{ width: '20%' }}>
                  <strong>Zone</strong>
                </TableCell>
                <TableCell sx={{ width: '5%' }}>
                  <strong>Color</strong>
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
              {zones.map((zone, index) => {
                const { name, points, color } = zone;
                return (
                  <TableRow key={index}>
                    <TableCell
                      sx={{
                        backgroundColor: 'rgba(0, 0, 255, 0.05)',
                        color: '#1976d2',
                        position: 'relative',
                        height: 40,
                        verticalAlign: 'middle',
                        wordBreak: 'break-word',
                        whiteSpace: 'normal'
                      }}
                    >
                      {editIndex === index ? (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0,
                            display: 'flex',
                            alignItems: 'center',
                            px: 1
                          }}
                        >
                          <TextField
                            value={tempName}
                            onChange={handleNameChange}
                            onBlur={handleNameBlur}
                            onKeyDown={handleKeyDown}
                            size='small'
                            autoFocus
                            variant='standard'
                            fullWidth
                            error={nameError}
                            helperText={
                              nameError
                                ? 'Tên zone phải là "inner" hoặc "outer"'
                                : ''
                            }
                            InputProps={{
                              disableUnderline: true,
                              style: { padding: '4px 8px' }
                            }}
                            sx={{
                              '& .MuiInputBase-input': { p: 0 },
                              '& .MuiInputBase-root:before': {
                                borderBottom: 'none'
                              },
                              '& .MuiInputBase-root:after': {
                                borderBottom: 'none'
                              }
                            }}
                          />
                        </Box>
                      ) : (
                        <span
                          style={{
                            cursor: 'pointer',
                            color: 'inherit',
                            display: 'inline-block',
                            width: '100%',
                            padding: '8px'
                          }}
                          onClick={() => handleNameClick(index)}
                        >
                          {name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          backgroundColor: color,
                          borderRadius: '4px'
                        }}
                      />
                    </TableCell>
                    <TableCell>{points?.join(', ')}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleDelete(index)}
                        color='error'
                      >
                        <XSquare />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
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
            setZones([]);
            setCurrentPoints([]);
          }}
        >
          Xóa
        </Button>
      </CardActions>

      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ top: '70px !important' }}
      >
        <Alert
          onClose={handleClose}
          severity={notification.type}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}
