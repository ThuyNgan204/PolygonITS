'use client'; 
// Chạy component ở phía client (Next.js App Router yêu cầu directive này cho các component dùng state, effect, event)

// ===============================
// Import thư viện và component UI
// ===============================
import React, { useEffect, useState, useRef } from 'react'; // React và các hook cơ bản
import Button from '@mui/material/Button'; // Nút bấm MUI
import Card from '@mui/material/Card'; // Thẻ Card bố cục
import CardActions from '@mui/material/CardActions'; // Vùng chứa các nút cuối Card
import CardContent from '@mui/material/CardContent'; // Nội dung Card
import CardHeader from '@mui/material/CardHeader'; // Tiêu đề Card
import Divider from '@mui/material/Divider'; // Đường phân cách
import FormControl from '@mui/material/FormControl'; // Bao bọc input có label
import InputLabel from '@mui/material/InputLabel'; // Label cho Select
import MenuItem from '@mui/material/MenuItem'; // Item trong Select
import Select from '@mui/material/Select'; // Dropdown chọn thiết bị
import Typography from '@mui/material/Typography'; // Chữ
import Grid from '@mui/material/Unstable_Grid2'; // Grid layout (phiên bản Unstable Grid2)
import { Image, Layer, Line, Stage, Circle } from 'react-konva'; 
// Các thành phần canvas của Konva: Stage (canvas gốc), Layer (lớp), Image (vẽ ảnh), Line (đường/đa giác), Circle (điểm điều khiển)

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
    Alert,
    Checkbox // Lưu ý: import Checkbox nhưng trong code đang dùng <input type="checkbox"> thuần, chưa dùng MUI Checkbox
} from '@mui/material';
import { XSquare, PencilSimple, CheckCircle, Trash } from '@phosphor-icons/react'; 
// Icon từ phosphor

// ===============================
// Hằng số cấu hình và tiện ích màu sắc
// ===============================
const zoneFillColor = 'rgba(0, 0, 255, 0.05)'; // Màu fill trong suốt cho polygon khi render
const VALID_ZONE_NAMES = ['inner', 'outer']; // Tên hợp lệ được phép (ngoài các tên zoneX mặc định)

// Danh sách màu để tô viền/ô màu cho zone
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

// Lấy màu kế tiếp dựa trên số lượng zone hiện có (quay vòng theo mảng ZONE_COLORS)
const getNextColor = (zonesCount) => {
    return ZONE_COLORS[zonesCount % ZONE_COLORS.length];
};

// Gán màu cho toàn bộ danh sách zone theo index để đảm bảo màu ổn định khi thêm/bớt
const assignColors = (currentZones) => {
    return currentZones.map((zone, index) => ({
        ...zone,
        color: getNextColor(index)
    }));
};

// ===============================
// Hàm kiểm tra 1 điểm có nằm trong polygon (ray casting)
// polygon: mảng số dạng [x1, y1, x2, y2, ...]
// point: [x, y]
// Trả về true/false
// ===============================
function isPointInPolygon(point, polygon) {
    const [x, y] = point;
    let inside = false;

    // polygon.length/2 là số đỉnh; j là đỉnh trước đó, i là đỉnh hiện tại
    for (let i = 0, j = polygon.length / 2 - 1; i < polygon.length / 2; j = i++) {
        const xi = polygon[i * 2],     // x của đỉnh i
            yi = polygon[i * 2 + 1];   // y của đỉnh i
        const xj = polygon[j * 2],     // x của đỉnh j
            yj = polygon[j * 2 + 1];   // y của đỉnh j

        // Kiểm tra đoạn cắt và đảo trạng thái inside
        const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }
    return inside;
}

