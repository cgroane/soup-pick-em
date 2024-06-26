import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { theme } from './theme';
import { BrowserRouter } from 'react-router-dom';
import { Grommet } from 'grommet';
import Context from './context/user';
import CreateSlateContext from './context/slate';
import UiContext from './context/ui';
import PickContext from './context/pick';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // <React>
    <Grommet theme={theme} full background={theme.colors.blackBackground} >
      <BrowserRouter>
        <UiContext>
          <Context>
            <PickContext>
              <CreateSlateContext>
                <App />
              </CreateSlateContext>
            </PickContext>
          </Context>
        </UiContext>
      </BrowserRouter>
    </Grommet>
  // </React>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
