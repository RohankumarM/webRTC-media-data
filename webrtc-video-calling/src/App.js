import React, { Component } from 'react';
import Room from './components/Room';
import CreateRoom from './components/CreateRoom';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

class App extends Component {
  render() {
    return (
      <div className="app">
        <Router>
          <Switch>
            <Route exact path="/" component={CreateRoom} />
            <Route path="/:room" component={Room} />
          </Switch>
        </Router>
      </div>
    )
  }
};

export default App;
