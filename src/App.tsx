import Router from './routes';
import { Provider } from 'react-redux';
import store from './store';
import Navigation from './components/Navigation';
import React from 'react';

function App() {
  return (
    <Provider store={store}>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <Navigation />
        <main className="flex-1 min-h-0 overflow-y-auto -webkit-overflow-scrolling-touch">
          <Router />
        </main>
      </div>
    </Provider>
  );
}

export default App;
