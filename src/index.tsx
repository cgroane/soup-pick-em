import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import Context from './context/user';
import CreateSlateContext from './context/slate';
import UIProvider from './context/ui';
import PickContext from './context/pick';
import CFPContextProvider from './context/cfp';
import GroupContextProvider from './context/group';
import AuthContextProvider from 'context/auth';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <BrowserRouter>
    <AuthContextProvider>
      <UIProvider>
        <GroupContextProvider>
          <Context>
            <PickContext>
              <CreateSlateContext>
                <CFPContextProvider>
                  <App />
                </CFPContextProvider>
              </CreateSlateContext>
            </PickContext>
          </Context>
        </GroupContextProvider>
      </UIProvider>
    </AuthContextProvider>
  </BrowserRouter>
);

reportWebVitals();