// ======================================================================
// Component vẽ 1 polygon với các chấm draggable khi đang chỉnh sửa
// - points: mảng tọa độ [x1,y1,x2,y2,...]
// - color: màu viền polygon
// - isEditing: có đang ở chế độ edit polygon này không (hiện chấm kéo)
// - onPointDrag: callback khi kéo 1 chấm
// - onPolygonClick: callback khi click polygon
// - onDragEnd: callback khi thả kéo
// - isThisPolygonBeingEdited: polygon này có phải polygon được chọn để edit không
// ======================================================================
const PolygonWithDraggablePoints = ({
    points,
    color,
    isEditing,
    onPointDrag,
    onPolygonClick,
    onDragEnd,
    isThisPolygonBeingEdited
}) => {
    const step = 20; // kích thước lưới tô (20px)
    const xs = points?.filter((_, i) => i % 2 === 0) || []; // tất cả x
    const ys = points?.filter((_, i) => i % 2 === 1) || []; // tất cả y
    const minX = Math.min(...xs); // x nhỏ nhất
    const maxX = Math.max(...xs); // x lớn nhất
    const minY = Math.min(...ys); // y nhỏ nhất
    const maxY = Math.max(...ys); // y lớn nhất

    // ======= Vẽ các đoạn kẻ dọc nằm bên trong polygon (tạo lưới) =======
    const verticalLines = [];
    if (points.length > 0) {
        for (let x = minX; x <= maxX; x += step) {
            const segments = []; // các đoạn liên tục theo trục dọc nằm trong polygon
            let segmentStart = null;
            for (let y = minY; y <= maxY; y++) {
                if (isPointInPolygon([x, y], points)) {
                    if (segmentStart === null) segmentStart = y; // bắt đầu 1 đoạn
                } else {
                    if (segmentStart !== null) {
                        segments.push([segmentStart, y - 1]); // kết thúc đoạn (y-1)
                        segmentStart = null;
                    }
                }
            }
            if (segmentStart !== null) segments.push([segmentStart, maxY]); // khép đoạn cuối

            // Tạo Line cho từng đoạn dọc
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

    // ======= Vẽ các đoạn kẻ ngang nằm bên trong polygon (tạo lưới) =======
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

    // Chỉ gán onPolygonClick khi polygon này đang là polygon được edit
    const onPolygonClickHandler = isThisPolygonBeingEdited ? onPolygonClick : undefined;

    return (
        <React.Fragment>
            {/* Vẽ lưới bên trong polygon */}
            {verticalLines}
            {horizontalLines}

            {/* Vẽ polygon (Line closed) */}
            {points.length > 0 && (
                <Line
                    points={points}                 // danh sách tọa độ
                    stroke={color}                  // màu viền
                    strokeWidth={isThisPolygonBeingEdited ? 4 : 2} // dày hơn khi đang edit
                    closed                          // khép kín thành đa giác
                    fill={zoneFillColor}            // màu fill trong suốt
                    onMouseDown={onPolygonClickHandler} // click polygon
                />
            )}
            
            {/* Nếu đang edit polygon => vẽ các chấm draggable tại mỗi đỉnh */}
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
                            draggable                       // cho phép kéo
                            onDragMove={(e) => onPointDrag(index, e)} // cập nhật tọa độ khi kéo
                            onDragEnd={onDragEnd}           // callback khi thả chuột
                        />
                    );
                }
                return null;
            })}
        </React.Fragment>
    );
};

