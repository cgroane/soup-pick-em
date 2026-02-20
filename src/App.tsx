import './App.css';
import Router from './routes';
import { Provider } from 'react-redux';
import store from './store';
import Navigation from './components/Navigation';
import { Page } from 'grommet';
import styled from 'styled-components';
import React from "react";

const AppLayout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
`

const ContentArea = styled(Page)`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  & > * {
    flex-shrink: 0;
  }
`

function App() {

  /**
   * get necessary global data
   * user info (done in ui context)
   * need slate context
   */

  return (
    <Provider store={store}>
      <AppLayout>
        <Navigation />
        <ContentArea>
          <Router />
        </ContentArea>
      </AppLayout>
    </Provider>
  );
}

export default App;
