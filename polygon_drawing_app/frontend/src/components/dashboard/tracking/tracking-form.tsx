'use client';

import React, { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { IframeWithImageAndPolygons } from './iframe_image_polygon';
import { VehicleDataPanel } from './vehicle_data_panel';

interface ZoneData {
  zone: string;
  total_vehicle: number;
  density?: number;
  state?: string;
  vehicles?: any[];
  class_counts?: Record<string, number>;
}

interface VideoOption {
  name: string;
  serial_number: string;
  video_path: string;
}


const STREAM_WIDTH = 1200;
const STREAM_HEIGHT = 800;

export function TrackingForm(): React.JSX.Element {
  const [selectedVideo, setSelectedVideo] = useState('');
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [trackingData, setTrackingData] = useState<ZoneData[]>([]);
  const [liveCount, setLiveCount] = useState<ZoneData | null>(null);
  //const [polygonData, setPolygonData] = useState<number[][]>([]);
  const [polygonData, setPolygonData] = useState<Array<Record<string, number[]>>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: STREAM_WIDTH, height: STREAM_HEIGHT });

  // Fetch cameras
  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch('http://localhost:5101/api/v1/camera');
        if (!response.ok) throw new Error('Failed to fetch cameras');
        const data = await response.json();

        const options: VideoOption[] = Array.isArray(data)
          ? data
              .filter(
                (cam: any): cam is VideoOption =>
                  cam &&
                  typeof cam === 'object' &&
                  'name' in cam &&
                  'serial_number' in cam
              )
              .map((cam: any) => ({
                name: cam.name,
                serial_number: cam.serial_number,
                video_path: cam.video_path ?? cam.name,
              }))
          : [];

        setVideos(options);
      } catch (error) {
        console.error('Error fetching cameras:', error);
      }
    }
    fetchVideos();
  }, []);

  // Fetch polygons when video changes
  useEffect(() => {
    if (!selectedVideo) {
      setPolygonData([]);
      return;
    }
    async function fetchPolygons() {
      try {
        const response = await fetch(`http://localhost:5101/api/v1/camera/${selectedVideo}`);
        if (!response.ok) throw new Error('Failed to fetch polygon data');
        const data = await response.json();

        setPolygonData(data?.points ?? []);
      } catch (error) {
        setPolygonData([]);
      }
    }
    fetchPolygons();
  }, [selectedVideo]);

  // Use ResizeObserver to track container size changes if needed
  useEffect(() => {
    if (!stageContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setStageSize({ width, height });
      }
    });
    observer.observe(stageContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const colors = [
  '#0d21f9ff',
  '#FFC107',
  '#FF5722',
  '#26982aff',
  '#E91E63',
  '#9C27B0',
  '#07649eff',
  '#f83bffff',
  '#61453aff',
  '#36454cff']; 

  const polygonsWithColors = polygonData.flatMap((item) => Object.values(item))
    .filter(points => points && Array.isArray(points)) // Lọc bỏ các giá trị không hợp lệ
    .map((points, index) => {
      let strPoints = '';
      for (let i = 0; i < points.length; i += 2) {
        strPoints += `${points[i]},${points[i + 1]} `;
      }
      const color = colors[index % colors.length]; 
      return { points: strPoints.trim(), color };
    });

  // Video select change handler
  const handleVideoChange = (event: SelectChangeEvent<string>) => {
    setSelectedVideo(event.target.value);
    setTrackingData([]);
    setLiveCount(null);
    setPolygonData([]);
    setIsProcessing(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  return (
    <Card>
      <CardHeader title="Video Tracking" />
      <Divider />

      <CardContent>
        <Grid container spacing={2}>
          <Grid xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Chọn Video</InputLabel>
              <Select value={selectedVideo} onChange={handleVideoChange} label="Chọn Video" variant="outlined">
                {videos.map((video) => (
                  <MenuItem key={video.serial_number} value={video.serial_number}>
                    {video.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>

      <CardContent>
        <Grid container spacing={2}>
          <Grid xs={12} md={6}>
            {selectedVideo ? (
              <Box sx={{
                position: 'relative',
                width: '100%',
                paddingTop: `${(STREAM_HEIGHT / STREAM_WIDTH) * 100}%`, // e.g. 66.67% for 1200x800
                border: '1px solid transparent', // optional for debug
                overflow: 'hidden',
              }}>
                  <IframeWithImageAndPolygons 
                  imgSrc={`http://localhost:5101/api/v1/tracking/stream-rtsp/${selectedVideo}`} 
                  polygons={polygonsWithColors}
                  streamWidth={STREAM_WIDTH}
                  streamHeight={STREAM_HEIGHT}
/>
              </Box>
            ) : (
              <Typography>Vui lòng chọn video để bắt đầu.</Typography>
            )}
          </Grid>

          <Grid xs={12} md={6}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Dữ liệu Tracking
              </Typography>

              <Box mt={2}>
                <VehicleDataPanel cameraId={selectedVideo}/>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}