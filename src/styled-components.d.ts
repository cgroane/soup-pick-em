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
      [key: string]: string;
     }
  }
}