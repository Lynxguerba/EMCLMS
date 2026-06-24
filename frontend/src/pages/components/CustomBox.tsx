import { Box, Theme } from "@mui/material";
import { SxProps } from "@mui/system";
import React from "react";

interface CustomBoxProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  onClick?: () => void; // Add the onClick prop here
}

export default function CustomBox({ children, sx, onClick }: CustomBoxProps) {

  return (
    <Box
      component="main"
      onClick={onClick} // Pass the onClick handler to the Box component
      sx={[
        {
          borderRadius: 4,
          backgroundColor: "#fafafa",
          m: 0,
          p: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
