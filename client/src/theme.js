// src/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2D465A", // Change this to your primary color
      contrastText: "#EFF1ED",
    },
    secondary: {
      main: "#4ECBFF", // Change this to your secondary color
      contrastText: "rgba(0,0,0,0.87)",
    },
    background: {
      default: "#2D465A", // Change this to your desired background color
      paper: "#192832",
    },
    text: {
      primary: "#EFF1ED", // Change this to your desired primary text color
      secondary: "#EFF1ED", // Change this to your desired secondary text color
    },
    error: {
      main: "#FF4E50",
    },
    info: {
      main: "#4CFFBE",
    },
  },
});

/*
color palette
black1 = #192832
black2 = #2D465A
blue = #4ECBFF
green = #4CFFBE
white = #EFF1ED
red = #FF4E50
*/

export default theme;
