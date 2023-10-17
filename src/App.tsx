import './App.css';
import Router from './routes';
import { Provider } from 'react-redux';
import store from './store';
import Navigation from './components/Navigation';

function App() {
  return (
    <Provider store={store}>
      <Navigation />
      <Router />
    </Provider>
  );
}

export default App;
