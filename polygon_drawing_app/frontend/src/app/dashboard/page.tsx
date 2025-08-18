"use client";

import { useState, useEffect } from "react";
import { Container, Grid } from "@mui/material";
import CameraStatsCard from "@/components/dashboard/overview/CameraStatsCard";

export default function OverviewPage() {
    const [cameras, setCameras] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const cameraIds = ["SN003", "SN004"];
                const fetchedInitialData = await Promise.all(
                    cameraIds.map(async (id) => {
                        // 1. Lấy dữ liệu lịch sử biểu đồ
                        const chartResponse = await fetch(`http://localhost:5101/api/v1/tracking/chart-history/${id}`);
                        const { chartData } = await chartResponse.json();

                        // 2. Lấy dữ liệu thống kê hiện tại
                        const overviewResponse = await fetch(`http://localhost:5101/api/v1/tracking/overview-data/${id}`);
                        const { data } = await overviewResponse.json();
                        const zones = Object.entries(data).map(([name, counts]) => ({
                            name,
                            motorbikes: counts.number_of_motorbike,
                            cars: counts.number_of_car,
                        }));
                        
                        // 3. Tạo điểm dữ liệu mới từ dữ liệu hiện tại
                        const totalMotorbikes = zones.reduce((sum, z) => sum + z.motorbikes, 0);
                        const totalCars = zones.reduce((sum, z) => sum + z.cars, 0);
                        const newChartPoint = {
                            time: new Date().toLocaleTimeString().split(':').slice(0, 2).join(':'),
                            motorbikes: totalMotorbikes,
                            cars: totalCars,
                        };

                        // 4. Kết hợp dữ liệu lịch sử và điểm dữ liệu mới
                        const combinedChartData = [...chartData, newChartPoint];

                        return {
                            cameraName: id,
                            zones: zones,
                            chartData: combinedChartData,
                            lastUpdated: new Date().toLocaleTimeString(),
                        };
                    })
                );
                setCameras(fetchedInitialData);
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            }
        };

        const fetchPeriodicData = async () => {
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
                    const nextCameras = [...prevCameras];
                    fetchedData.forEach(newCamData => {
                        const existingCamIndex = nextCameras.findIndex(cam => cam.cameraName === newCamData.cameraName);
                        
                        const totalMotorbikes = newCamData.zones.reduce((sum, z) => sum + z.motorbikes, 0);
                        const totalCars = newCamData.zones.reduce((sum, z) => sum + z.cars, 0);
                        
                        const newChartPoint = {
                            time: new Date().toLocaleTimeString().split(':').slice(0, 2).join(':'),
                            motorbikes: totalMotorbikes,
                            cars: totalCars,
                        };
                        
                        if (existingCamIndex !== -1) {
                            const existingCam = nextCameras[existingCamIndex];
                            nextCameras[existingCamIndex] = {
                                ...existingCam,
                                zones: newCamData.zones,
                                chartData: [...existingCam.chartData, newChartPoint],
                                lastUpdated: newCamData.lastUpdated,
                            };
                        } else {
                            nextCameras.push({ ...newCamData, chartData: [newChartPoint] });
                        }
                    });
                    
                    return nextCameras;
                });
                
            } catch (error) {
                console.error("Failed to fetch periodic data:", error);
            }
        };

        fetchInitialData();

        const intervalId = setInterval(fetchPeriodicData, 60000); 

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