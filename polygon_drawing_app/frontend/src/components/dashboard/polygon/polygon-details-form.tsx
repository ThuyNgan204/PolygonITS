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
import { Image, Layer, Line, Stage, Text } from 'react-konva';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField
} from '@mui/material';
import { XSquare } from '@phosphor-icons/react/dist/ssr/XSquare';

const zoneColor_of_polygon = 'rgba(0, 0, 255, 0.05)';

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

  // ✅ Sử dụng state `zones` để lưu mảng đối tượng JSON
  const [zones, setZones] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [tempName, setTempName] = useState('');

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
          // ✅ Cập nhật state zones với dữ liệu từ API
          setZones(polyData.points || []);
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
      const newZoneName = `zone${zones.length}`;
      // ✅ Tạo đối tượng JSON mới với khóa là tên zone
      const newZone = { [newZoneName]: currentPoints };
      setZones([...zones, newZone]);
      setCurrentPoints([]);
    }
  };

  const handleUpdate = async () => {
    const url = `http://localhost:5101/api/v1/camera/${selectedCameraSN}`;

    const dataToUpdate = {
      points: zones
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
    } catch (error) {
      console.error('Error updating camera:', error);
    }
  };

  const handleDeviceChange = (e) => {
    setSelectedCameraSN(e.target.value);
  };

  const handleDelete = (index) => {
    setZones(zones.filter((_, i) => i !== index));
  };

  const handleNameClick = (index) => {
    setEditIndex(index);
    const name = Object.keys(zones[index])[0];
    setTempName(name);
  };

  const handleNameChange = (e) => {
    setTempName(e.target.value);
  };

  const handleNameSave = () => {
    if (editIndex !== null) {
      const updatedZones = [...zones];
      const oldZone = updatedZones[editIndex];
      const oldName = Object.keys(oldZone)[0];
      const points = oldZone[oldName];
      const newName = tempName.trim() || oldName; //LOẠI BỎ KHOẢNG TRẮNG ĐẦU CUOIIS KHI LƯU XUỐNG DB
      // ✅ Cập nhật khóa của đối tượng JSON
      updatedZones[editIndex] = { [newName]: points };
      setZones(updatedZones);
      setEditIndex(null);
    }
  };

  const handleKeyDown = (e) => {
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
            >
              <Layer>
                {image && (
                  <Image image={image} x={0} y={0} width={1200} height={800} />
                )}

                {zones.map((zone, index) => {
                  // ✅ Lấy tên và điểm từ đối tượng zone
                  const name = Object.keys(zone)[0];
                  const points = zone[name];
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
                  // // ✅ NOTE: Bắt đầu phần thêm nhãn tên zone
                  // const point = zone[name];
                  // const textX = point[0]; // Tọa độ x của đỉnh đầu tiên
                  // const textY = point[1] - 10; // Tọa độ y của đỉnh đầu tiên, trừ đi 10 để nhãn nằm trên đường viền

                  if (points && points.length >= 4) {
                    // ✅ 1. Lấy tọa độ hai đỉnh đầu tiên
                    const x1 = points[0];
                    const y1 = points[1];
                    const x2 = points[2];
                    const y2 = points[3];

                    // // ✅ 2. Tính toán điểm giữa (midpoint) của cạnh
                    // const midX = (x1 + x2) / 2;
                    // const midY = (y1 + y2) / 2;

                    // ✅ 3. Tính góc quay
                    const dx = x2 - x1;
                    const dy = y2 - y1;
                    let rotationAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
                    // ✅ NOTE: Bắt đầu logic xử lý góc quay và căn chỉnh văn bản
                    let offsetX = 0;
                    let offsetY = 0;
                    const offset = 15; // Khoảng cách dịch chuyển
                    let textAlign = 'left';

                    // ✅ NOTE: Chuẩn hóa góc quay để nhãn không bị ngược
                    if (rotationAngle > 90 || rotationAngle < -90) {
                      rotationAngle += 180;
                      if (rotationAngle > 180) {
                        rotationAngle -= 360;
                      }
                      // Đảo ngược căn chỉnh văn bản và hướng dịch chuyển
                      textAlign = 'right';
                      const angleInRadians = (rotationAngle * Math.PI) / 180;

                      // Tính tọa độ dịch chuyển cho nhãn
                      offsetX = Math.sin(angleInRadians) * offset;
                      offsetY = -Math.cos(angleInRadians) * offset;
                    } else {
                      const angleInRadians = (rotationAngle * Math.PI) / 180;
                      offsetX = Math.sin(angleInRadians) * offset;
                      offsetY = -Math.cos(angleInRadians) * offset;
                    }
                    // Vị trí nhãn tạm thời
                    let tempLabelX = x1 + offsetX;
                    let tempLabelY = y1 + offsetY;

                    // ✅ NOTE: Sử dụng hàm isPointInPolygon để kiểm tra
                    if (isPointInPolygon([tempLabelX, tempLabelY], points)) {
                      // Nếu nhãn nằm bên trong, đảo ngược hướng dịch chuyển
                      offsetX = -offsetX;
                      offsetY = -offsetY;
                    }

                    // Cập nhật vị trí cuối cùng của nhãn
                    const labelX = x1 + offsetX;
                    const labelY = y1 + offsetY;

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
                        {/* ✅ NOTE: Thêm thành phần Text để hiển thị tên zone */}
                        <Text
                          x={labelX}
                          y={labelY}
                          text={name}
                          fontSize={18}
                          fill='yellow'
                          rotation={rotationAngle}
                          // ✅ NOTE: Căn chỉnh văn bản tùy thuộc vào góc quay
                          //textAlign={textAlign}
                          shadowColor='black'
                          shadowBlur={2}
                          shadowOffset={{ x: 1, y: 1 }}
                          shadowOpacity={0.8}
                        />
                      </React.Fragment>
                    );
                  }
                  //Trả về NULL nếu không đủ điểm
                  return null;
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
                <TableCell sx={{ width: '25%' }}>
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
              {zones.map((zone, index) => {
                const name = Object.keys(zone)[0];
                const points = zone[name];
                return (
                  <TableRow key={index}>
                    <TableCell
                      style={{
                        backgroundColor: zoneColor_of_polygon,
                        position: 'relative',
                        height: 40,
                        verticalAlign: 'middle',
                        // ✅ Đảm bảo nội dung không tràn ra ngoài
                        wordBreak: 'break-word',
                        whiteSpace: 'normal'
                      }}
                    >
                      {editIndex === index ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: 15,
                            right: 0,
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            alignItems: 'center',
                            px: 1 // Padding ngang để tạo khoảng cách
                          }}
                        >
                          <TextField
                            value={tempName}
                            onChange={handleNameChange}
                            onBlur={handleNameSave}
                            onKeyDown={handleKeyDown}
                            size='small'
                            autoFocus
                            variant='standard'
                            fullWidth
                            InputProps={{
                              style: { fontSize: 14, padding: '4px 8px' },
                              disableUnderline: true
                            }}
                            sx={{
                              '& .MuiInputBase-input': {
                                p: 0 // ✅ Bỏ padding mặc định của input
                              },
                              // ✅ Sử dụng sx để tùy chỉnh kiểu dáng
                              '& .MuiInputBase-root:before': {
                                borderBottom: 'none !important' // Đảm bảo gạch chân ẩn
                              },
                              '& .MuiInputBase-root:after': {
                                borderBottom: 'none !important' // Đảm bảo gạch chân khi focus ẩn
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <span
                          style={{
                            cursor: 'pointer',
                            color: '#1976d2',
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
    </Card>
  );
}