// ======================================================================
// Component chính: PolygonDetailsForm
// Quản lý:
// - Chọn camera, tải ảnh nền và dữ liệu polygon của camera đó
// - Vẽ polygon mới bằng cách click các điểm
// - Edit polygon: đổi tên, kéo điểm, thêm điểm, xóa điểm bằng phím Delete
// - Bảng kết quả: có checkbox để chọn nhiều dòng và xóa hàng loạt
// - Lưu dữ liệu về server qua API
// ======================================================================
export function PolygonDetailsForm() {
    // ====== State cho ảnh nền và thao tác vẽ trên canvas ======
    const [image, setImage] = useState(null);               // Ảnh nền (frame hiện tại của camera)
    const [currentPoints, setCurrentPoints] = useState([]); // Tọa độ tạm thời khi vẽ polygon mới (chưa xác nhận)
    const [mousePosition, setMousePosition] = useState(null); // Vị trí chuột hiện tại (để vẽ đường preview)

    // ====== State chọn camera và danh sách camera ======
    const [selectedCameraSN, setSelectedCameraSN] = useState(''); // Serial number camera được chọn
    const [cameras, setCameras] = useState([]);                    // Danh sách camera từ API

    // ====== Zone & chỉnh sửa ======
    const [zones, setZones] = useState([]);            // Danh sách zone: [{name, points, color}, ...]
    const [editIndex, setEditIndex] = useState(null);  // Index đang edit tên trong bảng (ô input)
    const [tempName, setTempName] = useState('');      // Tên tạm khi sửa
    const stageRef = useRef(null);                     // Tham chiếu Stage (Konva)
    const [notification, setNotification] = useState({ // Snackbar thông báo
        open: false,
        message: '',
        type: 'success'
    });
    const [originalName, setOriginalName] = useState(''); // Lưu tên ban đầu trước khi sửa (để so sánh)
    const [nameError, setNameError] = useState(false);    // Trạng thái lỗi tên

    const [editMode, setEditMode] = useState(false);          // Đang ở chế độ edit polygon (kéo điểm, thêm điểm)
    const [originalZones, setOriginalZones] = useState([]);   // Sao lưu zones gốc (phục hồi khi cancel)
    const [originalEditState, setOriginalEditState] = useState(null); // Sao lưu {name, points} của polygon đang edit
    const [selectedPolygonIndex, setSelectedPolygonIndex] = useState(null); // Polygon nào đang được chọn để edit
    const [selectedIndices, setSelectedIndices] = useState(new Set());      // Tập index chọn ở bảng (checkbox)

    // =========================
    // Lần đầu vào: tải danh sách camera
    // =========================
    useEffect(() => {
        fetchData();
    }, []);

    // ============================================
    // Khi đổi camera: tải ảnh nền & dữ liệu polygon
    // ============================================
    useEffect(() => {
        if (!selectedCameraSN) {
            // Chưa chọn camera -> reset trạng thái
            setImage(null);
            setZones([]);
            setOriginalZones([]);
            return;
        }

        let isMounted = true; // Cờ tránh setState sau khi unmount

        async function fetchCameraData() {
            try {
                // Gọi API lấy frame mới nhất của camera -> blob ảnh
                const response = await fetch(
                    `http://localhost:5101/api/v1/tracking/latest-frame/${selectedCameraSN}`
                );
                if (!response.ok) throw new Error('Failed to fetch latest frame');
                const blob = await response.blob();

                // Tạo đối tượng Image từ blob để vẽ lên Konva
                const img = new window.Image();
                img.onload = () => {
                    if (isMounted) setImage(img);
                    URL.revokeObjectURL(img.src); // giải phóng URL blob
                };
                img.src = URL.createObjectURL(blob);

                // Gọi API lấy polygon đã lưu của camera
                const polyResp = await fetch(
                    `http://localhost:5101/api/v1/camera/${selectedCameraSN}`
                );
                if (!polyResp.ok) throw new Error('Failed to fetch polygons');
                const polyData = await polyResp.json();

                if (isMounted) {
                    // Chuyển dữ liệu API về format [{name, points, color}]
                    const formattedZones = (polyData.points || []).map(
                        (zoneObj, index) => {
                            const name = Object.keys(zoneObj)[0];    // tên zone là key
                            const points = zoneObj[name];            // mảng tọa độ
                            return { name, points, color: getNextColor(index) };
                        }
                    );
                    setZones(formattedZones);          // set vào UI
                    setOriginalZones(formattedZones);  // lưu bản gốc để có thể hoàn tác
                }
            } catch (error) {
                console.error(error);
                if (isMounted) {
                    // Lỗi -> reset dữ liệu
                    setImage(null);
                    setZones([]);
                    setOriginalZones([]);
                }
            }
        }

        fetchCameraData();

        // cleanup: không setState nếu component đã unmount
        return () => {
            isMounted = false;
        };
    }, [selectedCameraSN]);

    // ===========================================================
    // Lắng nghe phím Delete khi đang edit polygon -> xóa toàn bộ điểm polygon đó
    // ===========================================================
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (editMode && selectedPolygonIndex !== null) {
                if ( e.key === 'Delete') {
                    const updatedZones = [...zones];
                    updatedZones[selectedPolygonIndex].points = []; // Xóa hết điểm của polygon đang edit
                    setZones(updatedZones);
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [editMode, selectedPolygonIndex, zones]);

    // =========================
    // Gọi API lấy danh sách camera
    // =========================
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

    // ==================================================
    // Click trên Stage: 
    // - Nếu editMode + đã chọn polygon => thêm điểm vào polygon đó
    // - Ngược lại => đang vẽ polygon mới (thêm điểm vào currentPoints)
    // ==================================================
    const handleClick = (event) => {
        const stage = event.target.getStage();
        if (!stage) return;
        const point = stage.getPointerPosition();

        if (point) {
            const roundedX = Math.round(point.x); // làm tròn tọa độ
            const roundedY = Math.round(point.y);

            if (editMode && selectedPolygonIndex !== null) {
                const updatedZones = [...zones];
                updatedZones[selectedPolygonIndex].points = [
                  ...updatedZones[selectedPolygonIndex].points, 
                  roundedX, 
                  roundedY
                ]; // chèn thêm cặp (x,y)
                setZones(updatedZones);
            } else if (!editMode) {
                setCurrentPoints([...currentPoints, roundedX, roundedY]); // thêm vào chuỗi điểm đang vẽ
            }
        }
    };

    // ======================
    // Cập nhật vị trí chuột
    // ======================
    const handleMouseMove = (event) => {
        const stage = event.target.getStage();
        const pos = stage?.getPointerPosition();
        setMousePosition(pos);
    };

    // ==========================================================
    // Xác nhận polygon mới:
    // - Chỉ chấp nhận khi có > 5 số (tức >= 3 điểm: 3 cặp x,y => 6 số)
    // - Tạo name zoneX, gán màu tự động, clear currentPoints
    // ==========================================================
    const handleComplete = () => {
        if (currentPoints.length > 5) {
            const newZoneName = `zone${zones.length}`; // tên mặc định: zone{n}
            const newZone = {
                name: newZoneName,
                points: currentPoints
            };
            const updatedZones = [...zones, newZone];
            setZones(assignColors(updatedZones)); // gán lại màu đều theo index
            setCurrentPoints([]);                 // reset chuỗi điểm tạm
        }
    };

    // ====================================
    // Lưu dữ liệu polygon về server (PUT)
    // ====================================
    const handleUpdate = async () => {
        const url = `http://localhost:5101/api/v1/camera/${selectedCameraSN}`;
        // Chuyển [{name, points}] thành [{ name: points }]
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
            setOriginalZones(zones); // cập nhật "bản gốc" sau khi lưu thành công (để cancel sau này khôi phục đúng)
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

    // ===============================
    // Đóng Snackbar thông báo
    // ===============================
    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setNotification({ ...notification, open: false });
    };

    // ===============================
    // Thay đổi thiết bị (camera)
    // ===============================
    const handleDeviceChange = (e) => {
        setSelectedCameraSN(e.target.value);
    };

    // ============================================================
    // Xóa 1 zone theo index:
    // - Lọc bỏ index đó, gán màu lại
    // - Đồng bộ selectedIndices (tập checkbox) để không bị lệch sau khi xóa
    // - Reset các trạng thái edit
    // ============================================================
    const handleDelete = (index) => {
        const updatedZones = zones.filter((_, i) => i !== index); // loại bỏ item index
        const finalZones = assignColors(updatedZones);            // gán lại màu theo index mới
        
        setZones(finalZones);            // cập nhật danh sách zone
        setOriginalZones(finalZones);    // ghi đè bản gốc (theo logic hiện tại của bạn)

        // Cập nhật lại tập checkbox đang chọn để khớp index mới
        setSelectedIndices((prev) => {
            const newSet = new Set<number>();
            prev.forEach((i) => {
                if (i < index) newSet.add(i);     // các index nhỏ hơn giữ nguyên
                else if (i > index) newSet.add(i - 1); // các index lớn hơn giảm 1 (do mảng thu lại)
                // nếu i === index (vừa bị xóa) thì bỏ qua
            });
            return newSet;
        });
        
        // Reset trạng thái edit
        setEditMode(false);
        setEditIndex(null);
        setSelectedPolygonIndex(null);
        setCurrentPoints([]);
    };

    // ============================================================
    // Xóa hàng loạt theo các checkbox được chọn trong selectedIndices
    // - Lọc bỏ các index được chọn
    // - Gán màu mới
    // - Xóa sạch selectedIndices
    // - Nếu đang edit polygon mà polygon đó cũng bị xóa -> thoát edit mode
    // ============================================================
    const handleBulkDelete = () => {
        if (selectedIndices.size === 0) return;

        const updatedZones = zones.filter((_, index) => !selectedIndices.has(index)); // loại bỏ các index đã tick
        
        const finalZones = assignColors(updatedZones); // gán lại màu
        
        setZones(finalZones);
        setOriginalZones(finalZones);
        setSelectedIndices(new Set()); // clear chọn

        // Nếu đang edit và polygon đang edit bị xóa -> thoát edit
        if (editMode && selectedPolygonIndex !== null) {
            if (selectedIndices.has(selectedPolygonIndex)) {
                setEditMode(false);
                setEditIndex(null);
                setSelectedPolygonIndex(null);
            }
        }
    };

    // =============================================
    // Bắt đầu edit 1 polygon (theo index)
    // - Bật editMode
    // - Lưu lại trạng thái gốc để có thể cancel
    // =============================================
    const handleEdit = (index) => {
        setEditMode(true);
        setEditIndex(index);
        setSelectedPolygonIndex(index);
        setTempName(zones[index].name);  // điền tên hiện tại vào input
        setOriginalName(zones[index].name);
        setNameError(false);
        
        setOriginalEditState({
            name: zones[index].name,
            points: [...zones[index].points] // copy mảng điểm
        });
    };

    // ======================================================
    // Lưu tên mới cho polygon đang edit
    // - Hợp lệ: 'inner' | 'outer' | giữ nguyên tên cũ nếu tên cũ là 'zoneX'
    // - Không được trùng tên với polygon khác
    // ======================================================
    const handleSaveEdit = () => {
        const newName = tempName.trim().toLowerCase(); // chuẩn hóa tên

        // Validate tên
        if (!VALID_ZONE_NAMES.includes(newName)) {
            // Cho phép giữ nguyên tên cũ nếu tên cũ là 'zoneX' (không bắt buộc đổi thành inner/outer)
            if (newName === originalName && originalName.startsWith('zone')) {
                // pass
            } else {
                 setNotification({ open: true, message: 'Tên zone phải là "inner" hoặc "outer".', type: 'error' });
                 setNameError(true);
                 return;
            }
        }
        
        // Nếu không đổi tên -> thoát edit
        if (newName === originalName) {
            setEditMode(false);
            setEditIndex(null);
            setSelectedPolygonIndex(null);
            setTempName('');
            setNameError(false);
            return;
        }

        // Không cho trùng tên với polygon khác
        const isNameDuplicate = zones.some((zone, i) =>
            i !== editIndex && zone.name.toLowerCase() === newName
        );

        if (isNameDuplicate) {
            setNotification({ open: true, message: 'Tên zone đã tồn tại. Vui lòng chọn tên khác.', type: 'error' });
            setNameError(true);
            return;
        }

        // Áp dụng tên mới
        const updatedZones = [...zones];
        updatedZones[editIndex] = { ...updatedZones[editIndex], name: newName };
        setZones(updatedZones);

        // Thoát edit
        setEditMode(false);
        setEditIndex(null);
        setSelectedPolygonIndex(null);
        setTempName('');
        setNameError(false);
    };

    // ====================================================
    // Hủy edit:
    // - Nếu có bản sao lưu originalEditState => khôi phục polygon đó
    // - Ngược lại => khôi phục toàn bộ danh sách zones về originalZones
    // ====================================================
    const handleCancelEdit = () => {
        if (originalEditState && selectedPolygonIndex !== null) {
            const updatedZones = [...zones];
            
            updatedZones[selectedPolygonIndex] = { 
                ...updatedZones[selectedPolygonIndex],
                name: originalEditState.name,
                points: originalEditState.points 
            };
            
            setZones(updatedZones);
        } else {
            setZones(originalZones);
        }

        // Thoát edit + dọn dẹp
        setEditMode(false);
        setEditIndex(null);
        setSelectedPolygonIndex(null);
        setTempName('');
        setOriginalEditState(null);
    };

    // =====================================================
    // Click vào tên zone trong bảng để chuyển sang mode sửa tên
    // (chỉ khi polygon đó đang là polygon được chọn để edit)
    // =====================================================
    const handleNameClick = (index) => {
        if (selectedPolygonIndex !== index || !editMode) return;
        
        setEditIndex(index);
        const currentName = zones[index].name || '';
        setTempName(currentName);
        setOriginalName(currentName);
        setNameError(false);
    };

    // Cập nhật text input tên tạm
    const handleNameChange = (e) => {
        setTempName(e.target.value);
        setNameError(false);
    };

    // Mất focus khỏi input tên -> thoát ô input (nhưng chưa lưu)
    const handleNameBlur = () => {
        setEditIndex(null);
    };

    // Nhấn Enter khi đang nhập tên -> lưu
    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter' && editIndex !== null) {
            handleSaveEdit();
        }
    };

    // ==========================================================
    // Kéo 1 chấm (đỉnh) của polygon đang edit:
    // - pointIndex là index trong mảng points (chẵn là x, lẻ là y)
    // - Cập nhật tọa độ gần nhất (Math.round)
    // ==========================================================
    const handlePointDrag = (pointIndex, e) => {
        if (editMode && selectedPolygonIndex !== null) {
            const newPoints = [...zones[selectedPolygonIndex].points];
            newPoints[pointIndex] = Math.round(e.target.x());
            newPoints[pointIndex + 1] = Math.round(e.target.y());
            const updatedZones = [...zones];
            updatedZones[selectedPolygonIndex].points = newPoints;
            setZones(updatedZones);
        }
    };
    
    // Click polygon (khi đang edit polygon đó) -> chỉ định polygon đang làm việc
    const handlePolygonClick = (e, index) => {
        if (editMode && selectedPolygonIndex === index) {
            setSelectedPolygonIndex(index);
        }
    };
    
    // ==========================================================
    // Checkbox từng dòng trong bảng:
    // - Bật/tắt index trong tập selectedIndices (Set)
    // ==========================================================
    const handleCheckboxChange = (index, isChecked) => {
        const newSelectedIndices = new Set(selectedIndices);
        if (isChecked) {
            newSelectedIndices.add(index);
        } else {
            newSelectedIndices.delete(index);
        }
        setSelectedIndices(newSelectedIndices);
    };

    // ==========================================================
    // Checkbox "chọn tất cả":
    // - Nếu check: thêm toàn bộ index vào Set
    // - Nếu uncheck: clear Set
    // ==========================================================
    const handleSelectAllChange = (event) => {
        if (event.target.checked) {
            const allIndices = new Set(zones.map((_, index) => index));
            setSelectedIndices(allIndices);
        } else {
            setSelectedIndices(new Set());
        }
    };

    // ===============================
    // Render UI
    // ===============================
    return (
        <Card>
            <CardHeader title='Polygon' /> {/* Tiêu đề card */}
            <Divider /> {/* Đường kẻ */}

            <CardContent>
                {/* Chọn thiết bị camera */}
                <Grid container md={6} xs={12}>
                    <FormControl fullWidth>
                        <InputLabel>Thiết bị</InputLabel>
                        <Select
                            value={selectedCameraSN}
                            onChange={handleDeviceChange}
                            label='Thiết bị'
                            variant='outlined'
                            disabled={editMode} // đang edit thì không cho đổi camera
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

                {/* Khu vực vẽ Konva */}
                <Grid container spacing={3} sx={{ mt: 2 }}>
                    <Grid md={6} xs={12}>
                        <Stage
                            width={1200}               // kích thước canvas
                            height={800}
                            onClick={handleClick}      // click để thêm điểm
                            onMouseMove={handleMouseMove} // để vẽ preview đường
                            ref={stageRef}
                        >
                            <Layer>
                                {/* Vẽ ảnh nền nếu có */}
                                {image && (
                                    <Image image={image} x={0} y={0} width={1200} height={800} />
                                )}

                                {/* Vẽ tất cả polygon từ zones */}
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
                                            onDragEnd={() => {}} // không xử lý gì thêm khi thả chuột
                                            isThisPolygonBeingEdited={isThisPolygonBeingEdited}
                                        />
                                    );
                                })}
                                
                                {/* Nếu không ở editMode, đang vẽ polygon mới: 
                                    vẽ đường preview nối đến vị trí chuột hiện tại */}
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

            {/* Bảng kết quả liệt kê zones */}
            <CardContent>
                <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
                    Kết quả
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {/* Checkbox chọn tất cả */}
                                <TableCell sx={{ width: '1%' }}>
                                    <input
                                        type="checkbox"
                                        checked={zones.length > 0 && selectedIndices.size === zones.length}
                                        onChange={handleSelectAllChange}
                                        disabled={zones.length === 0 || editMode}
                                    />
                                </TableCell>
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
                                const isEditing = editIndex === index; // ô tên có đang bật input không

                                return (
                                    <TableRow key={index}>
                                        {/* Checkbox từng dòng */}
                                        <TableCell sx={{ width: '1%' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIndices.has(index)}
                                                onChange={(e) => handleCheckboxChange(index, e.target.checked)}
                                                disabled={editMode}
                                            />
                                        </TableCell>

                                        {/* Cột tên zone: click để sửa nếu đang edit polygon này */}
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
                                                // Input sửa tên (inline)
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
                                                // Hiển thị tên (click để chuyển qua edit nếu polygon này đang được chọn)
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

                                        {/* Ô màu xem nhanh màu của zone */}
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

                                        {/* In toàn bộ mảng điểm */}
                                        <TableCell>{points?.join(', ')}</TableCell>

                                        {/* Cột hành động: 
                                            - Nếu polygon này đang edit -> hiện nút save/cancel 
                                            - Ngược lại -> hiện nút edit/delete */}
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

            {/* Hàng nút hành động tổng */}
            <CardActions sx={{ justifyContent: 'space-between' }}>
                {/* Xác nhận polygon mới (khi đang vẽ) */}
                <Button variant='contained' color='secondary' onClick={handleComplete} disabled={editMode}>
                    Xác nhận
                </Button>

                {/* Nút xóa hàng loạt xuất hiện khi có chọn checkbox và không ở editMode */}
                {selectedIndices.size > 0 && !editMode && (
                    <Button 
                        variant='contained' 
                        color='error' 
                        onClick={handleBulkDelete}
                    >
                        Xóa ({selectedIndices.size})
                    </Button>
                )}

                {/* Lưu dữ liệu về server */}
                <Button variant='contained' color='success' onClick={handleUpdate} disabled={editMode}>
                    Lưu
                </Button>
            </CardActions>

            {/* Snackbar thông báo thành công/thất bại */}
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
