import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

const zoneLabels: { [key: string]: string } = {
  Inner: "Làn xe máy",
  Outer: "Làn xe hơi",
  // add more mappings here if needed
};

interface ZoneCounts {
  number_of_motorbike: number;
  number_of_car: number;
}

interface VehicleData {
  [zone: string]: ZoneCounts;
}

export function VehicleDataPanel({ cameraId }: { cameraId: string }) {
  // <-- Specify the state type explicitly here
  const [vehicleData, setVehicleData] = useState<VehicleData>({});

  useEffect(() => {
    if (!cameraId) return;

    const eventSource = new EventSource(
      `http://localhost:5101/api/v1/tracking/vehicle-data-stream/${cameraId}`
    );

    eventSource.onmessage = (event) => {
      try {
        // Parse event data and assert its type as VehicleData
        const data: VehicleData = JSON.parse(event.data);
        setVehicleData(data);
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [cameraId]);

  if (!vehicleData || Object.keys(vehicleData).length === 0) {
    return <Typography>Chưa có dữ liệu tracking.</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Dữ liệu Real-time cho {cameraId}
      </Typography>
      {Object.entries(vehicleData).map(([zone, counts]) => (
        <Box
          key={zone}
          sx={{ border: 1, borderColor: "grey.300", p: 2, mb: 2, borderRadius: 1 }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Zone: {zoneLabels[zone] || zone}
          </Typography>
          <Typography variant="body2">
            Motorbikes: <strong>{counts.number_of_motorbike}</strong>
          </Typography>
          <Typography variant="body2">
            Cars: <strong>{counts.number_of_car}</strong>
          </Typography>
        </Box>
      ))}
    </Box>
  );
}