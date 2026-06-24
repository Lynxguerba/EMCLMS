// src/theme/theme.ts
import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    border: Palette['primary'];
  }
  interface PaletteOptions {
    border?: PaletteOptions['primary'];
  }
}

const theme = createTheme({
  palette: {
    mode: 'light',
    
    primary: {
      main: '#232f79',
      dark: '#141b45',
    },
    secondary: {
      main: '#c80100',
    },

    background: {
      default: '#ecefff', 
    },

    text: {
      primary: '#000000',
    },

    border: {
      main: '#dadce0',
    },
    
  },

  typography: {
    h1: {
      fontSize: '1.8rem',
    },
    h2: {
      fontSize: '1.4rem',
    },
    h3: {
      fontSize: '1.2rem',
    },
    h4: {
      fontSize: '1.2rem',
    },
    h5: {
      fontSize: '1.0rem',
    },

    body1: {
      fontSize: '0.8rem',
    },
    body2: {
      fontSize: '0.7rem',
    },
  },

});

export default theme;
