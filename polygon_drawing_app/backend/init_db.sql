CREATE TABLE camera (
    id uuid PRIMARY KEY,
    serial_number VARCHAR(50),
    name TEXT NOT NULL,
    points JSONB NOT NULL
);


INSERT INTO camera (id, serial_number, name, points)
VALUES ('a4251b14-70bc-4513-8475-86f5baf5ba5c','SN003', 'NguyenOanh-PhanVanTri-01', '[366, 299,446, 370,6, 574,3, 436], [600, 212,762, 217,697, 275,549, 230]]'::jsonb);
INSERT INTO camera (id, serial_number, name, points)
VALUES ('106cf7d9-398f-40c9-9c18-7e9b9669df8a','SN004', 'NguyenOanh-PhanVanTri-02', '[[679, 202,919, 185,942, 298,640, 288], [509, 194,647, 192,582, 288,417, 235]]'::jsonb);