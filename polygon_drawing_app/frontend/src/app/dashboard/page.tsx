"use client";

import { useState, useEffect } from "react";
import { Container, Grid } from "@mui/material";
import CameraStatsCard from "@/components/dashboard/overview/CameraStatsCard";

export default function OverviewPage() {
  const [cameras, setCameras] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cameraIds = ["SN003", "SN004"];
        const fetchedData = await Promise.all(
          cameraIds.map(async (id) => {
            const response = await fetch(`http://localhost:5101/api/v1/tracking/overview-data/${id}`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const { data } = await response.json();

            const formattedData = {
              cameraName: id,
              zones: Object.entries(data).map(([name, counts]) => ({
                name,
                motorbikes: counts.number_of_motorbike,
                cars: counts.number_of_car,
              })),
              lastUpdated: new Date().toLocaleTimeString(),
            };
            return formattedData;
          })
        );
        
        setCameras(prevCameras => {
          // Tạo một bản sao của mảng cameras để thay đổi
          const nextCameras = [...prevCameras];
          
          fetchedData.forEach(newCamData => {
            const existingCamIndex = nextCameras.findIndex(cam => cam.cameraName === newCamData.cameraName);
            
            if (existingCamIndex !== -1) {
              // Cập nhật camera đã tồn tại
              const existingCam = nextCameras[existingCamIndex];
              const innerZone = newCamData.zones.find(z => z.name === "inner");
              const newChartPoint = {
                time: new Date().toLocaleTimeString().split(':').slice(0, 2).join(':'),
                motorbikes: innerZone?.motorbikes || 0,
                cars: innerZone?.cars || 0,
              };
              
              nextCameras[existingCamIndex] = {
                ...existingCam,
                zones: newCamData.zones,
                chartData: [...existingCam.chartData, newChartPoint],
                lastUpdated: newCamData.lastUpdated,
              };
            } else {
              // Thêm camera mới
              const innerZone = newCamData.zones.find(z => z.name === "inner");
              const initialChartPoint = {
                time: new Date().toLocaleTimeString().split(':').slice(0, 2).join(':'),
                motorbikes: innerZone?.motorbikes || 0,
                cars: innerZone?.cars || 0,
              };
              nextCameras.push({ ...newCamData, chartData: [initialChartPoint] });
            }
          });
          
          return nextCameras;
        });

      } catch (error) {
        console.error("Failed to fetch camera data:", error);
      }
    };

    // Gọi fetchData ban đầu khi component mount
    fetchData();

    // Thiết lập interval để fetch data mỗi 5 phút (300,000ms)
    // Lưu ý: Đã sửa lại thành 60 giây trong code của bạn, tôi sẽ giữ nguyên theo đó.
    const intervalId = setInterval(fetchData, 60000); 

    // Dọn dẹp interval khi component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Container maxWidth="lg" sx={{ pt: 2, pb: 4}}>
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