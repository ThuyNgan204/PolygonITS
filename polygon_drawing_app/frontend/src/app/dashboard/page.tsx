"use client";

import { useState, useEffect } from "react";
import { Container, Grid } from "@mui/material";
import CameraStatsCard from "@/components/dashboard/overview/CameraStatsCard";

export default function OverviewPage() {
    const [cameras, setCameras] = useState([]);

    useEffect(() => {
        const cameraIds = ["SN003", "SN004"];

        const fetchData = async () => {
            try {
                const fetchedData = await Promise.all(
                    cameraIds.map(async (id) => {
                        // Send POST require to update and get data of BE
                        const response = await fetch('http://localhost:5101/api/v1/tracking/update-and-get-overview', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ cameraId: id })
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const { overviewData, chartData } = await response.json();

                        const zones = Object.entries(overviewData).map(([name, counts]) => ({
                            name,
                            motorbikes: counts.number_of_motorbike,
                            cars: counts.number_of_car,
                        }));
                        
                        return {
                            cameraName: id,
                            zones: zones,
                            chartData: chartData,
                            lastUpdated: new Date().toLocaleTimeString(),
                        };
                    })
                );
                setCameras(fetchedData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };

        // Get data when load page
        fetchData();
        // Update data every 60 seconds
        const intervalId = setInterval(fetchData, 60000); 

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