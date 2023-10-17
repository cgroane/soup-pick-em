import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    global: {
      font: {
        family: string,
        size: string,
        height: string,
      },
    },
     colors: {
      white: string;
      black: string;
      lightBlue: string;
      blue: string;
      darkBlue: string;
      salmon: string;
      linen: string;
     }
  }
}