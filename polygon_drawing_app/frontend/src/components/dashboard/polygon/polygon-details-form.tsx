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
import { Image, Layer, Line, Stage, Circle } from 'react-konva';
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
import { XSquare, PencilSimple, CheckCircle, Trash } from '@phosphor-icons/react';

import Konva from 'konva';

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

const assignColors = (currentZones) => {
    return currentZones.map((zone, index) => ({
        ...zone,
        color: getNextColor(index)
    }));
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

const PolygonWithDraggablePoints = ({
    points,
    color,
    isEditing,
    onPointDrag,
    onPolygonClick,
    onDragEnd,
    isThisPolygonBeingEdited
}) => {
    const step = 20;
    const xs = points?.filter((_, i) => i % 2 === 0) || [];
    const ys = points?.filter((_, i) => i % 2 === 1) || [];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const verticalLines = [];
    if (points.length > 0) {
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
                verticalLines.push(
                    <Line
                        key={`vline-${x}-${i}`}
                        points={[x, startY, x, endY]}
                        stroke='white'
                        strokeWidth={0.5}
                        opacity={0.3}
                    />
                );
            });
        }
    }

    const horizontalLines = [];
    if (points.length > 0) {
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
                horizontalLines.push(
                    <Line
                        key={`hline-${y}-${i}`}
                        points={[startX, y, endX, y]}
                        stroke='white'
                        strokeWidth={0.5}
                        opacity={0.3}
                    />
                );
            });
        }
    }

    const onPolygonClickHandler = isThisPolygonBeingEdited ? onPolygonClick : undefined;

    return (
        <React.Fragment>
            {verticalLines}
            {horizontalLines}

            {points.length > 0 && (
                <Line
                    points={points}
                    stroke={color}
                    strokeWidth={isThisPolygonBeingEdited ? 4 : 2}
                    closed
                    fill={zoneFillColor}
                    onMouseDown={onPolygonClickHandler}
                />
            )}
            
            {isEditing && points.map((_, index) => {
                if (index % 2 === 0) {
                    const x = points[index];
                    const y = points[index + 1];
                    return (
                        <Circle
                            key={index}
                            x={x}
                            y={y}
                            radius={8}
                            fill="white"
                            stroke="black"
                            strokeWidth={1}
                            draggable
                            onDragMove={(e) => onPointDrag(index, e)}
                            onDragEnd={onDragEnd}
                        />
                    );
                }
                return null;
            })}
        </React.Fragment>
    );
};

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

    const [editMode, setEditMode] = useState(false);
    // Bản sao zones đã được LƯU HOẶC XÓA thành công (dùng cho việc hủy toàn bộ thay đổi sau cùng)
    const [originalZones, setOriginalZones] = useState([]); 
    // TRẠNG THÁI ZONE KHI BẮT ĐẦU EDIT (Dùng cho Hủy/Cancel)
    const [originalEditState, setOriginalEditState] = useState(null); 
    const [selectedPolygonIndex, setSelectedPolygonIndex] = useState(null);

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

    // SỬA LOGIC 3: Đảm bảo originalZones được cập nhật chính xác sau khi tải dữ liệu ban đầu
    useEffect(() => {
        if (!selectedCameraSN) {
            setImage(null);
            setZones([]);
            setOriginalZones([]); // Đảm bảo reset bản gốc
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
                    setOriginalZones(formattedZones); // Cập nhật bản gốc sau khi load
                }
            } catch (error) {
                console.error(error);
                if (isMounted) {
                    setImage(null);
                    setZones([]);
                    setOriginalZones([]);
                }
            }
        }

        fetchCameraData();

        return () => {
            isMounted = false;
        };
    }, [selectedCameraSN]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (editMode && selectedPolygonIndex !== null) {
                if ( e.key === 'Delete') {
                    const updatedZones = [...zones];
                    // Chỉ xóa points của zone đang chọn
                    updatedZones[selectedPolygonIndex].points = []; 
                    setZones(updatedZones);
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [editMode, selectedPolygonIndex, zones]);

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

            if (editMode && selectedPolygonIndex !== null) {
                // Thêm điểm vào polygon đang chỉnh sửa
                const updatedZones = [...zones];
                updatedZones[selectedPolygonIndex].points = [...updatedZones[selectedPolygonIndex].points, roundedX, roundedY];
                setZones(updatedZones);
            } else if (!editMode) {
                // Thêm điểm vào polygon mới
                setCurrentPoints([...currentPoints, roundedX, roundedY]);
            }
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
            const newZone = {
                name: newZoneName,
                points: currentPoints
            };
            const updatedZones = [...zones, newZone];
            setZones(assignColors(updatedZones));
            setCurrentPoints([]);
        }
    };

    // SỬA LOGIC 3: Cập nhật originalZones sau khi lưu thành công
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
            setOriginalZones(zones); // Cập nhật bản sao lưu sau khi LƯU THÀNH CÔNG
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

    // SỬA LOGIC 3: Cập nhật originalZones sau khi xóa
    const handleDelete = (index) => {
        const updatedZones = zones.filter((_, i) => i !== index);
        const finalZones = assignColors(updatedZones);
        
        setZones(finalZones);
        setOriginalZones(finalZones); // Cập nhật bản sao lưu (originalZones)
        
        setEditMode(false);
        setEditIndex(null);
        setSelectedPolygonIndex(null);
        setCurrentPoints([]);
    };

    // SỬA LOGIC 3: Lưu trạng thái gốc khi bắt đầu chỉnh sửa
    const handleEdit = (index) => {
        setEditMode(true);
        setEditIndex(index);
        setSelectedPolygonIndex(index);
        setTempName(zones[index].name);
        setOriginalName(zones[index].name);
        setNameError(false);
        
        // LƯU TRẠNG THÁI GỐC CỦA ZONE NÀY KHI BẮT ĐẦU CHỈNH SỬA
        setOriginalEditState({
            name: zones[index].name,
            points: [...zones[index].points] // Sao chép mảng points
        });
    };

    // SỬA LOGIC 1 & 2: Ràng buộc tên và Lưu tạm thời (khi bấm Check/Save UI)
    const handleSaveEdit = () => {
        const newName = tempName.trim().toLowerCase();

        // 1. KIỂM TRA RÀNG BUỘC TÊN
        // Cho phép tên cũ ('zoneX') được giữ nguyên nếu người dùng không đổi
        if (!VALID_ZONE_NAMES.includes(newName)) {
            if (newName === originalName && originalName.startsWith('zone')) {
                // OK: Giữ nguyên tên 'zoneX', tiếp tục
            } else {
                 setNotification({ open: true, message: 'Tên zone khi chỉnh sửa chỉ được là "inner" hoặc "outer".', type: 'error' });
                 setNameError(true);
                 return;
            }
        }
        
        // 2. BỎ QUA KIỂM TRA TRÙNG LẶP NẾU TÊN KHÔNG ĐỔI
        if (newName === originalName) {
            // Thoát chế độ chỉnh sửa, lưu tạm thời
            setEditMode(false);
            setEditIndex(null);
            setSelectedPolygonIndex(null);
            setTempName('');
            setNameError(false);
            return;
        }

        // 3. KIỂM TRA TRÙNG LẶP (CHỈ KHI TÊN THAY ĐỔI)
        const isNameDuplicate = zones.some((zone, i) =>
            i !== editIndex && zone.name.toLowerCase() === newName
        );

        if (isNameDuplicate) {
            setNotification({ open: true, message: 'Tên zone đã tồn tại. Vui lòng chọn tên khác.', type: 'error' });
            setNameError(true);
            return;
        }

        // 4. LƯU TẠM THỜI
        const updatedZones = [...zones];
        updatedZones[editIndex] = { ...updatedZones[editIndex], name: newName };
        setZones(updatedZones); // Cập nhật tên zone

        // Thoát chế độ chỉnh sửa
        setEditMode(false);
        setEditIndex(null);
        setSelectedPolygonIndex(null);
        setTempName('');
        setNameError(false);
    };

    // SỬA LOGIC 3: Hủy bỏ các thay đổi (Chỉ hoàn tác cho zone đang chỉnh sửa)
    const handleCancelEdit = () => {
        if (originalEditState && selectedPolygonIndex !== null) {
            const updatedZones = [...zones];
            
            // HOÀN TÁC: Khôi phục tên và points của zone đang chỉnh sửa về trạng thái gốc (originalEditState)
            updatedZones[selectedPolygonIndex] = { 
                ...updatedZones[selectedPolygonIndex],
                name: originalEditState.name,
                points: originalEditState.points 
            };
            
            setZones(updatedZones); // Cập nhật mảng zones
        } else {
            // Trường hợp dự phòng/lỗi: nếu originalEditState bị lỗi, quay về bản lưu cuối cùng (originalZones)
            setZones(originalZones);
        }

        // Thoát chế độ chỉnh sửa
        setEditMode(false);
        setEditIndex(null);
        setSelectedPolygonIndex(null);
        setTempName('');
        setOriginalEditState(null); // Xóa state backup
    };

    const handleNameClick = (index) => {
        // Chỉ cho phép chỉnh sửa tên khi đang ở chế độ chỉnh sửa toàn cục (EditMode)
        if (selectedPolygonIndex !== index || !editMode) return;
        
        setEditIndex(index);
        const currentName = zones[index].name || '';
        setTempName(currentName);
        setOriginalName(currentName);
        setNameError(false);
    };

    const handleNameChange = (e) => {
        setTempName(e.target.value);
        setNameError(false); // Xóa lỗi khi người dùng bắt đầu gõ
    };

    // SỬA LOGIC 2: Xóa logic kiểm tra tên và lưu tạm thời
    // Việc kiểm tra và lưu tạm thời đã chuyển sang handleNameKeyDown (Enter) và handleSaveEdit (Check)
    const handleNameBlur = () => {
        // Thoát chế độ chỉnh sửa tên inline, không làm gì cả
        setEditIndex(null);
        // Lưu ý: Nếu muốn áp dụng thay đổi ngay khi blur (rời khỏi ô text), 
        // bạn có thể gọi handleSaveEdit ở đây, nhưng logic hiện tại 
        // là chỉ lưu khi bấm Enter hoặc CheckCircle.
    };

    // SỬA LOGIC 2: Lưu tạm thời tên khi bấm ENTER
    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter' && editIndex !== null) {
            // Gọi hàm lưu tạm thời/kiểm tra
            handleSaveEdit();
        }
    };

    const handlePointDrag = (pointIndex, e) => {
        if (editMode && selectedPolygonIndex !== null) {
            const newPoints = [...zones[selectedPolygonIndex].points];
            newPoints[pointIndex] = Math.round(e.target.x());
            newPoints[pointIndex + 1] = Math.round(e.target.y());
            const updatedZones = [...zones];
            updatedZones[selectedPolygonIndex].points = newPoints;
            setZones(updatedZones); // Cập nhật tạm thời points
        }
    };
    
    const handlePolygonClick = (e, index) => {
        if (editMode && selectedPolygonIndex === index) {
            setSelectedPolygonIndex(index);
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
                            disabled={editMode}
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
                                    const isThisPolygonBeingEdited = editMode && selectedPolygonIndex === index;

                                    return (
                                        <PolygonWithDraggablePoints
                                            key={index}
                                            points={points}
                                            color={color}
                                            isEditing={isThisPolygonBeingEdited}
                                            onPointDrag={handlePointDrag}
                                            onPolygonClick={(e) => handlePolygonClick(e, index)}
                                            onDragEnd={() => {}}
                                            isThisPolygonBeingEdited={isThisPolygonBeingEdited}
                                        />
                                    );
                                })}
                                
                                {!editMode && (
                                    <Line
                                        points={
                                            mousePosition
                                                ? [...currentPoints, mousePosition.x, mousePosition.y]
                                                : currentPoints
                                        }
                                        stroke='red'
                                        strokeWidth={2}
                                    />
                                )}
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
                                const isEditing = editIndex === index;

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
                                            {isEditing ? (
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
                                                        onKeyDown={handleNameKeyDown}
                                                        size='small'
                                                        autoFocus
                                                        variant='standard'
                                                        fullWidth
                                                        error={nameError}
                                                        helperText={nameError ? 'Tên zone phải là "inner" hoặc "outer"' : ''}
                                                        InputProps={{
                                                            disableUnderline: true,
                                                            style: { padding: '4px 8px' }
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
                                            {selectedPolygonIndex === index && editMode ? (
                                                <>
                                                    <IconButton
                                                        aria-label="save"
                                                        onClick={handleSaveEdit}
                                                        color="success"
                                                    >
                                                        <CheckCircle />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label="cancel"
                                                        onClick={handleCancelEdit}
                                                        color="error"
                                                    >
                                                        <Trash />
                                                    </IconButton>
                                                </>
                                            ) : (
                                                <>
                                                    <IconButton
                                                        aria-label="edit"
                                                        onClick={() => handleEdit(index)}
                                                        disabled={editMode}
                                                    >
                                                        <PencilSimple color="#193dc0ff" />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={() => handleDelete(index)}
                                                        color='error'
                                                        disabled={editMode}
                                                    >
                                                        <XSquare />
                                                    </IconButton>
                                                </>
                                            )}
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
                <Button variant='contained' color='secondary' onClick={handleComplete} disabled={editMode}>
                    Xác nhận
                </Button>

                <Button variant='contained' color='success' onClick={handleUpdate} disabled={editMode}>
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