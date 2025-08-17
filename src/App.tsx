import './App.css';
import Router from './routes';
import { Provider } from 'react-redux';
import store from './store';
import Navigation from './components/Navigation';
import { Page } from 'grommet';
import styled from 'styled-components';
import React from "react";

const PageWrapper = styled(Page)`
  /* position: relative;
  top: 3rem; */
  height: calc(100% = 6rem);
`
function App() {

  /**
   * get necessary global data
   * user info (done in ui context)
   * need slate context
   */

  return (
    <Provider store={store}>
      <Navigation />
      <PageWrapper>
        <Router />
      </PageWrapper>
    </Provider>
  );
}

export default App;
