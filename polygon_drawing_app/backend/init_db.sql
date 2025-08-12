CREATE TABLE camera (
    id uuid PRIMARY KEY,
    serial_number VARCHAR(50),
    name TEXT NOT NULL,
    points JSONB
);

-- ✅ Cập nhật dữ liệu INSERT theo cấu trúc mới
INSERT INTO camera (id, serial_number, name, points)
VALUES (
    'a4251b14-70bc-4513-8475-86f5baf5ba5c',
    'SN003',
    'NguyenOanh-PhanVanTri-01',
    '[{"zone0": [366, 299, 446, 370, 6, 574, 3, 436]}, {"zone1": [600, 212, 762, 217, 697, 275, 549, 230]}]'::jsonb
);
INSERT INTO camera (id, serial_number, name, points)
VALUES (
    '106cf7d9-398f-40c9-9c18-7e9b9669df8a',
    'SN004',
    'NguyenOanh-PhanVanTri-02',
    '[{"zone0": [679, 202, 919, 185, 942, 298, 640, 288]}, {"zone1": [509, 194, 647, 192, 582, 288, 417, 235]}]'::jsonb
);