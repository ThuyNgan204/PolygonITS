CREATE TABLE camera (
    id uuid PRIMARY KEY,
    serial_number VARCHAR(50),
    name TEXT NOT NULL,
    points JSONB NOT NULL
);

INSERT INTO camera (id, serial_number, name, points)
VALUES ('04dfb5ed-1bf8-477e-bd4a-00d637f4cdd7', 'MCT-2.1', 'Mai Chí Thọ - Nguyễn Cơ Thạch - 1', '[]'::jsonb);
INSERT INTO camera (id, serial_number, name, points)
VALUES ('a7891234-7136-44f4-8db8-95267137334b', 'MCT-2.2', 'Mai Chí Thọ - Nguyễn Cơ Thạch - 2', '[]'::jsonb);