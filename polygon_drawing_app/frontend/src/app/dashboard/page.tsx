"use client";

import { Container, Typography, Grid } from "@mui/material";
import CameraStatsCard from "@/components/dashboard/overview/CameraStatsCard";

export default function OverviewPage() {
  // Mock data - sau này thay bằng API call
  const cameras = [
    {
      cameraName: "NguyenOanh-PhanVanTri-01",
      zones: [
        { name: "Inner", motorbikes: 36, cars: 17 },
        { name: "Outer", motorbikes: 27, cars: 23 },
      ],
      chartData: [
        { time: "07:00", motorbikes: 20, cars: 10 },
        { time: "07:10", motorbikes: 25, cars: 12 },
        { time: "07:20", motorbikes: 30, cars: 15 },
        { time: "07:30", motorbikes: 36, cars: 17 },
      ],
      lastUpdated: "10:00 AM",
    },
    {
      cameraName: "NguyenOanh-PhanVanTri-02",
      zones: [
        { name: "Inner", motorbikes: 42, cars: 19 },
        { name: "Outer", motorbikes: 30, cars: 25 },
      ],
      chartData: [
        { time: "07:00", motorbikes: 28, cars: 14 },
        { time: "07:10", motorbikes: 32, cars: 16 },
        { time: "07:20", motorbikes: 38, cars: 18 },
        { time: "07:30", motorbikes: 42, cars: 19 },
      ],
      lastUpdated: "10:00 AM",
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ pt: 2, pb: 4}}>
      {/* <Typography variant="h4" gutterBottom>
        Overview - Camera Statistics
      </Typography> */}
      <Grid container spacing={4}>
        {cameras.map((cam, idx) => (
          <Grid item xs={12} md={6} key={idx}>
            <CameraStatsCard
              cameraName={cam.cameraName}
              zones={cam.zones}
              chartData={cam.chartData}
              lastUpdated={cam.lastUpdated}
            />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

