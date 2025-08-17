"use client";

import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Grid,
  Box,
  useTheme,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface ZoneData {
  name: string;
  motorbikes: number;
  cars: number;
}

interface ChartData {
  time: string;
  motorbikes: number;
  cars: number;
}

interface CameraStatsCardProps {
  cameraName: string;
  zones: ZoneData[];
  chartData: ChartData[];
  lastUpdated?: string;
}

export default function CameraStatsCard({
  cameraName,
  zones,
  chartData,
  lastUpdated,
}: CameraStatsCardProps) {
  const theme = useTheme();

  // Tính tổng cho camera
  const totalMotor = zones.reduce((sum, z) => sum + z.motorbikes, 0);
  const totalCar = zones.reduce((sum, z) => sum + z.cars, 0);

  return (
    <Card
      sx={{
        mb: 4,
        borderRadius: 3,
        boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      <CardHeader
        title={cameraName}
        subheader={lastUpdated ? `Last updated: ${lastUpdated}` : ""}
        sx={{
          bgcolor: theme.palette.grey[100],
          "& .MuiCardHeader-title": { fontWeight: "bold", fontSize: "1.1rem" },
          "& .MuiCardHeader-subheader": { fontSize: "0.8rem", color: "text.secondary" },
        }}
      />
      <CardContent>
        {/* Tổng xe theo Camera */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
                textAlign: "center",
              }}
            >
              <Typography variant="h6">Motorbikes</Typography>
              <Typography variant="h5" fontWeight="bold">
                {totalMotor}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: theme.palette.success.light,
                color: theme.palette.success.contrastText,
                textAlign: "center",
              }}
            >
              <Typography variant="h6">Cars</Typography>
              <Typography variant="h5" fontWeight="bold">
                {totalCar}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Bảng thống kê theo Zone */}
        <Typography variant="h6" gutterBottom color="primary">
          Zone Statistics
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: theme.palette.grey[200] }}>
              <TableCell sx={{ fontWeight: "bold" }}>Zone</TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                Motorbikes
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                Cars
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                Total
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {zones.map((zone, idx) => (
              <TableRow
                key={idx}
                sx={{
                  bgcolor: idx % 2 === 0 ? "grey.50" : "white",
                  "&:hover": { bgcolor: "grey.100" },
                }}
              >
                <TableCell>{zone.name}</TableCell>
                <TableCell align="center">{zone.motorbikes}</TableCell>
                <TableCell align="center">{zone.cars}</TableCell>
                <TableCell align="center">{zone.motorbikes + zone.cars}</TableCell>
              </TableRow>
            ))}

            {/* Row tổng */}
            <TableRow sx={{ bgcolor: theme.palette.grey[100] }}>
              <TableCell sx={{ fontWeight: "bold" }}>Total</TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {totalMotor}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {totalCar}
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: "bold" }}>
                {totalMotor + totalCar}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Biểu đồ đường */}
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }} color="primary">
          Traffic Trend
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="motorbikes"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="cars"
              stroke={theme.palette.success.main}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
