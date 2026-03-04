import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import Context from './context/user';
import CreateSlateContext from './context/slate';
import UiContext from './context/ui';
import PickContext from './context/pick';
import CFPContextProvider from './context/cfp';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <BrowserRouter>
    <UiContext>
      <Context>
        <PickContext>
          <CreateSlateContext>
            <CFPContextProvider>
              <App />
            </CFPContextProvider>
          </CreateSlateContext>
        </PickContext>
      </Context>
    </UiContext>
  </BrowserRouter>
);

reportWebVitals();
