import * as React from 'react';
import type { Metadata } from 'next';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';

import { config } from '@/config';
import { TrackingForm } from '@/components/dashboard/tracking/tracking-form';

export const metadata = { title: `Account | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return (
    <Stack spacing={1}>
      <Grid container spacing={1}>
        {/*<Grid lg={4} md={6} xs={12}>*/}
        {/*  <PolygonInfo />*/}
        {/*</Grid>*/}
        <Grid xs={12}>
            <TrackingForm />
          {/*<PolygonInfo />*/}
        </Grid>
      </Grid>
    </Stack>
  );
}